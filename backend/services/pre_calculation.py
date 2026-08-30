from __future__ import annotations

import warnings
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sqlalchemy.orm import Session

import models  # noqa: F401 - ensure all ORM entities are registered
from models.dustbin import Dustbin
from models.prediction import DailyPrediction

# Suppress benign XGBoost backward compatibility notices during inference
warnings.filterwarnings("ignore", category=UserWarning, module="xgboost")

# Maintain a configurable, year-based festival calendar.
_FESTIVAL_CALENDAR: dict[int, dict[date, str]] = {
    2024: {
        date(2024, 1, 14): "Makar Sankranti",
        date(2024, 3, 25): "Holi",
        date(2024, 4, 11): "Eid",
        date(2024, 8, 19): "Raksha Bandhan",
        date(2024, 9, 7): "Ganesh Chaturthi",
        date(2024, 9, 15): "Onam",
        date(2024, 10, 3): "Navratri",
        date(2024, 10, 12): "Dussehra",
        date(2024, 10, 31): "Diwali",
        date(2024, 12, 25): "Christmas",
    },
    2025: {
        date(2025, 1, 14): "Makar Sankranti",
        date(2025, 3, 14): "Holi",
        date(2025, 3, 31): "Eid",
        date(2025, 8, 9): "Raksha Bandhan",
        date(2025, 8, 27): "Ganesh Chaturthi",
        date(2025, 9, 5): "Onam",
        date(2025, 9, 22): "Navratri",
        date(2025, 10, 2): "Dussehra",
        date(2025, 10, 20): "Diwali",
        date(2025, 12, 25): "Christmas",
    },
    2026: {
        date(2026, 1, 14): "Makar Sankranti",
        date(2026, 3, 4): "Holi",
        date(2026, 3, 20): "Eid",
        date(2026, 8, 19): "Raksha Bandhan",
        date(2026, 8, 31): "Onam",
        date(2026, 9, 5): "Ganesh Chaturthi",
        date(2026, 9, 22): "Navratri",
        date(2026, 10, 20): "Dussehra",
        date(2026, 11, 8): "Diwali",
        date(2026, 12, 25): "Christmas",
    },
    2027: {
        date(2027, 1, 14): "Makar Sankranti",
        date(2027, 3, 1): "Holi",
        date(2027, 3, 10): "Eid",
        date(2027, 8, 24): "Raksha Bandhan",
        date(2027, 8, 30): "Onam",
        date(2027, 9, 3): "Ganesh Chaturthi",
        date(2027, 9, 21): "Navratri",
        date(2027, 10, 12): "Dussehra",
        date(2027, 10, 31): "Diwali",
        date(2027, 12, 25): "Christmas",
    },
    2028: {
        date(2028, 1, 14): "Makar Sankranti",
        date(2028, 2, 28): "Eid",
        date(2028, 3, 8): "Holi",
        date(2028, 8, 12): "Raksha Bandhan",
        date(2028, 8, 20): "Onam",
        date(2028, 8, 24): "Ganesh Chaturthi",
        date(2028, 9, 20): "Navratri",
        date(2028, 10, 2): "Dussehra",
        date(2028, 10, 24): "Diwali",
        date(2028, 12, 25): "Christmas",
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
    """Return configured major Indian holiday dates for a year."""
    return set(_INDIA_MAJOR_HOLIDAYS.get(year, set()))


def _coerce_date(input_date: str | date | datetime | None) -> date:
    """Validate and normalize the accepted input date format."""
    if input_date is None:
        return date.today()

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


def get_date_features(input_date: str | date | datetime | None) -> dict[str, Any]:
    """
    Extract calendar-derived ML features for a single target date.
    Returns day name string and month name string matching the trained OneHotEncoder categories.
    """
    parsed_date = _coerce_date(input_date)
    year = parsed_date.year

    festival_lookup = {
        festival_date: festival_name
        for festival_year in (year - 1, year, year + 1)
        for festival_date, festival_name in get_festivals(festival_year).items()
    }

    festival_dates = sorted(festival_lookup.keys())
    previous_festival_dates = [d for d in festival_dates if d <= parsed_date]
    next_festival_dates = [d for d in festival_dates if d >= parsed_date]

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
        "day_of_week": parsed_date.strftime("%A"),  # e.g., 'Monday', 'Sunday'
        "is_weekend": int(1 if parsed_date.weekday() >= 5 else 0),
        "is_holiday": is_holiday,
        "month": parsed_date.strftime("%B"),        # e.g., 'August', 'September'
        "days_since_festival": int(days_since_festival),
        "days_to_festival": int(days_to_festival),
        "is_festival": is_festival,
    }


def normalize_zone_type(zone_type: str | None) -> str:
    """Normalize database zone type strings into the categories known by the ML model."""
    if not zone_type:
        return "Residential"

    zt = str(zone_type).strip().upper()
    if "COMMERCIAL" in zt or "MARKET" in zt or "SHOP" in zt:
        return "Market"
    if "INSTITUT" in zt or "SCHOOL" in zt or "COLLEGE" in zt or "HOSPITAL" in zt:
        return "Institution"
    if "PUBLIC" in zt or "PARK" in zt or "BEACH" in zt or "BUS" in zt or "STATION" in zt or "INDUSTRIAL" in zt:
        return "Public"
    return "Residential"


MODEL_V2_PATH = Path(__file__).parent / "dustbin_fill_prediction_pipeline_v2.pkl"
MODEL_V1_PATH = Path(__file__).parent / "dustbin_fill_prediction_pipeline.pkl"


@lru_cache(maxsize=1)
def load_prediction_model() -> Any:
    """Load the trained XGBoost pipeline model using joblib."""
    for model_path in (MODEL_V2_PATH, MODEL_V1_PATH):
        if model_path.exists():
            try:
                return joblib.load(model_path)
            except Exception:
                continue

    raise FileNotFoundError(f"No valid ML model artifact found at {MODEL_V2_PATH} or {MODEL_V1_PATH}")


# The exact feature ordering expected by the trained ML pipeline
MODEL_FEATURE_COLUMNS = [
    "latitude",
    "longitude",
    "zone_type",
    "population_served",
    "previous_day_fill",
    "days_since_last_collection",
    "day_of_week",
    "is_weekend",
    "is_holiday",
    "month",
    "days_since_festival",
    "days_to_festival",
    "is_festival",
]


def build_dustbin_feature_row(dustbin: Dustbin, date_features: dict[str, Any]) -> dict[str, Any]:
    """Construct a feature row dict for a single dustbin."""
    population = dustbin.population if dustbin.population is not None else 1000
    prev_fill = dustbin.previous_day_fill if dustbin.previous_day_fill is not None else 50.0
    days_since_col = dustbin.days_since_last_collection if dustbin.days_since_last_collection is not None else 1

    return {
        "latitude": float(dustbin.latitude),
        "longitude": float(dustbin.longitude),
        "zone_type": normalize_zone_type(dustbin.zone_type),
        "population_served": int(population),
        "previous_day_fill": float(prev_fill),
        "days_since_last_collection": int(days_since_col),
        "day_of_week": str(date_features["day_of_week"]),
        "is_weekend": int(date_features["is_weekend"]),
        "is_holiday": int(date_features["is_holiday"]),
        "month": str(date_features["month"]),
        "days_since_festival": int(date_features["days_since_festival"]),
        "days_to_festival": int(date_features["days_to_festival"]),
        "is_festival": int(date_features["is_festival"]),
    }


def predict_dustbin_fill_for_date(
    db: Session,
    prediction_date: str | date | datetime | None = None
) -> list[dict[str, Any]]:
    """
    1. Loads all dustbins from the `dustbins` table.
    2. Calculates dynamic calendar, holiday, and festival features.
    3. Feeds feature matrix to the XGBoost pipeline model.
    4. Upserts resulting predictions into the `daily_predictions` table.
    5. Returns formatted prediction rows.
    """
    target_date = _coerce_date(prediction_date)
    dustbins = db.query(Dustbin).all()

    if not dustbins:
        return []

    date_features = get_date_features(target_date)
    model = load_prediction_model()

    # Build feature DataFrame
    feature_rows = [build_dustbin_feature_row(bin_obj, date_features) for bin_obj in dustbins]
    feature_df = pd.DataFrame(feature_rows, columns=MODEL_FEATURE_COLUMNS)

    # Run batch inference
    raw_predictions = model.predict(feature_df)

    # Post-process & construct output records
    prediction_results: list[dict[str, Any]] = []
    for bin_obj, raw_pred in zip(dustbins, raw_predictions):
        clamped_fill = round(float(min(max(raw_pred, 0.0), 100.0)), 2)

        prediction_results.append({
            "dustbin_id": bin_obj.dustbin_id,
            "prediction_date": target_date,
            "predicted_fill_percentage": clamped_fill,
            "latitude": bin_obj.latitude,
            "longitude": bin_obj.longitude,
            "zone_type": bin_obj.zone_type,
        })

    # Upsert into database
    for item in prediction_results:
        existing = (
            db.query(DailyPrediction)
            .filter(
                DailyPrediction.dustbin_id == item["dustbin_id"],
                DailyPrediction.prediction_date == target_date,
            )
            .first()
        )

        if existing is not None:
            existing.predicted_fill_percentage = item["predicted_fill_percentage"]
        else:
            db.add(
                DailyPrediction(
                    dustbin_id=item["dustbin_id"],
                    prediction_date=target_date,
                    predicted_fill_percentage=item["predicted_fill_percentage"],
                )
            )

    db.commit()
    return prediction_results
