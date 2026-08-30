from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    Boolean,
    Date,
    ForeignKey
)

from models.base import Base


class TrainingData(Base):

    __tablename__ = "training_data"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    dustbin_id = Column(
        Integer,
        ForeignKey("dustbins.dustbin_id"),
        nullable=False
    )

    record_date = Column(
        Date,
        nullable=False
    )

    days_since_last_collection = Column(
        Integer,
        nullable=False
    )

    zone_type = Column(
        String(50),
        nullable=False
    )

    latitude = Column(
        Float,
        nullable=False
    )

    longitude = Column(
        Float,
        nullable=False
    )

    day_of_week = Column(
        Integer,
        nullable=False
    )

    is_weekend = Column(
        Boolean,
        nullable=False
    )

    is_holiday = Column(
        Boolean,
        nullable=False
    )

    month = Column(
        Integer,
        nullable=False
    )

    days_since_festival = Column(
        Integer,
        nullable=False
    )

    days_to_festival = Column(
        Integer,
        nullable=False
    )

    is_festival = Column(
        Boolean,
        nullable=False
    )

    previous_day_fill = Column(
        Float,
        nullable=False
    )

    actual_fill_percentage = Column(
        Float,
        nullable=False
    )