from __future__ import annotations

import pickle
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy.orm import Session

from models.dustbin import Dustbin
from models.prediction import DailyPrediction


# Maintain a configurable, year-based festival calendar. This is intentionally
# separated from the feature-extraction logic so it can later be replaced by a
# database-driven source without changing the ML feature contract.
_FESTIVAL_CALENDAR: dict[int, dict[date, str]] = {
    2025: {
        date(2025, 1, 14): "Makar Sankranti",
        date(2025, 3, 14): "Holi",
        date(2025, 5, 3): "Eid",
        date(2025, 8, 9): "Onam",
        date(2025, 8, 27): "Ganesh Chaturthi",
        date(2025, 9, 22): "Navratri",
        date(2025, 10, 2): "Dussehra",
        date(2025, 10, 20): "Diwali",
        date(2025, 11, 5): "Raksha Bandhan",
        date(2025, 12, 25): "Christmas",
    },
    2026: {
        date(2026, 1, 14): "Makar Sankranti",
        date(2026, 3, 4): "Holi",
        date(2026, 5, 26): "Eid",
        date(2026, 8, 31): "Onam",
        date(2026, 9, 5): "Ganesh Chaturthi",
        date(2026, 9, 22): "Navratri",
        date(2026, 10, 20): "Dussehra",
        date(2026, 11, 8): "Diwali",
        date(2026, 8, 19): "Raksha Bandhan",
        date(2026, 12, 25): "Christmas",
    },
    2027: {
        date(2027, 1, 14): "Makar Sankranti",
        date(2027, 3, 1): "Holi",
        date(2027, 5, 17): "Eid",
        date(2027, 8, 30): "Onam",
        date(2027, 9, 3): "Ganesh Chaturthi",
        date(2027, 9, 21): "Navratri",
        date(2027, 10, 12): "Dussehra",
        date(2027, 10, 31): "Diwali",
        date(2027, 8, 24): "Raksha Bandhan",
        date(2027, 12, 25): "Christmas",
    },
}


def get_festivals(year: int) -> dict[date, str]:
    """Return the configured festival dates for a given year."""
    return dict(_FESTIVAL_CALENDAR.get(year, {}))


_INDIA_MAJOR_HOLIDAYS: dict[int, set[date]] = {
    2024: {
        date(2024, 1, 1),
        date(2024, 1, 26),
        date(2024, 3, 8),
        date(2024, 3, 25),
        date(2024, 4, 11),
        date(2024, 5, 23),
        date(2024, 6, 17),
        date(2024, 8, 15),
        date(2024, 9, 17),
        date(2024, 10, 2),
        date(2024, 11, 1),
        date(2024, 12, 25),
    },
    2025: {
        date(2025, 1, 1),
        date(2025, 1, 26),
        date(2025, 2, 26),
        date(2025, 3, 14),
        date(2025, 3, 31),
        date(2025, 4, 10),
        date(2025, 5, 3),
        date(2025, 6, 7),
        date(2025, 8, 15),
        date(2025, 8, 27),
        date(2025, 9, 22),
        date(2025, 10, 2),
        date(2025, 10, 20),
        date(2025, 11, 5),
        date(2025, 12, 25),
    },
    2026: {
        date(2026, 1, 1),
        date(2026, 1, 26),
        date(2026, 2, 15),
        date(2026, 3, 4),
        date(2026, 3, 20),
        date(2026, 4, 14),
        date(2026, 5, 26),
        date(2026, 8, 15),
        date(2026, 8, 19),
        date(2026, 8, 31),
        date(2026, 9, 5),
        date(2026, 9, 22),
        date(2026, 10, 20),
        date(2026, 11, 8),
        date(2026, 12, 25),
    },
    2027: {
        date(2027, 1, 1),
        date(2027, 1, 26),
        date(2027, 2, 24),
        date(2027, 3, 1),
        date(2027, 3, 28),
        date(2027, 4, 6),
        date(2027, 5, 17),
        date(2027, 8, 15),
        date(2027, 8, 24),
        date(2027, 8, 30),
        date(2027, 9, 3),
        date(2027, 9, 21),
        date(2027, 10, 12),
        date(2027, 10, 31),
        date(2027, 12, 25),
    },
    2028: {
        date(2028, 1, 1),
        date(2028, 1, 26),
        date(2028, 2, 12),
        date(2028, 3, 8),
        date(2028, 3, 25),
        date(2028, 4, 4),
        date(2028, 5, 15),
        date(2028, 8, 15),
        date(2028, 9, 7),
        date(2028, 9, 20),
        date(2028, 10, 2),
        date(2028, 10, 24),
        date(2028, 11, 13),
        date(2028, 12, 25),
    },
}


@lru_cache(maxsize=None)
def _get_india_holidays(year: int) -> set[date]:
    """Return the configured major Indian holiday dates for a year."""
    return set(_INDIA_MAJOR_HOLIDAYS.get(year, set()))


def _coerce_date(input_date: str | date) -> date:
    """Validate and normalize the accepted input date format."""
    if isinstance(input_date, datetime):
        return input_date.date()

    if isinstance(input_date, date):
        return input_date

    if isinstance(input_date, str):
        value = input_date.strip()
        try:
            return date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("Input date must be either a 'YYYY-MM-DD' string or a datetime.date object.") from exc

    raise TypeError("Input date must be either a 'YYYY-MM-DD' string or a datetime.date object.")


def get_date_features(input_date: str | date) -> dict[str, int]:
    """Extract calendar-derived ML features for a single date."""
    parsed_date = _coerce_date(input_date)

    year = parsed_date.year
    festival_lookup = {
        festival_date: festival_name
        for festival_year in (year - 1, year, year + 1)
        for festival_date, festival_name in get_festivals(festival_year).items()
    }

    festival_dates = sorted(festival_lookup.keys())
    previous_festival_dates = [festival_date for festival_date in festival_dates if festival_date <= parsed_date]
    next_festival_dates = [festival_date for festival_date in festival_dates if festival_date >= parsed_date]

    previous_festival_date = max(previous_festival_dates) if previous_festival_dates else None
    next_festival_date = min(next_festival_dates) if next_festival_dates else None

    days_since_festival = 0
    if previous_festival_date is not None:
        days_since_festival = (parsed_date - previous_festival_date).days
        if parsed_date == previous_festival_date:
            days_since_festival = 0

    days_to_festival = 0
    if next_festival_date is not None:
        days_to_festival = (next_festival_date - parsed_date).days
        if parsed_date == next_festival_date:
            days_to_festival = 0

    is_festival = 1 if parsed_date in festival_lookup else 0
    is_holiday = 1 if parsed_date in _get_india_holidays(year) else 0

    return {
        "day_of_week": int(parsed_date.weekday()),
        "is_weekend": int(1 if parsed_date.weekday() >= 5 else 0),
        "is_holiday": is_holiday,
        "month": int(parsed_date.month),
        "days_since_festival": int(days_since_festival),
        "days_to_festival": int(days_to_festival),
        "is_festival": is_festival,
    }


MODEL_PATH = Path(__file__).with_name("dustbin_fill_prediction_pipeline_v2.pkl")


def _load_prediction_model() -> Any:
    """Load the serialized XGBoost pipeline used for dustbin fill prediction."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")

    with MODEL_PATH.open("rb") as model_file:
        return pickle.load(model_file)


def _build_model_feature_row(dustbin: Dustbin, prediction_date: date) -> dict[str, Any]:
    """Build a single feature row for the trained ML model without including dustbin_id."""
    date_features = get_date_features(prediction_date)

    row: dict[str, Any] = {
        "latitude": float(dustbin.latitude),
        "longitude": float(dustbin.longitude),
        "zone_type": str(dustbin.zone_type),
        "population": int(dustbin.population),
        "days_since_last_collection": int(dustbin.days_since_last_collection),
        "previous_day_fill": float(dustbin.previous_day_fill),
        "day_of_week": int(date_features["day_of_week"]),
        "is_weekend": int(date_features["is_weekend"]),
        "is_holiday": int(date_features["is_holiday"]),
        "month": int(date_features["month"]),
        "days_since_festival": int(date_features["days_since_festival"]),
        "days_to_festival": int(date_features["days_to_festival"]),
        "is_festival": int(date_features["is_festival"]),
    }
    return row


def predict_dustbin_fill_for_date(db: Session, prediction_date: str | date | None = None) -> list[dict[str, Any]]:
    """Predict fill percentage for all dustbins for a date and persist the results."""
    target_date = _coerce_date(prediction_date) if prediction_date is not None else date.today()
    dustbins = db.query(Dustbin).all()

    if not dustbins:
        return []

    model = _load_prediction_model()

    feature_candidates = [
        [
            "latitude",
            "longitude",
            "population",
            "days_since_last_collection",
            "previous_day_fill",
            "day_of_week",
            "is_weekend",
            "is_holiday",
            "month",
            "days_since_festival",
            "days_to_festival",
            "is_festival",
            "zone_type",
        ],
        [
            "days_since_last_collection",
            "zone_type",
            "latitude",
            "longitude",
            "day_of_week",
            "is_weekend",
            "is_holiday",
            "month",
            "days_since_festival",
            "days_to_festival",
            "is_festival",
            "previous_day_fill",
            "population",
        ],
        [
            "latitude",
            "longitude",
            "zone_type",
            "population",
            "days_since_last_collection",
            "previous_day_fill",
            "day_of_week",
            "is_weekend",
            "is_holiday",
            "month",
            "days_since_festival",
            "days_to_festival",
            "is_festival",
        ],
    ]

    prediction_rows: list[dict[str, Any]] = []
    feature_frame: pd.DataFrame | None = None

    for dustbin in dustbins:
        feature_row = _build_model_feature_row(dustbin, target_date)

        last_error: Exception | None = None
        for candidate_columns in feature_candidates:
            try:
                feature_frame = pd.DataFrame([feature_row], columns=candidate_columns)
                prediction = float(model.predict(feature_frame)[0])
                feature_frame = None
                prediction_rows.append(
                    {
                        "dustbin_id": dustbin.dustbin_id,
                        "prediction_date": target_date,
                        "predicted_fill_percentage": prediction,
                    }
                )
                break
            except Exception as exc:  # noqa: BLE001 - pipeline compatibility fallback
                last_error = exc
                continue

        if not prediction_rows or prediction_rows[-1]["dustbin_id"] != dustbin.dustbin_id:
            if last_error is not None:
                raise ValueError(
                    f"Unable to generate a prediction for dustbin_id={dustbin.dustbin_id} with the saved model. "
                    f"Feature mismatch likely due to different training column ordering. Last error: {last_error}"
                ) from last_error

    for prediction in prediction_rows:
        existing_prediction = (
            db.query(DailyPrediction)
            .filter(
                DailyPrediction.dustbin_id == prediction["dustbin_id"],
                DailyPrediction.prediction_date == prediction["prediction_date"],
            )
            .first()
        )

        if existing_prediction is not None:
            existing_prediction.predicted_fill_percentage = float(prediction["predicted_fill_percentage"])
        else:
            db.add(
                DailyPrediction(
                    dustbin_id=prediction["dustbin_id"],
                    prediction_date=prediction["prediction_date"],
                    predicted_fill_percentage=float(prediction["predicted_fill_percentage"]),
                )
            )

    db.commit()
    return prediction_rows


if __name__ == "__main__":
    sample_date = "2026-08-30"
    print(get_date_features(sample_date))
    print("Date feature utility OK")
