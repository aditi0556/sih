from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.database import get_db
from models.hotspot import Hotspot
from models.user import User
from dependencies import require_admin
from schemas.hotspot import HotspotResponse

router = APIRouter(prefix="/get", tags=["hotspots"])


@router.get("/hotspots", response_model=list[HotspotResponse])
def get_hotspots(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(Hotspot).order_by(Hotspot.id).all()