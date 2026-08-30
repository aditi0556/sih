from datetime import date

from pydantic import BaseModel, Field


class PredictionCreate(BaseModel):
    dustbin_id: int

    prediction_date: date

    predicted_fill_percentage: float = Field(
        ...,
        ge=0,
        le=100
    )


class PredictionResponse(BaseModel):
    prediction_id: int
    dustbin_id: int
    prediction_date: date
    predicted_fill_percentage: float

    class Config:
        from_attributes = True