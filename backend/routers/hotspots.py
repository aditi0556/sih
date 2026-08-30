from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.hotspot import Hotspot
from models.dustbin import Dustbin
from models.user import User
from models.survey import SurveyItem
from dependencies import require_admin, get_current_user
from schemas.hotspot import HotspotResponse, HotspotCreate
from schemas.dustbin import DustbinResponse

router = APIRouter(prefix="/get", tags=["hotspots"])

# How close (in degrees) two points need to be to count as "the same place".
LOCATION_MATCH_TOLERANCE = 0.0001


@router.get("/hotspots", response_model=list[HotspotResponse])
def get_hotspots(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Returns all active hotspots. Accessible to drivers, surveyors, and admins."""
    return db.query(Hotspot).order_by(Hotspot.id).all()


@router.post("/hotspots", response_model=HotspotResponse, status_code=201)
def report_hotspot(
    payload: HotspotCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Allows drivers, survey staff, or admins to report an overflow hotspot by pinning a location on the map."""
    # Check if a hotspot is already registered close to this point
    existing = (
        db.query(Hotspot)
        .filter(
            Hotspot.latitude.between(
                payload.latitude - LOCATION_MATCH_TOLERANCE,
                payload.latitude + LOCATION_MATCH_TOLERANCE,
            ),
            Hotspot.longitude.between(
                payload.longitude - LOCATION_MATCH_TOLERANCE,
                payload.longitude + LOCATION_MATCH_TOLERANCE,
            ),
        )
        .first()
    )
    if existing:
        existing.times_found_dirty = (existing.times_found_dirty or 0) + 1
        db.commit()
        db.refresh(existing)
        return existing

    new_hotspot = Hotspot(
        latitude=payload.latitude,
        longitude=payload.longitude,
        times_found_dirty=payload.times_found_dirty if payload.times_found_dirty > 0 else 1,
    )
    db.add(new_hotspot)
    db.commit()
    db.refresh(new_hotspot)
    return new_hotspot


@router.post("/hotspots/{hotspot_id}/approve", response_model=DustbinResponse)
def approve_hotspot(
    hotspot_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin-only endpoint to promote an approved hotspot to a permanent dustbin."""
    hotspot = db.query(Hotspot).filter(Hotspot.id == hotspot_id).first()
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")

    # Check if a dustbin already exists at (roughly) this location.
    existing = (
        db.query(Dustbin)
        .filter(
            Dustbin.latitude.between(
                hotspot.latitude - LOCATION_MATCH_TOLERANCE,
                hotspot.latitude + LOCATION_MATCH_TOLERANCE,
            ),
            Dustbin.longitude.between(
                hotspot.longitude - LOCATION_MATCH_TOLERANCE,
                hotspot.longitude + LOCATION_MATCH_TOLERANCE,
            ),
        )
        .first()
    )

    if existing:
        # Unlink survey items before deleting hotspot
        db.query(SurveyItem).filter(SurveyItem.hotspot_id == hotspot_id).update(
            {SurveyItem.hotspot_id: None, SurveyItem.dustbin_id: existing.dustbin_id, SurveyItem.item_type: "DUSTBIN"},
            synchronize_session=False
        )
        db.delete(hotspot)
        db.commit()
        return existing

    dustbin = Dustbin(
        latitude=hotspot.latitude,
        longitude=hotspot.longitude,
        zone_type="RESIDENTIAL",
        population=500,
        days_since_last_collection=0,
        previous_day_fill=50.0,
    )
    db.add(dustbin)
    db.flush()

    # Re-link any survey items from this hotspot to the new dustbin
    db.query(SurveyItem).filter(SurveyItem.hotspot_id == hotspot_id).update(
        {SurveyItem.hotspot_id: None, SurveyItem.dustbin_id: dustbin.dustbin_id, SurveyItem.item_type: "DUSTBIN"},
        synchronize_session=False
    )

    db.delete(hotspot)
    db.commit()
    db.refresh(dustbin)
    return dustbin