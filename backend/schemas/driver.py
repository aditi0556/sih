from pydantic import BaseModel
from typing import Optional


class DriverCreate(BaseModel):
    name: str
    phone: str
    truck_id: Optional[int] = None
    status: str = "AVAILABLE"


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    truck_id: Optional[int] = None
    status: Optional[str] = None


class DriverResponse(BaseModel):
    driver_id: int
    name: str
    phone: str
    truck_id: Optional[int]
    status: str

    class Config:
        from_attributes = True