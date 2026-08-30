from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db.database import get_db
from models.dustbin import Dustbin
from models.user import User
from dependencies import require_admin, get_current_user_optional
from schemas.user import UserOut, PromoteRequest
from services.pre_calculation import predict_dustbin_fill_for_date

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(User).order_by(User.id).all()


@router.post("/promote", response_model=UserOut)
def promote_to_admin(
    payload: PromoteRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user with that email")
    user.role = "admin"
    db.commit()
    db.refresh(user)
    return user


@router.post("/demote", response_model=UserOut)
def demote_to_user(
    payload: PromoteRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user with that email")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You can't demote yourself")
    user.role = "user"
    db.commit()
    db.refresh(user)
    return user


@router.post("/predict-dustbins")
def predict_dustbins_for_date(
    prediction_date: date | None = Query(default=None, description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
    _admin: User | None = Depends(get_current_user_optional),
):
    """Predict fill percentage for every dustbin using the saved ML pipeline and date features."""
    target_date = prediction_date or date.today()

    if not db.query(Dustbin).first():
        raise HTTPException(status_code=404, detail="No dustbins found in the database")

    predictions = predict_dustbin_fill_for_date(db, target_date)

    return {
        "prediction_date": str(target_date),
        "results": [
            {
                "dustbin_id": item["dustbin_id"],
                "predicted_fill_percentage": float(item["predicted_fill_percentage"]),
            }
            for item in predictions
        ],
    }
