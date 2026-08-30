from datetime import date

from pydantic import BaseModel, Field


class RouteCreate(BaseModel):
    truck_id: int

    dustbin_id: int

    sequence_number: int = Field(
        ...,
        ge=1
    )

    route_date: date


class RouteResponse(BaseModel):
    id: int
    truck_id: int
    dustbin_id: int
    sequence_number: int
    route_date: date

    class Config:
        from_attributes = True