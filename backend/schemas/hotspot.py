from pydantic import BaseModel, Field
from typing import Optional


class HotspotCreate(BaseModel):
    latitude: float = Field(
        ...,
        ge=-90,
        le=90
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180
    )

    times_found_dirty: int = Field(
        default=0,
        ge=0
    )


class HotspotUpdate(BaseModel):
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

    times_found_dirty: Optional[int] = Field(
        default=None,
        ge=0
    )


class HotspotResponse(BaseModel):
    id: int
    latitude: float
    longitude: float
    times_found_dirty: int

    class Config:
        from_attributes = True