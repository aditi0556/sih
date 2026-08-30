from datetime import date

from db.database import SessionLocal

from models.truck import Truck
from models.dustbin import Dustbin
from models.driver import Driver
from models.prediction import DailyPrediction
from models.route import Route


def seed_database():
    db = SessionLocal()

    try:

        # =========================================================
        # TRUCKS
        # =========================================================

        trucks = [
            Truck(
                truck_id=1,
                vehicle_number="KA19AB1234",
                capacity_kg=5000,
                status="AVAILABLE",
                latitude=12.872114,
                longitude=74.843407,
            ),
            Truck(
                truck_id=2,
                vehicle_number="KA19CD5678",
                capacity_kg=4500,
                status="AVAILABLE",
                latitude=12.884186,
                longitude=74.855263,
            ),
            Truck(
                truck_id=3,
                vehicle_number="KA19EF9012",
                capacity_kg=6000,
                status="AVAILABLE",
                latitude=12.848650,
                longitude=74.900550,
            ),
            Truck(
                truck_id=4,
                vehicle_number="KA19GH3456",
                capacity_kg=4000,
                status="AVAILABLE",
                latitude=12.956590,
                longitude=74.807560,
            ),
        ]

        db.add_all(trucks)
        db.flush()

        # =========================================================
        # DUSTBINS
        # =========================================================

        dustbins = [
            Dustbin(
                dustbin_id=1,
                latitude=12.872114,
                longitude=74.843407,
                zone_type="COMMERCIAL",
                population=1800,
                days_since_last_collection=2,
                previous_day_fill=78.5,
            ),
            Dustbin(
                dustbin_id=2,
                latitude=12.884186,
                longitude=74.855263,
                zone_type="RESIDENTIAL",
                population=1200,
                days_since_last_collection=2,
                previous_day_fill=67.0,
            ),
            Dustbin(
                dustbin_id=3,
                latitude=12.848650,
                longitude=74.900550,
                zone_type="COMMERCIAL",
                population=2100,
                days_since_last_collection=3,
                previous_day_fill=89.0,
            ),
            Dustbin(
                dustbin_id=4,
                latitude=12.875000,
                longitude=74.858000,
                zone_type="COMMERCIAL",
                population=1600,
                days_since_last_collection=1,
                previous_day_fill=55.0,
            ),
            Dustbin(
                dustbin_id=5,
                latitude=12.857000,
                longitude=74.834000,
                zone_type="RESIDENTIAL",
                population=950,
                days_since_last_collection=2,
                previous_day_fill=63.0,
            ),
            Dustbin(
                dustbin_id=6,
                latitude=12.876000,
                longitude=74.842000,
                zone_type="COMMERCIAL",
                population=1900,
                days_since_last_collection=3,
                previous_day_fill=86.0,
            ),
            Dustbin(
                dustbin_id=7,
                latitude=12.900000,
                longitude=74.850000,
                zone_type="RESIDENTIAL",
                population=1400,
                days_since_last_collection=2,
                previous_day_fill=72.0,
            ),
            Dustbin(
                dustbin_id=8,
                latitude=12.956590,
                longitude=74.807560,
                zone_type="INDUSTRIAL",
                population=700,
                days_since_last_collection=4,
                previous_day_fill=92.0,
            ),
            Dustbin(
                dustbin_id=9,
                latitude=12.998330,
                longitude=74.796640,
                zone_type="RESIDENTIAL",
                population=1100,
                days_since_last_collection=2,
                previous_day_fill=69.0,
            ),
            Dustbin(
                dustbin_id=10,
                latitude=12.944000,
                longitude=74.812000,
                zone_type="INDUSTRIAL",
                population=600,
                days_since_last_collection=5,
                previous_day_fill=96.0,
            ),
        ]

        db.add_all(dustbins)
        db.flush()

        # =========================================================
        # DRIVERS
        # =========================================================

        drivers = [
            Driver(
                driver_id=1,
                name="Arjun Kumar",
                phone="9876543210",
                truck_id=1,
                status="AVAILABLE",
            ),
            Driver(
                driver_id=2,
                name="Rahul Shetty",
                phone="9876543211",
                truck_id=2,
                status="AVAILABLE",
            ),
            Driver(
                driver_id=3,
                name="Vikram Rao",
                phone="9876543212",
                truck_id=3,
                status="AVAILABLE",
            ),
            Driver(
                driver_id=4,
                name="Suresh Naik",
                phone="9876543213",
                truck_id=4,
                status="AVAILABLE",
            ),
            Driver(
                driver_id=5,
                name="Manoj Bhat",
                phone="9876543214",
                truck_id=None,
                status="AVAILABLE",
            ),
        ]

        db.add_all(drivers)
        db.flush()

        # =========================================================
        # DAILY PREDICTIONS
        # =========================================================

        predictions = [
            # 30 AUGUST 2026

            DailyPrediction(
                dustbin_id=1,
                prediction_date=date(2026, 8, 30),
                predicted_fill_percentage=84.0,
            ),
            DailyPrediction(
                dustbin_id=2,
                prediction_date=date(2026, 8, 30),
                predicted_fill_percentage=73.0,
            ),
            DailyPrediction(
                dustbin_id=3,
                prediction_date=date(2026, 8, 30),
                predicted_fill_percentage=94.0,
            ),
            DailyPrediction(
                dustbin_id=4,
                prediction_date=date(2026, 8, 30),
                predicted_fill_percentage=61.0,
            ),
            DailyPrediction(
                dustbin_id=5,
                prediction_date=date(2026, 8, 30),
                predicted_fill_percentage=70.0,
            ),
            DailyPrediction(
                dustbin_id=6,
                prediction_date=date(2026, 8, 30),
                predicted_fill_percentage=91.0,
            ),
            DailyPrediction(
                dustbin_id=7,
                prediction_date=date(2026, 8, 30),
                predicted_fill_percentage=78.0,
            ),
            DailyPrediction(
                dustbin_id=8,
                prediction_date=date(2026, 8, 30),
                predicted_fill_percentage=96.0,
            ),
            DailyPrediction(
                dustbin_id=9,
                prediction_date=date(2026, 8, 30),
                predicted_fill_percentage=76.0,
            ),
            DailyPrediction(
                dustbin_id=10,
                prediction_date=date(2026, 8, 30),
                predicted_fill_percentage=99.0,
            ),

            # 31 AUGUST 2026

            DailyPrediction(
                dustbin_id=1,
                prediction_date=date(2026, 8, 31),
                predicted_fill_percentage=92.0,
            ),
            DailyPrediction(
                dustbin_id=2,
                prediction_date=date(2026, 8, 31),
                predicted_fill_percentage=81.0,
            ),
            DailyPrediction(
                dustbin_id=3,
                prediction_date=date(2026, 8, 31),
                predicted_fill_percentage=100.0,
            ),
            DailyPrediction(
                dustbin_id=4,
                prediction_date=date(2026, 8, 31),
                predicted_fill_percentage=69.0,
            ),
            DailyPrediction(
                dustbin_id=5,
                prediction_date=date(2026, 8, 31),
                predicted_fill_percentage=78.0,
            ),
            DailyPrediction(
                dustbin_id=6,
                prediction_date=date(2026, 8, 31),
                predicted_fill_percentage=98.0,
            ),
            DailyPrediction(
                dustbin_id=7,
                prediction_date=date(2026, 8, 31),
                predicted_fill_percentage=86.0,
            ),
            DailyPrediction(
                dustbin_id=8,
                prediction_date=date(2026, 8, 31),
                predicted_fill_percentage=100.0,
            ),
            DailyPrediction(
                dustbin_id=9,
                prediction_date=date(2026, 8, 31),
                predicted_fill_percentage=84.0,
            ),
            DailyPrediction(
                dustbin_id=10,
                prediction_date=date(2026, 8, 31),
                predicted_fill_percentage=100.0,
            ),
        ]

        db.add_all(predictions)
        db.flush()

        # =========================================================
        # ROUTES
        # =========================================================

        routes = [
            # Truck 1
            Route(
                truck_id=1,
                dustbin_id=1,
                sequence_number=1,
                route_date=date(2026, 8, 30),
            ),
            Route(
                truck_id=1,
                dustbin_id=6,
                sequence_number=2,
                route_date=date(2026, 8, 30),
            ),
            Route(
                truck_id=1,
                dustbin_id=5,
                sequence_number=3,
                route_date=date(2026, 8, 30),
            ),

            # Truck 2
            Route(
                truck_id=2,
                dustbin_id=2,
                sequence_number=1,
                route_date=date(2026, 8, 30),
            ),
            Route(
                truck_id=2,
                dustbin_id=7,
                sequence_number=2,
                route_date=date(2026, 8, 30),
            ),
            Route(
                truck_id=2,
                dustbin_id=4,
                sequence_number=3,
                route_date=date(2026, 8, 30),
            ),

            # Truck 3
            Route(
                truck_id=3,
                dustbin_id=3,
                sequence_number=1,
                route_date=date(2026, 8, 30),
            ),
            Route(
                truck_id=3,
                dustbin_id=9,
                sequence_number=2,
                route_date=date(2026, 8, 30),
            ),

            # Truck 4
            Route(
                truck_id=4,
                dustbin_id=8,
                sequence_number=1,
                route_date=date(2026, 8, 30),
            ),
            Route(
                truck_id=4,
                dustbin_id=10,
                sequence_number=2,
                route_date=date(2026, 8, 30),
            ),
        ]

        db.add_all(routes)

        # =========================================================
        # COMMIT
        # =========================================================

        db.commit()

        print("======================================")
        print("Database seeded successfully!")
        print("======================================")
        print("Trucks:        4")
        print("Drivers:       5")
        print("Dustbins:     10")
        print("Predictions:  20")
        print("Routes:       10")
        print("======================================")


    except Exception as e:
        db.rollback()
        print("Error while seeding database:")
        print(e)

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

