from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.driver import Driver
from models.user import User
from dependencies import require_admin, get_current_driver
from schemas.driver import DriverResponse, DriverLinkUserRequest

router = APIRouter(prefix="/drivers", tags=["drivers"])


@router.get("/me", response_model=DriverResponse)
def get_my_driver_profile(
    driver: Driver = Depends(get_current_driver),
):
    """Lets the logged-in user fetch their own driver_id + profile."""
    return driver


@router.get("", response_model=list[DriverResponse])
def list_drivers(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(Driver).order_by(Driver.driver_id).all()


@router.post("/{driver_id}/link-user", response_model=DriverResponse)
def link_driver_to_user(
    driver_id: int,
    payload: DriverLinkUserRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user with that email")

    already_linked = db.query(Driver).filter(Driver.user_id == user.id).first()
    if already_linked and already_linked.driver_id != driver.driver_id:
        raise HTTPException(status_code=400, detail="That user is already linked to another driver")

    driver.user_id = user.id
    db.commit()
    db.refresh(driver)
    return driver


@router.post("/{driver_id}/unlink-user", response_model=DriverResponse)
def unlink_driver_from_user(
    driver_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    driver.user_id = None
    db.commit()
    db.refresh(driver)
    return driver