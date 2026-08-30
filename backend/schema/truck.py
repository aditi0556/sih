from pydantic import BaseModel, Field
from typing import Optional


class TruckCreate(BaseModel):
    vehicle_number: str

    capacity_kg: float = Field(
        ...,
        gt=0
    )

    status: str = "AVAILABLE"

    latitude: Optional[float] = Field(
        default=None,
        ge=-90,
        le=90
    )

    longitude: Optional[float] = Field(
        default=None,
        ge=-180,
        le=180
    )


class TruckUpdate(BaseModel):
    vehicle_number: Optional[str] = None

    capacity_kg: Optional[float] = Field(
        default=None,
        gt=0
    )

    status: Optional[str] = None

    latitude: Optional[float] = Field(
        default=None,
        ge=-90,
        le=90
    )

    longitude: Optional[float] = Field(
        default=None,
        ge=-180,
        le=180
    )


class TruckResponse(BaseModel):
    truck_id: int
    vehicle_number: str
    capacity_kg: float
    status: str
    latitude: Optional[float]
    longitude: Optional[float]

    class Config:
        from_attributes = True