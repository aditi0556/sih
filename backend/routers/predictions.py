from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db.database import get_db
from models.prediction import DailyPrediction
from models.dustbin import Dustbin
from services.pre_calculation import predict_dustbin_fill_for_date

router = APIRouter(tags=["predictions"])


@router.post("/predict-dustbin-fill")
@router.post("/predictions/run")
def run_dustbin_fill_prediction(
    target_date: Optional[date] = Query(default=None, description="Date for ML prediction (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """
    1. Loads all dustbins from the database.
    2. Calculates calendar, holiday, and festival features.
    3. Runs the XGBoost prediction model to predict fill percentage.
    4. Upserts and saves the predictions in the `daily_predictions` table.
    """
    selected_date = target_date or date.today()

    dustbins = db.query(Dustbin).all()
    if not dustbins:
        raise HTTPException(status_code=404, detail="No dustbins found in database to generate predictions")

    results = predict_dustbin_fill_for_date(db, selected_date)

    return {
        "status": "success",
        "target_date": str(selected_date),
        "total_predicted": len(results),
        "predictions": results,
    }


@router.get("/predict-dustbin-fill")
@router.get("/predictions/latest")
def get_dustbin_predictions(
    target_date: Optional[date] = Query(default=None, description="Date of predictions to retrieve"),
    db: Session = Depends(get_db),
):
    """
    Retrieves dustbin predictions joined with coordinates for a given date or the most recent date.
    """
    query_date = target_date
    if not query_date:
        latest = (
            db.query(DailyPrediction.prediction_date)
            .order_by(DailyPrediction.prediction_date.desc())
            .first()
        )
        if not latest:
            return []
        query_date = latest[0]

    rows = (
        db.query(DailyPrediction, Dustbin)
        .join(Dustbin, DailyPrediction.dustbin_id == Dustbin.dustbin_id)
        .filter(DailyPrediction.prediction_date == query_date)
        .order_by(DailyPrediction.dustbin_id)
        .all()
    )

    return [
        {
            "dustbin_id": prediction.dustbin_id,
            "latitude": bin_item.latitude,
            "longitude": bin_item.longitude,
            "zone_type": bin_item.zone_type,
            "predicted_fill_percentage": prediction.predicted_fill_percentage,
            "prediction_date": prediction.prediction_date,
        }
        for prediction, bin_item in rows
    ]