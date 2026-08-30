import sys
from datetime import date
from pathlib import Path
from typing import List, Dict, Any, Optional, cast

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db.database import get_db
from models.dustbin import Dustbin
from models.prediction import DailyPrediction
from models.route import Route
from models.truck import Truck

# Ensure routing_service is importable from backend
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from routing_service.engine import generate_optimized_routes

router = APIRouter(prefix="/routing", tags=["routing"])

# Central Depot Location (Default: Mangalore Central)
DEFAULT_DEPOT = {
    "id": "DEPOT_CENTRAL",
    "lat": 12.872114,
    "lng": 74.843407,
    "demand": 0
}


@router.post("/optimize")
def optimize_and_save_routes(
    target_date: Optional[date] = Query(default=None, description="Date for route optimization"),
    db: Session = Depends(get_db)
):
    """
    1. Fetches daily predictions & dustbins from PostgreSQL for the target date.
    2. Runs H3 + OR-Tools route optimization.
    3. Persists generated routes into PostgreSQL `routes` table (Route model).
    4. Returns complete structured JSON output (summary, stops, GeoJSON geometries).
    """
    if not target_date:
        target_date = date.today()

    # Query Dustbin predictions for target date
    records = (
        db.query(Dustbin, DailyPrediction)
        .join(DailyPrediction, Dustbin.dustbin_id == DailyPrediction.dustbin_id)
        .filter(DailyPrediction.prediction_date == target_date)
        .all()
    )

    if not records:
        # Fallback: query all dustbins with default fill percentage if no prediction exists for target_date
        dustbins = db.query(Dustbin).all()
        predictions_payload = [
            {
                "id": f"BIN_{bin_item.dustbin_id}",
                "dustbin_id": bin_item.dustbin_id,
                "lat": bin_item.latitude,
                "lng": bin_item.longitude,
                "fill_pct": bin_item.previous_day_fill or 50.0,
                "zone_type": bin_item.zone_type,
            }
            for bin_item in dustbins
        ]
    else:
        predictions_payload = [
            {
                "id": f"BIN_{dustbin.dustbin_id}",
                "dustbin_id": dustbin.dustbin_id,
                "lat": dustbin.latitude,
                "lng": dustbin.longitude,
                "fill_pct": pred.predicted_fill_percentage,
                "zone_type": dustbin.zone_type,
            }
            for dustbin, pred in records
        ]

    if not predictions_payload:
        raise HTTPException(status_code=404, detail="No dustbins found in database for routing")

    # Run optimization engine
    optimization_result = generate_optimized_routes(DEFAULT_DEPOT, predictions_payload)

    # Persist optimized routes into PostgreSQL `routes` table
    routes_to_insert = []
    
    # Delete existing routes for target_date and commit to database immediately
    db.query(Route).filter(Route.route_date == target_date).delete(synchronize_session=False)
    db.commit()

    # Query available trucks from DB
    available_trucks = db.query(Truck).all()
    seq_counter: Dict[Any, int] = {}

    for route_idx, route_obj in enumerate(optimization_result.get("routes", [])):
        if available_trucks:
            assigned_truck = available_trucks[route_idx % len(available_trucks)]
            assigned_truck_id = cast(int, assigned_truck.truck_id)
        else:
            assigned_truck_id = 1

        for stop in route_obj.get("stops", []):
            raw_node_id = str(stop.get("node_id", ""))
            
            # Only persist bin collection stops (ignore depot START / DUMP_AND_END)
            if raw_node_id.startswith("BIN_"):
                try:
                    bin_db_id = int(raw_node_id.replace("BIN_", ""))
                    current_seq = seq_counter.get(assigned_truck_id, 1)
                    seq_counter[assigned_truck_id] = current_seq + 1

                    route_record = Route(
                        truck_id=assigned_truck_id,
                        dustbin_id=bin_db_id,
                        sequence_number=current_seq,
                        route_date=target_date
                    )
                    routes_to_insert.append(route_record)
                except ValueError:
                    continue

    if routes_to_insert:
        db.add_all(routes_to_insert)
        db.commit()

    return {
        "status": "success",
        "saved_route_records": len(routes_to_insert),
        "target_date": str(target_date),
        "summary": optimization_result.get("summary"),
        "routes": optimization_result.get("routes")
    }


@router.get("/routes")
def get_saved_routes(
    target_date: Optional[date] = Query(default=None, description="Date to fetch saved routes"),
    db: Session = Depends(get_db)
):
    """Fetches saved route records from PostgreSQL `routes` table."""
    if not target_date:
        target_date = date.today()

    saved_routes = (
        db.query(Route)
        .filter(Route.route_date == target_date)
        .order_by(Route.truck_id, Route.sequence_number)
        .all()
    )

    return {
        "target_date": str(target_date),
        "total_records": len(saved_routes),
        "routes": [
            {
                "id": r.id,
                "truck_id": r.truck_id,
                "dustbin_id": r.dustbin_id,
                "sequence_number": r.sequence_number,
                "route_date": str(r.route_date)
            }
            for r in saved_routes
        ]
    }
