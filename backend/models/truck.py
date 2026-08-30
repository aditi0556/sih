from sqlalchemy import Column, Integer, String, Float
from models.base import Base

from db.database import Base


class Truck(Base):

    __tablename__ = "trucks"

    truck_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vehicle_number = Column(
        String(50),
        unique=True,
        nullable=False
    )

    capacity_kg = Column(
        Float,
        nullable=False
    )

    status = Column(
        String(30),
        nullable=False,
        default="AVAILABLE"
    )

    latitude = Column(
        Float,
        nullable=True
    )

    longitude = Column(
        Float,
        nullable=True
    )