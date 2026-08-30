from sqlalchemy import (
    Column,
    Integer,
    Float,
    Date,
    ForeignKey
)

from db.database import Base



class DailyPrediction(Base):

    __tablename__ = "daily_predictions"

    prediction_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    dustbin_id = Column(
        Integer,
        ForeignKey("dustbins.dustbin_id"),
        nullable=False
    )

    prediction_date = Column(
        Date,
        nullable=False
    )

    predicted_fill_percentage = Column(
        Float,
        nullable=False
    )