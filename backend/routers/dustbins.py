from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.database import get_db
from models.dustbin import Dustbin
from models.user import User
from dependencies import require_admin

router = APIRouter(prefix="/get", tags=["dustbins"])


@router.get("/dustbins")
def get_dustbins(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    dustbins = db.query(Dustbin).all()
    return [
        {
            "dustbin_id": bin.dustbin_id,
            "latitude": bin.latitude,
            "longitude": bin.longitude,
            "previous_day_fill": bin.previous_day_fill,
            "zone_type": bin.zone_type,
            "population": bin.population,
            "days_since_last_collection": bin.days_since_last_collection,
        }
        for bin in dustbins
    ]