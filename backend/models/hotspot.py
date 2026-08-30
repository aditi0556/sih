from sqlalchemy import Column, Integer, Float

from db.database import Base


class Hotspot(Base):

    __tablename__ = "hotspots"

    id = Column(
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

    times_found_dirty = Column(
        Integer,
        nullable=False,
        default=0
    )