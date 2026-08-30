from sqlalchemy import (
    Column,
    Integer,
    Date,
    ForeignKey,
    UniqueConstraint
)

from backend.models.base import Base


class Route(Base):

    __tablename__ = "routes"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    truck_id = Column(
        Integer,
        ForeignKey("trucks.truck_id"),
        nullable=False
    )

    dustbin_id = Column(
        Integer,
        ForeignKey("dustbins.dustbin_id"),
        nullable=False
    )

    sequence_number = Column(
        Integer,
        nullable=False
    )

    route_date = Column(
        Date,
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "truck_id",
            "route_date",
            "sequence_number",
            name="unique_truck_route_sequence"
        ),
    )