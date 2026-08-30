from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class DustbinSurveyItemOut(BaseModel):
    id: Optional[int] = None
    dustbin_id: int
    latitude: float
    longitude: float
    zone_type: str
    population: int
    previous_fill: float
    status: str = "PENDING"
    recorded_fill_level: Optional[float] = None
    inspected_at: Optional[datetime] = None
    remarks: Optional[str] = None

    class Config:
        from_attributes = True


class HotspotSurveyItemOut(BaseModel):
    id: Optional[int] = None
    hotspot_id: int
    latitude: float
    longitude: float
    times_found_dirty: int
    status: str = "PENDING"
    is_hotspot_present: Optional[bool] = None
    inspected_at: Optional[datetime] = None
    remarks: Optional[str] = None

    class Config:
        from_attributes = True


class SurveyAssignmentOut(BaseModel):
    id: int
    driver_id: Optional[int] = None
    assigned_to_name: str
    week_start_date: date
    day_of_week: str
    status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    total_dustbins: int = 0
    completed_dustbins: int = 0
    total_hotspots: int = 0
    completed_hotspots: int = 0
    dustbins: List[DustbinSurveyItemOut] = []
    hotspots: List[HotspotSurveyItemOut] = []

    class Config:
        from_attributes = True


class SurveyScheduleStats(BaseModel):
    total_assignments: int
    total_dustbins: int
    completed_dustbins: int
    pending_dustbins: int
    total_hotspots: int
    completed_hotspots: int
    pending_hotspots: int
    overall_completion_pct: float


class SurveyScheduleResponse(BaseModel):
    week_start_date: str
    stats: SurveyScheduleStats
    assignments: List[SurveyAssignmentOut]
    all_dustbins: List[DustbinSurveyItemOut] = []
    all_hotspots: List[HotspotSurveyItemOut] = []


class UpdateDustbinFillRequest(BaseModel):
    dustbin_id: int
    fill_level: float = Field(..., ge=0.0, le=100.0, description="Fill percentage 0-100%")
    assignment_id: Optional[int] = None
    driver_name: Optional[str] = None
    remarks: Optional[str] = None


class UpdateHotspotPresenceRequest(BaseModel):
    hotspot_id: int
    is_present: bool = Field(..., description="True if waste/overflow is present (dirty), False if clean")
    assignment_id: Optional[int] = None
    driver_name: Optional[str] = None
    remarks: Optional[str] = None


class BatchSurveyUpdateRequest(BaseModel):
    dustbin_updates: List[UpdateDustbinFillRequest] = []
    hotspot_updates: List[UpdateHotspotPresenceRequest] = []


class CreateSurveyAssignmentRequest(BaseModel):
    driver_id: Optional[int] = None
    assigned_to_name: str
    week_start_date: Optional[date] = None
    day_of_week: str = "Monday"
    dustbin_ids: List[int] = []
    hotspot_ids: List[int] = []
    notes: Optional[str] = None


class SurveyDriverOut(BaseModel):
    driver_id: int
    name: str
    phone: Optional[str] = "9876543210"
    status: str
    truck_id: Optional[int] = None

    class Config:
        from_attributes = True

