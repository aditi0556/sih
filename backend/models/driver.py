from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from models.base import Base


class Driver(Base):

    __tablename__ = "drivers"

    driver_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        nullable=False
    )

    phone = Column(
        String(20),
        unique=True,
        nullable=False
    )

    truck_id = Column(
        Integer,
        ForeignKey("trucks.truck_id"),
        nullable=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="AVAILABLE"
    )

    truck = relationship(
        "Truck"
    )