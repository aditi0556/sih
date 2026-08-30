# backend/test_engine.py
import sys
import os

# Tell Python to look in the parent 'sih' folder so it can find routing_service
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from datetime import date
from db.database import SessionLocal
from models.dustbin import Dustbin
from models.prediction import DailyPrediction

# Import your master routing function
from routing_service.engine import generate_optimized_routes

def test_routing_with_db():
    db = SessionLocal()
    try:
        # 1. Fetch today's predictions (August 30, 2026, as per your seed data)
        target_date = date(2026, 8, 30)
        
        # Join Prediction and Dustbin tables to get lat/lng + fill_pct
        results = db.query(DailyPrediction, Dustbin).join(
            Dustbin, DailyPrediction.dustbin_id == Dustbin.dustbin_id
        ).filter(
            DailyPrediction.prediction_date == target_date
        ).all()

        # 2. Format into the list of dicts expected by engine.py
        prediction_records = []
        for pred, bin_obj in results:
            prediction_records.append({
                "id": f"BIN_{bin_obj.dustbin_id}",
                "lat": bin_obj.latitude,
                "lng": bin_obj.longitude,
                "predicted_fill_pct": pred.predicted_fill_percentage,
                "is_hotspot": False
            })
        
        print(f"Fetched {len(prediction_records)} predictions for {target_date} from DB.")

        # 3. Define the Central Depot 
        depot_record = {
            "id": "DEPOT_CENTRAL",
            "lat": 12.870000, 
            "lng": 74.850000,
            "predicted_fill_pct": 0
        }

        # 4. Run the Engine!
        print("\nRunning Route Optimization via Google OR-Tools & OSRM...")
        optimized_data = generate_optimized_routes(depot_record, prediction_records)

        # 5. Display the Results cleanly
        print("\n" + "="*40)
        print("ROUTING RESULTS")
        print("="*40)
        print(f"Status: {optimized_data['status']}")
        print(f"Total Trucks Dispatched: {optimized_data['summary']['total_trucks_dispatched']}")
        print(f"Total Waste Collected: {optimized_data['summary']['total_waste_collected_units']} units")
        
        for route in optimized_data['routes']:
            print(f"\n🚚 {route['truck_id']} (Total Load: {route['total_route_load']})")
            for stop in route['stops']:
                print(f"   [{stop['seq_number']}] {stop['action']} at {stop['node_id']} (Demand: {stop['demand']})")

    finally:
        db.close()

if __name__ == "__main__":
    test_routing_with_db()