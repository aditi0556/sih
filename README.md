# Cleanix — Smart Municipal Waste Management & Dynamic Vehicle Routing Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![Google OR-Tools](https://img.shields.io/badge/Google_OR--Tools-CVRP_Solver-4285F4.svg?style=flat&logo=google&logoColor=white)](https://developers.google.com/optimization)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-336791.svg?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-Leaflet_GIS-7EBC6F.svg?style=flat&logo=openstreetmap&logoColor=white)](https://www.openstreetmap.org/)

![Cleanix Platform Preview](cleanix_preview.png)

---

## Overview

Cleanix is an AI-driven municipal solid waste management platform designed to eliminate overflowing bins, optimize collection vehicle fuel consumption, and provide a unified ground-truth feedback loop between administrators, collection drivers, and field survey teams.

Instead of running fixed, static truck schedules, Cleanix uses Machine Learning fill-level forecasts combined with Google OR-Tools Capacitated Vehicle Routing Problem (CVRP) optimization to dynamically compute fuel-efficient, sequence-ordered collection routes every morning.

---

## Key Capabilities & Role Portals

```
                         +-------------------------------------+
                         |          CLEANIX PLATFORM           |
                         +------------------+------------------+
                                            |
         +----------------------------------+----------------------------------+
         |                                  |                                  |
         v                                  v                                  v
+------------------+               +------------------+               +------------------+
|   ADMIN PORTAL   |               |  DRIVER PORTAL   |               |  SURVEY PORTAL   |
|     (/admin)     |               |     (/driver)    |               |     (/survey)    |
+------------------+               +------------------+               +------------------+
|* City-wide map   |               |* Isolated route  |               |* Weekly audits   |
|* ML fill model   |               |* Stop sequence   |               |* Fill levels     |
|* OR-Tools CVRP   |               |* OSRM Navigation |               |* Hotspot audits  |
|* Hotspot approve |               |* Pinpoint Hotspot|               |* Live sync       |
+------------------+               +------------------+               +------------------+
```

### 1. Municipal Admin Command Center (`/admin`)
* **GIS Map Interface**: Real-time OpenStreetMap visualization of all city dustbins, fill percentages, and reported waste hotspots.
* **1-Click ML Prediction**: Runs daily fill forecasts across all commercial, residential, and industrial bins.
* **OR-Tools Route Optimization**: Clusters bins via Uber H3 spatial indexing and solves the multi-vehicle CVRP, automatically assigning sequential stops (`#1`, `#2`...) and persisting them to the database.
* **Hotspot Approval**: Promotes verified ground hotspots into permanent municipal dustbins in one click.

### 2. Collection Driver Portal (`/driver`)
* **Privacy & Isolation**: Drivers only see their own assigned vehicle, collection sequence, and turn-by-turn route. Access to other drivers' routes is strictly blocked (`403 Forbidden`).
* **Turn-by-Turn Path**: Visualizes the round-trip route (`Depot -> Stop #1 -> Stop #2 -> Depot`) with one-click deep links to Google Maps.
* **Pinpoint Hotspot Reporting**: Drivers can switch into pinpoint mode, click anywhere on the live map to drop a pin, specify severity, and save the hotspot directly to the municipal database.

### 3. Survey Team & Field Audit Portal (`/survey`)
* **Weekly Audit Schedule**: Automatically distributes dustbins and hotspots across field survey staff.
* **Ground-Truth Calibration**: Surveyors measure actual ultrasonic fill percentages and verify whether reported hotspots are dirty or cleaned.
* **Instant Hotspot Sync**: New hotspots reported by drivers on the road appear immediately on the Survey Dashboard for verification.

---

## Architecture & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Municipal Admin
    actor Driver as Truck Driver
    actor Surveyor as Survey Team
    participant ML as ML Prediction Engine
    participant ORTools as Google OR-Tools CVRP
    participant DB as Database (PostgreSQL / SQLite)
    participant OSRM as OpenStreetMap / OSRM

    Admin->>ML: Trigger Daily Fill Prediction
    ML->>DB: Store predictions in daily_predictions
    Admin->>ORTools: Trigger Route Optimization
    ORTools->>DB: Fetch pending bins & truck capacities
    ORTools->>DB: Save per-truck routes (truck_id, sequence_number) in routes
    
    Driver->>DB: GET /api/drivers/me/route
    DB-->>Driver: Return assigned stops ordered by sequence_number
    Driver->>OSRM: Render live polyline & stop navigation
    
    Driver->>DB: POST /get/hotspots (Pinpoint Hotspot on Map)
    DB-->>Surveyor: Auto-sync new hotspot to active weekly survey
    Surveyor->>DB: POST /api/survey/update-hotspot-presence
    
    Admin->>DB: POST /get/hotspots/{id}/approve
    DB-->>Admin: Promote hotspot to permanent Dustbin in database
```

---

## Technology Stack

| Layer | Technologies | Description |
| :--- | :--- | :--- |
| **Backend Framework** | FastAPI (Python 3.10+) | High-performance asynchronous REST API with automatic OpenAPI documentation. |
| **Routing Engine** | Google OR-Tools CVRP | Capacitated Vehicle Routing Problem solver with distance matrix and capacity constraints. |
| **Spatial Indexing** | Uber H3 & Haversine | Hexagonal spatial clustering for bin partitioning. |
| **Database & ORM** | PostgreSQL + SQLAlchemy 2.0 | Fallback to SQLite (`sih.db`) when local PostgreSQL is unavailable. |
| **Frontend UI** | React 19 + Vite + Tailwind CSS | Fast client build with role-guarded routing and dark theme. |
| **Mapping & GIS** | Leaflet.js + OpenStreetMap + OSRM | Standardized tile layers, bounds locking for Mangaluru, and custom SVG markers. |
| **Authentication** | JWT HTTP-only Cookies | Secure, role-isolated session management for Admin, Driver, and Survey roles. |

---

## Quickstart & Setup Guide

### 1. Clone Repository & Setup Virtual Environment

```bash
git clone https://github.com/aditi0556/sih.git Cleanix
cd Cleanix

# Setup Python Virtual Environment
py -3 -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux / macOS:
source venv/bin/activate
```

### 2. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure Environment Variables (`backend/.env`)

```ini
JWT_SECRET=cleanix-super-secure-random-jwt-key-2026
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080

# PostgreSQL connection (or leave default to automatically fallback to local SQLite sih.db)
DATABASE_URL=postgresql://postgres:124421@localhost:5432/sih

FRONTEND_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
```

### 4. Seed Database

```bash
# Seed initial users, trucks, dustbins, hotspots, predictions, and survey schedule
py -3 seed.py
```

### 5. Install Frontend Dependencies & Start Servers

```bash
# In backend terminal:
cd backend
py -3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# In a new terminal (frontend):
cd frontend
npm install
npm run dev
```

---

## Default Test Credentials

All demo accounts come pre-configured for instant 1-click testing on the [Login Page](http://localhost:5173/login):

| Role Portal | Email | Password | Assigned Permissions |
| :--- | :--- | :--- | :--- |
| **Admin Portal** | `admin@sih.com` | `admin123` | Full municipal control, ML trigger, OR-Tools optimizer, hotspot approval. |
| **Driver Portal** (Driver 1) | `arjun@sih.com` | `driver123` | Truck #1 (`KA19AB1234`), personal collection route, pinpoint hotspot reporting. |
| **Driver Portal** (Driver 2) | `rahul@sih.com` | `driver123` | Truck #2 (`KA19CD5678`), personal collection route, pinpoint hotspot reporting. |
| **Survey Team** | `survey@sih.com` | `survey123` | Weekly dustbin fill audits, hotspot verification, audit log submission. |

---

## REST API Reference

### Authentication & Profiles
* `POST /auth/login` — Sign in and receive HTTP-only session cookie.
* `POST /auth/signup` — Register with role selection (`driver`, `survey`, `admin`).
* `POST /auth/logout` — Invalidate session cookie.
* `GET /auth/session` — Get authenticated user details and active role.

### Optimization & Routing
* `POST /predict-dustbin-fill` — Run ML model to forecast daily fill percentage for all bins.
* `POST /routing/optimize` — Run Google OR-Tools CVRP solver and persist sequential stops to `routes` table.
* `GET /routing/routes` — Retrieve all computed routes for a specific target date.
* `GET /api/drivers/me/route` — Retrieve isolated collection route for the authenticated driver.

### Hotspots & Field Reports
* `GET /get/hotspots` — List all active waste hotspots.
* `POST /get/hotspots` — Driver/Staff map pin dropper to report a new hotspot.
* `POST /get/hotspots/{id}/approve` — Admin promotes hotspot to permanent municipal dustbin.

### Survey & Auditing
* `GET /api/survey/schedule` — Get weekly survey audit assignments and active hotspots.
* `POST /api/survey/update-dustbin-fill` — Submit ground-truth fill measurement.
* `POST /api/survey/update-hotspot-presence` — Verify whether a hotspot is dirty or cleaned.
* `GET /api/survey/logs` — Query historical field inspection audit logs.

---

## Automated Verification Suite

Run the full end-to-end test suite anytime:

```bash
# Run security isolation, hotspot approval, and auth tests
py -3 backend/verify_security_and_features.py

# Run complete ML prediction + OR-Tools + Driver routing verification
py -3 backend/verify_pipeline.py
```

---

## License
Cleanix is developed for Smart City Municipal Solid Waste Management. Open-source under the [MIT License](LICENSE).
