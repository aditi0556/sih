from models.dustbin import Dustbin
from models.truck import Truck
from models.driver import Driver
from models.training_data import TrainingData
from models.prediction import DailyPrediction
from models.route import Route
from .hotspot import Hotspot

__all__ = [
    "Dustbin",
    "Truck",
    "Driver",
    "TrainingData",
    "DailyPrediction",
    "Route",
    "Hotspot"
]