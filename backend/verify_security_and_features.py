import sys
import json
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.insert(0, "backend")
from main import app
from db.database import SessionLocal
from models.hotspot import Hotspot

def run_tests():
    client = TestClient(app)
    print("=" * 65)
    print("RUNNING COMPREHENSIVE SECURITY, AUTH & ADMIN TESTS")
    print("=" * 65)

    # -------------------------------------------------------------
    # TEST 1: Driver Isolation & Privacy Check
    # -------------------------------------------------------------
    print("\n[TEST 1] Testing Driver Route & Credential Isolation...")
    # Login as Driver 1 (Arjun)
    login_res = client.post("/auth/login", json={"email": "arjun@sih.com", "password": "driver123"})
    assert login_res.status_code == 200, f"Driver login failed: {login_res.text}"
    print("   -> Logged in as Driver 1 (Arjun Kumar)")

    # 1a. Access own route
    my_route_res = client.get("/drivers/me/route")
    assert my_route_res.status_code == 200, f"Own route failed: {my_route_res.text}"
    my_route = my_route_res.json()
    print(f"   -> Driver 1 own route fetched successfully ({len(my_route.get('stops', []))} stops)")
    print(f"   -> all_drivers list visible to Driver 1: {len(my_route.get('all_drivers', []))} items (Must be 0 for privacy)")
    assert len(my_route.get("all_drivers", [])) == 0, "Driver should NOT see other drivers list"

    # 1b. Attempt to access Driver 2's route
    driver2_route_res = client.get("/drivers/2/route")
    print(f"   -> Attempt by Driver 1 to access Driver 2 route: Status {driver2_route_res.status_code} ({driver2_route_res.json().get('detail')})")
    assert driver2_route_res.status_code == 403, f"Expected 403 Forbidden, got {driver2_route_res.status_code}"

    # 1c. Attempt to list all drivers
    list_drivers_res = client.get("/drivers")
    print(f"   -> Attempt by Driver 1 to list all drivers: Status {list_drivers_res.status_code}")
    assert list_drivers_res.status_code == 403, f"Expected 403 Forbidden, got {list_drivers_res.status_code}"

    # -------------------------------------------------------------
    # TEST 2: Admin Access & Oversight
    # -------------------------------------------------------------
    print("\n[TEST 2] Testing Admin Access & Multi-Driver Inspection...")
    admin_login_res = client.post("/auth/login", json={"email": "admin@sih.com", "password": "admin123"})
    assert admin_login_res.status_code == 200, f"Admin login failed: {admin_login_res.text}"
    print("   -> Logged in as Admin")

    admin_driver1_res = client.get("/drivers/1/route")
    assert admin_driver1_res.status_code == 200, f"Admin inspecting Driver 1 failed: {admin_driver1_res.text}"
    admin_driver2_res = client.get("/drivers/2/route")
    assert admin_driver2_res.status_code == 200, f"Admin inspecting Driver 2 failed: {admin_driver2_res.text}"
    print("   -> Admin successfully inspected Driver 1 and Driver 2 routes with full permissions")

    # -------------------------------------------------------------
    # TEST 3: Admin Hotspot Approve Button
    # -------------------------------------------------------------
    print("\n[TEST 3] Testing Admin Hotspot Approval to Dustbin Promotion...")
    # Find an existing hotspot or seed a test one
    db = SessionLocal()
    hotspot = db.query(Hotspot).first()
    if not hotspot:
        hotspot = Hotspot(latitude=12.8900, longitude=74.8600, reported_by="Test Citizen", description="Corner dump")
        db.add(hotspot)
        db.commit()
        db.refresh(hotspot)
    
    hotspot_id = hotspot.id
    print(f"   -> Approving Hotspot #{hotspot_id} (Lat: {hotspot.latitude}, Lng: {hotspot.longitude})...")
    approve_res = client.post(f"/get/hotspots/{hotspot_id}/approve")
    print(f"   -> Approve response status: {approve_res.status_code}")
    assert approve_res.status_code == 200, f"Approve failed: {approve_res.text}"
    approved_bin = approve_res.json()
    print(f"   -> Hotspot #{hotspot_id} successfully converted to Dustbin #{approved_bin.get('dustbin_id')}")

    # -------------------------------------------------------------
    # TEST 4: Signup with Role & Instant Login
    # -------------------------------------------------------------
    print("\n[TEST 4] Testing Sign Up with Role Selection...")
    # Clean up test accounts if existing
    import random
    suffix = random.randint(1000, 9999)
    test_driver_email = f"test_driver_{suffix}@sih.com"
    signup_driver_res = client.post("/auth/signup", json={
        "name": f"Test Driver {suffix}",
        "email": test_driver_email,
        "password": "password123",
        "role": "driver"
    })
    print(f"   -> Signup Driver ({test_driver_email}): Status {signup_driver_res.status_code} | Role: {signup_driver_res.json().get('role')}")
    assert signup_driver_res.status_code == 201
    assert signup_driver_res.json().get("role") == "driver"

    test_server_email = f"test_server_{suffix}@sih.com"
    signup_server_res = client.post("/auth/signup", json={
        "name": f"Test Server {suffix}",
        "email": test_server_email,
        "password": "password123",
        "role": "server"
    })
    print(f"   -> Signup Server ({test_server_email}): Status {signup_server_res.status_code} | Role: {signup_server_res.json().get('role')}")
    assert signup_server_res.status_code == 201
    assert signup_server_res.json().get("role") == "server"

    print("\n" + "=" * 65)
    print("ALL TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
