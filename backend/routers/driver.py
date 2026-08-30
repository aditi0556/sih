import math
from datetime import date
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db.database import get_db
from models.driver import Driver
from models.truck import Truck
from models.dustbin import Dustbin
from models.route import Route
from models.prediction import DailyPrediction
from models.user import User
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from routing_service.route_formatter import fetch_osrm_geometry
from dependencies import require_admin, get_current_user, get_current_user_optional, get_current_driver
from schemas.driver import (
    DriverResponse,
    DriverLinkUserRequest,
    DriverRouteDetailResponse,
    DriverRouteStop,
)

router = APIRouter(prefix="/drivers", tags=["drivers"])

DEFAULT_DEPOT = {
    "id": "DEPOT_CENTRAL",
    "name": "Central Waste Hub, Derebail",
    "lat": 12.9040,
    "lng": 74.8560,
}

DUSTBIN_METADATA = {
    1: {"name": "Hampankatta Market Complex", "address": "Main Market Road, Hampankatta", "sector": "Central Commercial Belt"},
    2: {"name": "Kadri Hills Residential Sector", "address": "Circuit House Road, Kadri", "sector": "Kadri North Zone"},
    3: {"name": "Kankanady Junction Commercial", "address": "Pumpwell Bypass, Kankanady", "sector": "East Commercial Corridor"},
    4: {"name": "Mallikatta Junction Cross", "address": "Mallikatta Main Cross", "sector": "Kadri South Zone"},
    5: {"name": "Bolar Old Port Sector", "address": "Bolar Ferry Road", "sector": "South Coastal Zone"},
    6: {"name": "Kudroli Commercial Belt", "address": "Temple Main Road, Kudroli", "sector": "Central Commercial Belt"},
    7: {"name": "Urwa Residential Circle", "address": "Urwa Market Road", "sector": "North Residential Sector"},
    8: {"name": "Baikampady Industrial Estate", "address": "Gate 1, Baikampady MIDC", "sector": "North Industrial Belt"},
    9: {"name": "Surathkal Highway Corridor", "address": "NH-66 Highway, Surathkal", "sector": "Highway Suburbs"},
    10: {"name": "Panambur Port Industrial Zone", "address": "New Mangalore Port Approach", "sector": "North Industrial Belt"},
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(r * c, 2)


def build_driver_route_payload(
    driver: Driver,
    db: Session,
    target_date: Optional[date] = None,
    current_user: Optional[User] = None
) -> Dict[str, Any]:
    # 1. Resolve truck
    truck = None
    if driver.truck_id:
        truck = db.query(Truck).filter(Truck.truck_id == driver.truck_id).first()
    if not truck:
        truck = db.query(Truck).first()

    truck_id = truck.truck_id if truck else 1
    vehicle_number = truck.vehicle_number if truck else "KA19AB1234"
    capacity_kg = float(truck.capacity_kg) if truck and truck.capacity_kg else 5000.0

    # 2. Query routes for this truck
    # Check if routes exist for target_date or fallback to latest available route date in DB
    query_date = target_date or date.today()
    route_records = (
        db.query(Route)
        .filter(Route.truck_id == truck_id, Route.route_date == query_date)
        .order_by(Route.sequence_number)
        .all()
    )

    if not route_records:
        # Fallback to the latest date that has route records
        latest_route = db.query(Route.route_date).order_by(Route.route_date.desc()).first()
        if latest_route:
            query_date = latest_route[0]
            route_records = (
                db.query(Route)
                .filter(Route.truck_id == truck_id, Route.route_date == query_date)
                .order_by(Route.sequence_number)
                .all()
            )

    # 3. If still no routes found for this truck, fallback to default bins assigned to this truck_id
    stops: List[DriverRouteStop] = []
    if route_records:
        for idx, r in enumerate(route_records):
            bin_obj = db.query(Dustbin).filter(Dustbin.dustbin_id == r.dustbin_id).first()
            if not bin_obj:
                continue

            # Query prediction fill
            pred = (
                db.query(DailyPrediction)
                .filter(DailyPrediction.dustbin_id == bin_obj.dustbin_id, DailyPrediction.prediction_date == query_date)
                .first()
            )
            fill_pct = pred.predicted_fill_percentage if pred else (bin_obj.previous_day_fill or 85.0)

            meta = DUSTBIN_METADATA.get(
                bin_obj.dustbin_id,
                {
                    "name": f"Dustbin #{bin_obj.dustbin_id} ({bin_obj.zone_type})",
                    "address": f"Zone {bin_obj.zone_type}, Mangaluru",
                    "sector": f"{bin_obj.zone_type} Sector",
                }
            )

            stops.append(
                DriverRouteStop(
                    id=bin_obj.dustbin_id,
                    sequence_number=r.sequence_number or (idx + 1),
                    dustbin_id=bin_obj.dustbin_id,
                    code=f"BIN-{bin_obj.dustbin_id:03d}",
                    location=meta["name"],
                    address=meta["address"],
                    lat=float(bin_obj.latitude),
                    lng=float(bin_obj.longitude),
                    zone_type=bin_obj.zone_type,
                    fill_pct=float(fill_pct),
                    status="PENDING",
                    status_label="Pending Collection",
                )
            )
    else:
        # Fallback to all dustbins partitioned by truck_id modulo
        all_bins = db.query(Dustbin).order_by(Dustbin.dustbin_id).all()
        truck_bins = [b for b in all_bins if (b.dustbin_id % 4) == (truck_id % 4)] or all_bins[:3]
        for idx, b in enumerate(truck_bins):
            meta = DUSTBIN_METADATA.get(
                b.dustbin_id,
                {"name": f"Dustbin #{b.dustbin_id}", "address": f"Sector {b.zone_type}", "sector": "City Center"}
            )
            stops.append(
                DriverRouteStop(
                    id=b.dustbin_id,
                    sequence_number=idx + 1,
                    dustbin_id=b.dustbin_id,
                    code=f"BIN-{b.dustbin_id:03d}",
                    location=meta["name"],
                    address=meta["address"],
                    lat=float(b.latitude),
                    lng=float(b.longitude),
                    zone_type=b.zone_type,
                    fill_pct=float(b.previous_day_fill or 80.0),
                    status="PENDING",
                    status_label="Pending Collection",
                )
            )

    # 4. Compute total path distance
    total_dist = 0.0
    prev_lat = DEFAULT_DEPOT["lat"]
    prev_lng = DEFAULT_DEPOT["lng"]
    for s in stops:
        total_dist += haversine_km(prev_lat, prev_lng, s.lat, s.lng)
        prev_lat, prev_lng = s.lat, s.lng

    if stops:
        # Distance back to depot
        total_dist += haversine_km(prev_lat, prev_lng, DEFAULT_DEPOT["lat"], DEFAULT_DEPOT["lng"])

    total_dist = round(total_dist, 1)

    # 5. Sector summary
    sector_name = "Mangalore North & Central Corridor"
    if stops and stops[0].dustbin_id in DUSTBIN_METADATA:
        sector_name = DUSTBIN_METADATA[stops[0].dustbin_id]["sector"]

    # 6. List all drivers ONLY for admin / switching view
    all_drivers = []
    if current_user and current_user.role == "admin":
        drivers_list = db.query(Driver).order_by(Driver.driver_id).all()
        for d in drivers_list:
            t = db.query(Truck).filter(Truck.truck_id == d.truck_id).first() if d.truck_id else None
            all_drivers.append({
                "driver_id": d.driver_id,
                "name": d.name,
                "truck_id": d.truck_id,
                "vehicle_number": t.vehicle_number if t else f"Truck #{d.truck_id or 1}",
                "status": d.status,
            })

    # 7. Compute full path GeoJSON geometry
    ordered_nodes = [{"lat": DEFAULT_DEPOT["lat"], "lng": DEFAULT_DEPOT["lng"]}]
    for s in stops:
        ordered_nodes.append({"lat": s.lat, "lng": s.lng})
    if stops:
        ordered_nodes.append({"lat": DEFAULT_DEPOT["lat"], "lng": DEFAULT_DEPOT["lng"]})

    route_geometry = fetch_osrm_geometry(ordered_nodes) if len(ordered_nodes) >= 2 else None

    return {
        "driver": {
            "driver_id": driver.driver_id,
            "name": driver.name,
            "phone": driver.phone or "9876543210",
            "truck_id": truck_id,
            "status": driver.status,
            "shift": "Morning Shift (06:00 – 14:00)",
        },
        "assignment": {
            "vehicleNumber": vehicle_number,
            "zone": "Mangaluru Waste Management Zone",
            "sector": sector_name,
            "depotName": DEFAULT_DEPOT["name"],
            "totalDistanceKm": total_dist,
            "capacityKg": capacity_kg,
        },
        "depot": DEFAULT_DEPOT,
        "current_location": {
            "lat": stops[0].lat if stops else DEFAULT_DEPOT["lat"],
            "lng": stops[0].lng if stops else DEFAULT_DEPOT["lng"],
        },
        "route_date": str(query_date),
        "total_stops": len(stops),
        "total_distance_km": total_dist,
        "total_estimated_volume_kg": round(sum((s.fill_pct or 75.0) * 15.0 for s in stops), 1),
        "stops": [s.model_dump() for s in stops],
        "geometry": route_geometry,
        "all_drivers": all_drivers,
    }


@router.get("/me", response_model=DriverResponse)
def get_my_driver_profile(
    driver: Driver = Depends(get_current_driver),
):
    """Lets the logged-in user fetch their own driver profile."""
    return driver


@router.get("/me/route", response_model=DriverRouteDetailResponse)
def get_my_driver_route(
    driver: Driver = Depends(get_current_driver),
    target_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the daily collection path assigned to the logged-in garbage truck driver."""
    return build_driver_route_payload(driver, db, target_date=target_date, current_user=current_user)


@router.get("/{driver_id}/route", response_model=DriverRouteDetailResponse)
def get_driver_route_by_id(
    driver_id: int,
    target_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    _user: Optional[User] = Depends(get_current_user_optional),
):
    """Returns the daily collection path for a specific driver. Non-admins can only access their own route."""
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Security rule: One driver cannot access another driver's credentials or route
    if _user and _user.role != "admin" and driver.user_id != _user.id:
        raise HTTPException(status_code=403, detail="Access denied: You can only view your own assigned route.")

    return build_driver_route_payload(driver, db, target_date=target_date, current_user=_user)


@router.get("", response_model=List[DriverResponse])
def list_drivers(
    db: Session = Depends(get_db),
    _user: User = Depends(require_admin),
):
    """Admin-only endpoint to list all drivers."""
    return db.query(Driver).order_by(Driver.driver_id).all()



@router.post("/{driver_id}/link-user", response_model=DriverResponse)
def link_driver_to_user(
    driver_id: int,
    payload: DriverLinkUserRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user with that email")

    already_linked = db.query(Driver).filter(Driver.user_id == user.id).first()
    if already_linked and already_linked.driver_id != driver.driver_id:
        raise HTTPException(status_code=400, detail="That user is already linked to another driver")

    driver.user_id = user.id
    db.commit()
    db.refresh(driver)
    return driver


@router.post("/{driver_id}/unlink-user", response_model=DriverResponse)
def unlink_driver_from_user(
    driver_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    driver.user_id = None
    db.commit()
    db.refresh(driver)
    return driver