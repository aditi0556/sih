from datetime import date

from pydantic import BaseModel, Field


class TrainingDataCreate(BaseModel):
    dustbin_id: int

    record_date: date

    previous_day_fill: float = Field(
        ...,
        ge=0,
        le=100
    )

    days_since_last_collection: int = Field(
        ...,
        ge=0
    )

    zone_type: str

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

    day_of_week: int = Field(
        ...,
        ge=0,
        le=6
    )

    is_weekend: bool

    is_holiday: bool

    month: int = Field(
        ...,
        ge=1,
        le=12
    )

    days_since_festival: int = Field(
        ...,
        ge=0
    )

    days_to_festival: int = Field(
        ...,
        ge=0
    )

    is_festival: bool

    actual_fill_percentage: float = Field(
        ...,
        ge=0,
        le=100
    )


class TrainingDataResponse(BaseModel):
    id: int
    dustbin_id: int
    record_date: date
    previous_day_fill: float
    days_since_last_collection: int
    zone_type: str
    latitude: float
    longitude: float
    day_of_week: int
    is_weekend: bool
    is_holiday: bool
    month: int
    days_since_festival: int
    days_to_festival: int
    is_festival: bool
    actual_fill_percentage: float

    class Config:
        from_attributes = True