from pydantic import BaseModel, Field
from typing import Optional


class DustbinCreate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)

    longitude: float = Field(..., ge=-180, le=180)

    zone_type: str

    population: int = Field(..., ge=0)

    days_since_last_collection: int = Field(
        default=0,
        ge=0
    )

    previous_day_fill: float = Field(
        default=0,
        ge=0,
        le=100
    )


class DustbinUpdate(BaseModel):
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

    zone_type: Optional[str] = None

    population: Optional[int] = Field(
        default=None,
        ge=0
    )

    days_since_last_collection: Optional[int] = Field(
        default=None,
        ge=0
    )

    previous_day_fill: Optional[float] = Field(
        default=None,
        ge=0,
        le=100
    )


class DustbinResponse(BaseModel):
    dustbin_id: int
    latitude: float
    longitude: float
    zone_type: str
    population: int
    days_since_last_collection: int
    previous_day_fill: float

    class Config:
        from_attributes = True