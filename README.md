# 🛡️ GarudaBeat: AI-Based Predictive Public-Safety, Emergency Response and Beat Intelligence System

> **Jurisdiction Demo:** Raipur Urban District, Chhattisgarh Police  
> **Operational Status:** Runnable Prototype with Dual-Mode Storage (SQLite Out-of-the-Box / PostgreSQL + PostGIS via Docker)  
> **Constitutional AI Mandate:** Strictly area-level statistical risk estimation ($500\text{m}$ cells). Predictions are advisory decision-support only and NEVER constitute proof of future crime. **No individual profiling, face recognition, or suspect scoring is permitted. A human officer always decides.**

---

## 🌟 Executive Summary & Capabilities

GarudaBeat equips modern police control rooms and beat officers with real-time predictive intelligence:

1. **Location-Based Risk Estimation:** Divides the city into $500\text{m}$ spatial cells. Predicts upcoming 6-hour risk levels using Random Forest ensembles calibrated against a Logistic Regression baseline, complete with SHAP-lite feature attribution explaining *why* an area has elevated risk.
2. **Accident Blackspot Detection:** Uses DBSCAN density clustering on historical traffic crashes, weighted by severity (Fatal = 5x, Major = 3x, Minor = 1x), generating rule-based road engineering and interceptor patrol recommendations.
3. **Beat / Patrol Route Optimization:** Employs prize-collecting orienteering algorithms and 2-opt heuristics to design optimal patrol routes that maximize risk coverage under shift time budgets, comparing directly against traditional perimeter baseline loops.
4. **Patrol Resource Allocation Support:** Recommends patrol unit counts (PCR Vans vs Motorbikes) per beat and shift based on area size, recent crime density, and nocturnal surge factors.
5. **Emergency Response Analytics:** Evaluates CAD dispatch delays and transit times across Raipur, pinpointing infrastructural bottlenecks (e.g., level crossings, congested markets) against a 10-minute SLA.
6. **Transparent Incident Prioritization:** Ranks incoming 112 emergency calls using an explainable point formula: Severity (30%) + Life Threat (35%) + Vulnerable Area (15%) + Queue Wait (20%), complete with configurable policy weights.
7. **Live GPS Unit Telemetry:** Mobile-friendly telemetry endpoint accepting browser Geolocation API pings alongside a simulated patrol drive for desktop demonstration.
8. **Compliance Audit Logging:** Immutably records every human override, route approval, rejection, and policy change.

---

## 🏗️ Tech Stack

- **Backend:** Python 3.11, FastAPI, SQLAlchemy 2.0, GeoAlchemy2, Pydantic v2, Uvicorn
- **Machine Learning & Optimization:** Scikit-Learn (Random Forest, Logistic Regression, DBSCAN, Calibration), Pandas, NumPy, SciPy, Shapely, 2-Opt TSP Heuristics
- **Database:** Dual-mode engine supporting SQLite (zero-setup local run) and PostgreSQL 15 + PostGIS (Docker Compose)
- **Frontend:** React 18, Vite, React-Leaflet, OpenStreetMap tiles, Leaflet heat styling, Recharts, Tailwind CSS, Lucide Icons, React Router v6
- **Security & RBAC:** JWT bearer tokens (HMAC-SHA256), multi-round bcrypt password hashing, role-based route guards

---

## 📂 Project Structure

```
project 2/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application & lifespan setup
│   │   ├── config.py                   # Pydantic v2 settings & Raipur bounds
│   │   ├── db.py                       # SQLAlchemy engine & session factory
│   │   ├── models/                     # Database models (User, Beat, Unit, Incident, etc.)
│   │   ├── schemas/                    # Pydantic validation schemas
│   │   ├── routers/                    # 12 REST API routers
│   │   ├── services/                   # Auth, Prioritization, and Audit services
│   │   ├── ml/                         # GridBuilder, RiskModel, Blackspots, ResponseAnalytics
│   │   ├── optimization/               # PatrolRouter (Orienteering + 2-opt), ResourceAllocator
│   │   └── seed/                       # Raipur synthetic generator & DB seeder
│   ├── tests/                          # 8 Pytest unit tests (Auth, ML, Routing, Rules)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/client.js               # Axios client for all API endpoints
│   │   ├── context/AuthContext.jsx     # Session, JWT, and quick role switch
│   │   ├── components/                 # DisclaimerBanner, SimulatedBadge, Navbar, Sidebar
│   │   └── pages/                      # 12 interactive UI pages
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
├── data/
│   ├── sample_csvs/                    # Sample CSV files for import testing
│   └── data_dictionary.md              # Complete schema and privacy data dictionary
├── docs/
│   ├── architecture.md                 # Mermaid architecture & ER diagrams, Model Card
│   ├── responsible_ai.md               # Ethics, anti-profiling, and feedback-loop mitigations
│   └── api.md                          # REST API specification
├── docker-compose.yml                  # Multi-container orchestration (DB + API + Web)
└── README.md
```

---

## 🚀 Quick Start Guide

### Option A: One-Command Startup with Docker (Recommended)

Requires Docker & Docker Compose:

```bash
docker-compose up --build
```

- **Frontend Application:** `http://localhost:5173`
- **FastAPI Documentation:** `http://localhost:8000/api/v1/docs`
- **PostGIS Database:** `localhost:5432`

---

### Option B: Local Manual Setup (Zero Docker Required)

#### 1. Backend Setup (Python 3.11)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Populate realistic simulated dataset for Raipur, Chhattisgarh
python -m app.seed.seed_db

# Run unit tests
python -m pytest tests

# Start FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be live at `http://127.0.0.1:8000` with Swagger UI at `http://127.0.0.1:8000/api/v1/docs`.

#### 2. Frontend Setup (Node.js 18+)

In a separate terminal:

```bash
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```

Frontend will be accessible at `http://localhost:5173`.

---

### Option C: Production Cloud Deployment (Render Backend + Vercel Frontend)

#### 1. Backend on Render (Web Service or Blueprint)
- **Automatic Blueprint:** Link your repository and Render will automatically detect `render.yaml`.
- **Manual Setup on Render:**
  1. Click **New +** $\rightarrow$ **Web Service**.
  2. Select your repository.
  3. Set **Root Directory:** `backend`
  4. Set **Runtime:** `Python 3`
  5. Set **Build Command:** `pip install -r requirements.txt`
  6. Set **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  7. Under **Environment Variables**, add:
     - `PYTHON_VERSION`: `3.11.9`
     - `DATABASE_URL`: `sqlite:///./safecity.db` (or your Render PostgreSQL internal connection string)
     - `SECRET_KEY`: any strong random string
  8. Click **Deploy Web Service**.
  *(The backend automatically creates tables, seeds the demo dataset, and pre-trains the risk models on startup!)*

#### 2. Frontend on Vercel
1. Go to [Vercel Dashboard](https://vercel.com/) $\rightarrow$ **Add New Project** $\rightarrow$ Import your repo.
2. In the project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend` (click Edit and select `frontend`)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://your-backend-service.onrender.com/api/v1`
4. Click **Deploy**.
   *(SPA routing is handled automatically by `vercel.json` rewrites).*

---

## 🔐 Demo Credentials (One-Click Role Switch)

The login screen features a 1-click credential selector for effortless role evaluation:

| Role | Username | Password | Operational Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | System configuration, rule weights, audit inspection |
| **Control Room Officer** | `control_room` | `control123` | 112 dispatch queue, live tracking, delay analytics |
| **Beat Officer** | `beat_officer` | `beat123` | Route optimization, human acceptance/rejection, mobile GPS |
| **Analyst** | `analyst` | `analyst123` | Model metrics, CSV importing, risk calibration curves |

---

## 🧪 Comprehensive Demo Script (Step-by-Step Walkthrough)

Follow this 10-step sequence to verify the end-to-end capabilities of the prototype:

1. **Login & Role Switch:** Navigate to `http://localhost:5173`. Click the **"Superintendent of Police (Admin)"** quick-selector button and click **"Authenticate Session"**.
2. **Command Dashboard (`/`):**
   - Review live KPIs: Incidents Today, Active Patrol Units, Average 112 Response Time, and High-Risk Zones.
   - Inspect the Raipur Command Map showing live unit positions, recent incident clusters, and beat boundaries.
   - Observe the 24-hour Diurnal Incident Pattern and Category breakdown charts.
3. **Crime Risk Heatmap (`/risk`):**
   - Toggle between **Crime Risk Grid**, **Accident Density**, and **Combined Vulnerability**.
   - Change the shift to **Night Shift** or forecast horizon to **Weekend**.
   - Click on any 500m grid cell (e.g. near Jaistambh Chowk or Railway Station) to open the **Explainable Cell Intelligence** drawer.
   - Inspect the SHAP-lite feature contributions showing *why* the cell has elevated risk alongside the mandatory Responsible AI disclaimer banner.
4. **Accident Blackspots (`/accidents`):**
   - Inspect DBSCAN-clustered blackspots sized by weighted severity.
   - Click **#1 Tatibandh Ring Road Cloverleaf** to view crash statistics (fatal, major) and rule-based engineering suggestions (rumble strips, interceptor camera, high-mast lighting).
5. **Beat Patrol Optimizer (`/routes`):**
   - Select **Kotwali Beat 1**, set shift to **Morning**, and click **"Generate Optimal Patrol Route"**.
   - Watch the orienteering algorithm construct an ordered polyline route with numbered waypoints.
   - Compare the **Risk Coverage Efficiency** (e.g. 84.5% vs 48.2% baseline perimeter loop).
   - Enter officer notes: `"Approved for morning market vigilance"` and click **"Accept Route"**.
   - Notice the status change to **Approved** with audit confirmation.
6. **Resource Allocation (`/resources`):**
   - Switch between **Morning**, **Evening**, and **Night** shifts.
   - Observe recommended PCR Van and Motorbike allocations dynamically scale to meet nocturnal risk spikes.
7. **Emergency Response Analytics (`/dispatch`):**
   - Inspect the **Recurring Delay Zones** map (identifying Fafadih railway crossing and Sadar choke points).
   - Review the stacked bar chart decomposing total response time into **Dispatch Delay** vs **Transit Travel Time**.
8. **Incident Prioritization Queue (`/prioritization`):**
   - Inspect the ranked emergency calls with transparent points breakdown.
   - Click **"Threat: NO"** on an incident to toggle life threat to **"YES"**, and watch the incident immediately escalate to **CRITICAL #1** rank with updated "Why this rank" justification.
   - Click **"Config Weights"** to adjust rule parameters.
9. **Live Unit GPS Tracking (`/tracking`):**
   - Switch to **Mobile GPS Transmitter** on the right side.
   - Click **"Simulate Live Patrol Drive"** to watch the unit drive along Raipur streets with real-time speed and coordinate updates every 3 seconds.
   - On a mobile browser, click **"Start Phone GPS Broadcast"** to stream device GPS via the browser Geolocation API.
10. **Data & Models (`/models`) & Admin Settings (`/admin`):**
    - View Random Forest ROC-AUC (0.88), PR-AUC (0.84), calibration reliability curve, and feature importances.
    - Click **"Retrain on Active Database"** to execute live retraining and log an audit entry.
    - Navigate to `/admin` to view the **Audit Log & Accountability Trail** verifying all actions taken during the test.

---

## ⚖️ Responsible AI, Privacy & Citizen Hotline (Dial 112)

- **Strictly Area-Level:** Operates exclusively at $500\text{m}$ cell resolution. No individual suspects or citizens are scored.
- **Dial 112 Priority:** Citizens in distress dial **112**. The web platform is strictly an internal decision-support tool for sworn officers and never asks citizens to submit web forms during an emergency.
- **Phone Number Hashing:** Ingested telephone numbers are converted into one-way cryptographic hashes (`caller_phone_hash`) using SHA-256.
- **Human Authority:** Algorithmic recommendations require officer approval before deployment, and all decisions are recorded in compliance logs.

---

## 🧪 Unit Testing

Run the automated backend test suite:

```bash
cd backend
python -m pytest tests
```

Output: `8 passed in 5.02s` covering JWT authentication, ML grid predictions, orienteering 2-opt route optimization, transparent factor scoring, and human overrides.
#   S u r a k s h a 3 6 0  
 