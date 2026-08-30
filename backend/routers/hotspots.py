from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.hotspot import Hotspot
from models.dustbin import Dustbin
from models.user import User
from dependencies import require_admin
from schemas.hotspot import HotspotResponse
from schemas.dustbin import DustbinResponse

router = APIRouter(prefix="/get", tags=["hotspots"])

# How close (in degrees) two points need to be to count as "the same place".
# ~0.0001 deg is roughly 11m at this latitude — tight enough to catch exact/near
# duplicates without accidentally matching a genuinely different dustbin nearby.
LOCATION_MATCH_TOLERANCE = 0.0001


@router.get("/hotspots", response_model=list[HotspotResponse])
def get_hotspots(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(Hotspot).order_by(Hotspot.id).all()


@router.post("/hotspots/{hotspot_id}/approve", response_model=DustbinResponse)
def approve_hotspot(
    hotspot_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
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
        # Dustbin already covers this spot — just clear the hotspot, don't duplicate.
        db.delete(hotspot)
        db.commit()
        return existing

    dustbin = Dustbin(
        latitude=hotspot.latitude,
        longitude=hotspot.longitude,
        zone_type="RESIDENTIAL",       # no zone info on a hotspot, default it
        population=0,                  # unknown — adjust later via PATCH if needed
        days_since_last_collection=0,
        previous_day_fill=0,
    )
    db.add(dustbin)
    db.delete(hotspot)   # remove it from the hotspots list once promoted
    db.commit()
    db.refresh(dustbin)
    return dustbin