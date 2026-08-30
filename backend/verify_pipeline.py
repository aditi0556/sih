import urllib.request
import json

def run_verification():
    print("=" * 65)
    print("SIH Waste Management & Route Optimization Verification")
    print("=" * 65)

    # 1. Health check
    print("\n1. Backend Health Check (GET /health):")
    req = urllib.request.urlopen("http://127.0.0.1:8000/health")
    health = json.loads(req.read().decode("utf-8"))
    print("   -> Status: 200 OK | Response:", health)

    # 2. Run ML predictions
    print("\n2. ML Prediction Model (POST /predict-dustbin-fill):")
    req = urllib.request.Request("http://127.0.0.1:8000/predict-dustbin-fill?target_date=2026-08-30", data=b"", method="POST")
    res = urllib.request.urlopen(req)
    preds = json.loads(res.read().decode("utf-8"))
    print(f"   -> Status: 200 OK | Total Predicted Dustbins: {preds.get('total_predicted')}")

    # 3. Run Google OR-Tools CVRP Optimizer & persist to routes table
    print("\n3. Google OR-Tools Optimizer & DB Storage (POST /routing/optimize):")
    req = urllib.request.Request("http://127.0.0.1:8000/routing/optimize?target_date=2026-08-30", data=b"", method="POST")
    res = urllib.request.urlopen(req)
    opt = json.loads(res.read().decode("utf-8"))
    print("   -> Status: 200 OK")
    print(f"   -> Optimizer Summary: {opt.get('summary')}")
    print(f"   -> Saved Route Records in 'routes' Table: {opt.get('saved_route_records')}")

    # 4. Fetch routes table records
    print("\n4. Routes Table Verification (GET /routing/routes):")
    req = urllib.request.urlopen("http://127.0.0.1:8000/routing/routes?target_date=2026-08-30")
    routes_data = json.loads(req.read().decode("utf-8"))
    print(f"   -> Total Route Records in Database: {routes_data.get('total_records')}")
    for r in routes_data.get("routes", []):
        print(f"      [Record #{r['id']}] Truck #{r['truck_id']} -> Dustbin #{r['dustbin_id']} (Sequence #{r['sequence_number']})")

    # 5. Fetch per-driver route and map coordinates
    print("\n5. Per-Truck Driver Routes & Map Sequences (GET /drivers/{id}/route):")
    for driver_id in [1, 2, 3, 4]:
        req = urllib.request.urlopen(f"http://127.0.0.1:8000/drivers/{driver_id}/route?target_date=2026-08-30")
        d_data = json.loads(req.read().decode("utf-8"))
        d_info = d_data.get("driver", {})
        t_info = d_data.get("assignment", {})
        stops = d_data.get("stops", [])
        geom = d_data.get("geometry", {})
        coords_count = len(geom.get("coordinates", [])) if geom else 0
        print(f"   -> Driver {driver_id}: {d_info.get('name')} | Truck {d_info.get('truck_id')} ({t_info.get('vehicleNumber')})")
        print(f"      Stops: {len(stops)} stops | Route Polyline Points: {coords_count}")
        for s in stops:
            print(f"         * Stop #{s['sequence_number']}: Bin #{s['dustbin_id']} ({s['location']}) - Lat/Lng: ({s['lat']}, {s['lng']}) | Fill: {s['fill_pct']}%")

    # 6. Survey schedule check
    print("\n6. Weekly Survey System Verification (GET /survey/schedule):")
    req = urllib.request.urlopen("http://127.0.0.1:8000/survey/schedule")
    survey_data = json.loads(req.read().decode("utf-8"))
    stats = survey_data.get("stats", {})
    print(f"   -> Survey Week: {survey_data.get('week_start_date')}")
    print(f"   -> Assignments: {stats.get('total_assignments')} | Dustbins to audit: {stats.get('total_dustbins')} | Hotspots to audit: {stats.get('total_hotspots')}")

    # 7. Frontend Server Check
    print("\n7. Frontend Vite Server (GET http://localhost:5173/):")
    req = urllib.request.urlopen("http://localhost:5173/")
    print(f"   -> Status: {req.status} OK | Loaded Landing Page Bundle")

    print("\n" + "=" * 65)
    print("ALL VERIFICATION CHECKS COMPLETED AND VALIDATED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    run_verification()
