# Suraksha360 REST API Specification

Base URL: `/api/v1`  
Interactive OpenAPI Documentation: `http://localhost:8000/api/v1/docs`  
Redoc Documentation: `http://localhost:8000/api/v1/redoc`

---

## 1. Authentication (`/auth`)

### `POST /auth/login-json`
Authenticates an officer and returns a JWT access token.
- **Request Body:**
  ```json
  { "username": "admin", "password": "admin123" }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@cgpolice.gov.in",
      "full_name": "Dr. Alok Verma (Superintendent of Police)",
      "role": "Admin",
      "badge_number": "IPS-CG-2012-08"
    }
  }
  ```

### `GET /auth/me`
Returns the currently authenticated officer profile. Header: `Authorization: Bearer <token>`.

---

## 2. Command Dashboard (`/dashboard`)

### `GET /dashboard/summary`
Returns aggregate KPI counts, live 24h incidents, active unit markers, and diurnal trend charts.

---

## 3. Crime Risk Estimation (`/risk`)

### `GET /risk/grid`
Returns a GeoJSON FeatureCollection of 500m cells with risk scores (0-1.0), risk buckets (`Low`, `Medium`, `High`, `Very High`), and top contributing features.
- **Query Parameters:**
  - `time_window` (string, default: `next_6h`)
  - `shift` (string, default: `Morning`)
  - `category` (string, optional: `Vehicle Theft`, `Burglary`, etc.)

### `GET /risk/explain/{cell_id}`
Returns feature-by-feature explainable contributions (SHAP-lite) and rule-based patrol recommendations for a specific grid cell.

---

## 4. Accident Hotspots (`/accidents`)

### `GET /accidents`
Lists historical traffic collision records with filters for `severity` and `road_type`.

### `GET /accidents/hotspots`
Runs DBSCAN spatial density clustering on accident coordinates weighted by severity (Fatal = 5x, Major = 3x, Minor = 1x). Returns ranked blackspots with predominant road/lighting conditions and rule-based preventive suggestions.

---

## 5. Beat Route Optimization (`/routes`)

### `POST /routes/optimize`
Computes an optimal patrol route within a beat using prize-collecting orienteering and 2-opt refinement.
- **Request Body:**
  ```json
  {
    "beat_id": 1,
    "shift": "Morning",
    "unit_type": "PCR Van",
    "max_duration_min": 240,
    "must_visit_points": [],
    "no_go_areas": []
  }
  ```
- **Response (200 OK):** Returns ordered waypoints, total distance, duration, risk coverage %, and baseline comparison.

### `POST /routes/{id}/override`
Allows an officer to accept, edit waypoints, or reject an algorithmic route with logged notes.

### `GET /routes/resource-allocation`
Calculates recommended patrol units per beat and shift compared against current allocations.

---

## 6. Live Unit Telemetry (`/units`)

### `GET /units`
Returns current GPS coordinates, status, speed, and battery of all police units.

### `POST /units/{id}/location`
Receives live smartphone GPS coordinates or simulator pings to update unit position in real time.
- **Request Body:**
  ```json
  {
    "latitude": 21.2497,
    "longitude": 81.6335,
    "speed_kmh": 32.5,
    "status": "On Patrol",
    "battery_level": 88
  }
  ```

---

## 7. Emergency Response Analytics (`/dispatch`)

### `GET /dispatch/analytics`
Computes average dispatch delay, travel time, total response time, and target compliance rate against a target SLA (e.g. 10.0 min).

### `GET /dispatch/delay-zones`
Returns geographic clusters of recurrent delays with primary delay factors (e.g., railway level-crossings, highway bottlenecks).

---

## 8. Incident Prioritization (`/prioritization`)

### `POST /prioritization/rank`
Ranks an intake queue of incidents using transparent scoring: Severity (30%) + Life Threat (35%) + Vulnerable Area (15%) + Queue Wait (20%).
- **Response (200 OK):** Returns ordered incidents with priority badge (`Critical`, `High`, `Medium`, `Low`), score (0-100), and a visible "Why this rank" sentence with factor breakdowns.

### `GET /prioritization/config` & `PUT /prioritization/config`
Retrieves and updates dispatch scoring weights (Admin only, logged in audit trail).

---

## 9. Model Governance & Audit (`/models`, `/audit-logs`)

### `GET /models/metrics`
Returns precision, recall, ROC-AUC, PR-AUC, calibration curve bins, and feature importances for Random Forest vs Logistic Regression baseline.

### `POST /models/retrain`
Retrains the risk model on all current database incidents and records an audit log entry.

### `GET /audit-logs`
Returns the compliance audit log trail of all route overrides, policy changes, and dataset imports.
