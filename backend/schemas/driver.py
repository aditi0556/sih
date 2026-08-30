from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any


class DriverCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    truck_id: Optional[int] = None
    status: str = "AVAILABLE"
    user_id: Optional[int] = None


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    truck_id: Optional[int] = None
    status: Optional[str] = None
    user_id: Optional[int] = None


class DriverResponse(BaseModel):
    driver_id: int
    name: str
    phone: Optional[str] = None
    truck_id: Optional[int] = None
    status: str
    user_id: Optional[int] = None

    class Config:
        from_attributes = True


class DriverLinkUserRequest(BaseModel):
    email: EmailStr


class DriverRouteStop(BaseModel):
    id: int
    sequence_number: int
    dustbin_id: int
    code: str
    location: str
    address: str
    lat: float
    lng: float
    zone_type: Optional[str] = None
    fill_pct: Optional[float] = None
    status: str = "PENDING"
    status_label: str = "Pending Collection"


class DriverRouteDetailResponse(BaseModel):
    driver: Dict[str, Any]
    assignment: Dict[str, Any]
    depot: Dict[str, Any]
    current_location: Dict[str, Any]
    route_date: str
    total_stops: int
    total_distance_km: float
    total_estimated_volume_kg: float
    stops: List[DriverRouteStop]
    geometry: Optional[Dict[str, Any]] = None
    all_drivers: Optional[List[Dict[str, Any]]] = None