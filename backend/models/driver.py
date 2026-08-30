from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from db.database import Base



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

    # Nullable because a driver row is now auto-created at signup, before the
    # person has ever provided a phone number. Postgres allows multiple NULLs
    # under a unique constraint, so this stays safe to fill in later.
    phone = Column(
        String(20),
        unique=True,
        nullable=True
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

    # Links this driver record to a login account. Every signup now creates
    # one of these automatically, so in practice this is set from the start.
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=True
    )

    truck = relationship(
        "Truck"
    )

    user = relationship(
        "User"
    )