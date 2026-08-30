import unittest
from datetime import date, datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from db.database import Base
from models.dustbin import Dustbin
from models.driver import Driver
from models.hotspot import Hotspot
from models.truck import Truck
from models.survey import SurveyAssignment, SurveyItem, SurveyLog
from routers.survey import auto_generate_weekly_schedule, get_week_monday
from schemas.survey import UpdateDustbinFillRequest, UpdateHotspotPresenceRequest


class TestSurveySystem(unittest.TestCase):
    def setUp(self):
        # Create an in-memory SQLite database for fast isolated testing
        self.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # Seed minimal drivers & dustbins
        self.truck = Truck(truck_id=1, vehicle_number="KA19AB1234", capacity_kg=5000, status="AVAILABLE", latitude=12.87, longitude=74.84)
        self.driver1 = Driver(driver_id=1, name="Arjun Kumar", phone="9876543210", truck_id=1, status="AVAILABLE")
        self.driver2 = Driver(driver_id=2, name="Rahul Shetty", phone="9876543211", truck_id=1, status="AVAILABLE")

        self.dustbin1 = Dustbin(dustbin_id=1, latitude=12.872, longitude=74.843, zone_type="COMMERCIAL", population=1500, previous_day_fill=50.0)
        self.dustbin2 = Dustbin(dustbin_id=2, latitude=12.884, longitude=74.855, zone_type="RESIDENTIAL", population=1200, previous_day_fill=40.0)

        self.hotspot1 = Hotspot(id=1, latitude=12.871, longitude=74.842, times_found_dirty=3)

        self.db.add_all([self.truck, self.driver1, self.driver2, self.dustbin1, self.dustbin2, self.hotspot1])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_auto_generate_weekly_schedule(self):
        monday = get_week_monday(date(2026, 8, 30))
        assignments = auto_generate_weekly_schedule(self.db, monday)
        self.assertEqual(len(assignments), 2)
        
        # Verify items were created
        total_items = self.db.query(SurveyItem).count()
        self.assertGreater(total_items, 0)
        print(f"[TEST PASS] Generated {len(assignments)} weekly assignments with {total_items} items.")

    def test_dustbin_fill_update(self):
        monday = get_week_monday(date(2026, 8, 30))
        auto_generate_weekly_schedule(self.db, monday)

        # Update fill
        from routers.survey import update_dustbin_fill
        req = UpdateDustbinFillRequest(dustbin_id=1, fill_level=85.0, remarks="Measured full")
        res = update_dustbin_fill(req, db=self.db)

        self.assertEqual(res["status"], "success")
        self.assertEqual(res["new_fill_level"], 85.0)

        # Check DB dustbin record
        db_bin = self.db.query(Dustbin).filter(Dustbin.dustbin_id == 1).first()
        self.assertEqual(db_bin.previous_day_fill, 85.0)

        # Check survey log
        log = self.db.query(SurveyLog).filter(SurveyLog.target_id == 1, SurveyLog.item_type == "DUSTBIN").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.recorded_fill_level, 85.0)
        print(f"[TEST PASS] Dustbin fill level successfully updated and logged.")

    def test_hotspot_presence_update(self):
        monday = get_week_monday(date(2026, 8, 30))
        auto_generate_weekly_schedule(self.db, monday)

        from routers.survey import update_hotspot_presence
        req = UpdateHotspotPresenceRequest(hotspot_id=1, is_present=True, remarks="Garbage overflow confirmed")
        res = update_hotspot_presence(req, db=self.db)

        self.assertEqual(res["status"], "success")
        self.assertTrue(res["is_present"])
        self.assertEqual(res["times_found_dirty"], 4)

        db_spot = self.db.query(Hotspot).filter(Hotspot.id == 1).first()
        self.assertEqual(db_spot.times_found_dirty, 4)

        log = self.db.query(SurveyLog).filter(SurveyLog.target_id == 1, SurveyLog.item_type == "HOTSPOT").first()
        self.assertIsNotNone(log)
        self.assertTrue(log.is_hotspot_present)
        print(f"[TEST PASS] Hotspot presence verified and times_found_dirty incremented.")


if __name__ == "__main__":
    unittest.main()
