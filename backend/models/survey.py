from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from db.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class SurveyAssignment(Base):
    __tablename__ = "survey_assignments"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.driver_id"), nullable=True)
    assigned_to_name = Column(String(100), nullable=False)
    week_start_date = Column(Date, nullable=False, default=date.today)
    day_of_week = Column(String(30), nullable=False, default="Monday")
    status = Column(String(30), nullable=False, default="IN_PROGRESS")  # PENDING, IN_PROGRESS, COMPLETED
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    driver = relationship("Driver")
    items = relationship("SurveyItem", back_populates="assignment", cascade="all, delete-orphan")


class SurveyItem(Base):
    __tablename__ = "survey_items"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("survey_assignments.id"), nullable=False)
    item_type = Column(String(20), nullable=False)  # "DUSTBIN" or "HOTSPOT"
    dustbin_id = Column(Integer, ForeignKey("dustbins.dustbin_id"), nullable=True)
    hotspot_id = Column(Integer, ForeignKey("hotspots.id"), nullable=True)
    status = Column(String(30), nullable=False, default="PENDING")  # PENDING, COMPLETED, SKIPPED
    recorded_fill_level = Column(Float, nullable=True)  # 0.0 - 100.0%
    is_hotspot_present = Column(Boolean, nullable=True)  # True = waste present / dirty, False = clean
    inspected_at = Column(DateTime, nullable=True)
    remarks = Column(String(255), nullable=True)

    assignment = relationship("SurveyAssignment", back_populates="items")
    dustbin = relationship("Dustbin")
    hotspot = relationship("Hotspot")


class SurveyLog(Base):
    __tablename__ = "survey_logs"

    id = Column(Integer, primary_key=True, index=True)
    item_type = Column(String(20), nullable=False)  # "DUSTBIN" or "HOTSPOT"
    target_id = Column(Integer, nullable=False)  # dustbin_id or hotspot_id
    driver_name = Column(String(100), nullable=True)
    recorded_fill_level = Column(Float, nullable=True)
    is_hotspot_present = Column(Boolean, nullable=True)
    remarks = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now)
