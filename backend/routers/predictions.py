from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.database import get_db
from models.prediction import DailyPrediction
from models.dustbin import Dustbin
from models.user import User
from dependencies import require_admin

router = APIRouter(tags=["predictions"])


@router.get("/predict-dustbin-fill")
def predict_dustbin_fill(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    latest = (
        db.query(DailyPrediction.prediction_date)
        .order_by(DailyPrediction.prediction_date.desc())
        .first()
    )
    if not latest:
        return []

    rows = (
        db.query(DailyPrediction, Dustbin)
        .join(Dustbin, DailyPrediction.dustbin_id == Dustbin.dustbin_id)
        .filter(DailyPrediction.prediction_date == latest[0])
        .order_by(DailyPrediction.dustbin_id)
        .all()
    )

    return [
        {
            "dustbin_id": prediction.dustbin_id,
            "latitude": bin.latitude,
            "longitude": bin.longitude,
            "predicted_fill_percentage": prediction.predicted_fill_percentage,
            "prediction_date": prediction.prediction_date,
        }
        for prediction, bin in rows
    ]