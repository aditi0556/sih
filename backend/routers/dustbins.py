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
):
    dustbins = db.query(Dustbin).all()
    return [
        {"latitude": bin.latitude, "longitude": bin.longitude}
        for bin in dustbins
    ]