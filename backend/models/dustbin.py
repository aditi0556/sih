from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Enum,
)
from db.database import Base



class Dustbin(Base):

    __tablename__ = "dustbins"

    dustbin_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    latitude = Column(
        Float,
        nullable=False
    )

    longitude = Column(
        Float,
        nullable=False
    )

    zone_type = Column(
        String(50),
        nullable=False
    )

    population = Column(
        Integer,
        nullable=False
    )

    days_since_last_collection = Column(
        Integer,
        nullable=False,
        default=0
    )

    previous_day_fill = Column(
        Float,
        nullable=False,
        default=0
    )