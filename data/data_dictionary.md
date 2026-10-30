# GarudaBeat: Public Safety & Beat Intelligence Data Dictionary

This document details the data schemas, field definitions, coordinate systems, and constraints utilized across the GarudaBeat platform. All default demo data represents realistic synthetic simulations for Raipur, Chhattisgarh (WGS-84, EPSG:4326).

---

## 1. `crime_incidents` (Historical & Reported Incidents)

Records geo-located public safety incidents used to compute temporal crime density, cell-level risk scores, and prioritization rankings.

| Field Name | Type | Description | Allowed Values / Format | Privacy / Anonymity |
| :--- | :--- | :--- | :--- | :--- |
| `id` | Integer (PK) | Primary internal database identifier | Auto-incrementing int | System internal |
| `incident_number` | String(50) | Official station diary incident reference | e.g. `CR-RPR-202610-0012` | Public identifier |
| `category` | String(50) | Broad offense categorization | `Vehicle Theft`, `Theft`, `Burglary`, `Assault`, `Robbery`, `Vandalism`, `Public Nuisance`, `Narcotics` | General category |
| `severity` | Integer | Incident severity rating (1 = lowest, 5 = highest) | 1, 2, 3, 4, 5 | Standard grading |
| `latitude` | Float (WGS84) | Incident latitude in decimal degrees | 21.1800 to 21.3200 (Raipur) | Rounded to 6 decimals |
| `longitude` | Float (WGS84) | Incident longitude in decimal degrees | 81.5600 to 81.7100 (Raipur) | Rounded to 6 decimals |
| `timestamp` | DateTime | Timestamp when the offense occurred or was reported | ISO 8601 UTC timestamp | Temporal reference |
| `police_station_id` | Integer (FK) | Reference to responsible police station | Foreign key -> `police_stations.id` | Jurisdiction mapping |
| `status` | String(30) | Current case investigation status | `Reported`, `Under Investigation`, `Resolved`, `Closed` | Operational status |
| `is_vulnerable_area` | Boolean | Flag indicating low-lighting, transit cut, or isolated terrain | `True`, `False` | Sector property |
| `is_simulated` | Boolean | Demarcation for synthetic demo data vs real imports | `True` (default) | Data provenance flag |

*Note: No personal names, telephone numbers, Aadhaar IDs, or demographic markers are recorded.*

---

## 2. `accidents` (Traffic Accidents & Blackspot Clustering)

Used by the DBSCAN density clustering module to identify high-risk blackspots and recommend road safety interventions.

| Field Name | Type | Description | Allowed Values / Format |
| :--- | :--- | :--- | :--- |
| `id` | Integer (PK) | Unique crash event identifier | Auto-incrementing int |
| `accident_number` | String(50) | Traffic crash report identifier | e.g. `ACC-RPR-202610-0004` |
| `latitude` | Float (WGS84) | Crash location latitude | 21.1800 to 21.3200 |
| `longitude` | Float (WGS84) | Crash location longitude | 81.5600 to 81.7100 |
| `timestamp` | DateTime | Exact time of collision | ISO 8601 UTC |
| `severity` | String(30) | Medical severity outcome | `minor` (weight: 1.0), `major` (weight: 3.0), `fatal` (weight: 5.0) |
| `vehicles_involved` | Integer | Count of vehicles in collision | 1, 2, 3+ |
| `road_type` | String(50) | Road classification | `City Arterial`, `National Highway`, `Junction`, `Flyover`, `Internal Road` |
| `weather` | String(50) | Weather condition at time of crash | `Clear`, `Rain`, `Fog`, `Dust` |
| `light_condition` | String(50) | Ambient lighting status | `Daylight`, `Dusk/Dawn`, `Dark - Lit`, `Dark - Unlit` |
| `is_simulated` | Boolean | Synthetic indicator | `True` |

---

## 3. `police_units` (Live Fleet & Patrol Telemetry)

Tracks vehicles and officers deployed in the field for real-time dispatch and GPS tracking.

| Field Name | Type | Description | Allowed Values / Format |
| :--- | :--- | :--- | :--- |
| `id` | Integer (PK) | Unit record identifier | Auto-incrementing int |
| `call_sign` | String(50) | Radio call sign | e.g. `PCR-01 (Kotwali)`, `MOTO-01 (Sadar)` |
| `unit_type` | String(50) | Tactical vehicle classification | `PCR Van`, `Motorbike Patrol`, `Foot Patrol`, `Quick Response Team` |
| `status` | String(30) | Operational status | `Available`, `On Patrol`, `Dispatched`, `Busy`, `Off Duty` |
| `current_lat` | Float | Current live latitude | Updated every 3-5 seconds |
| `current_lon` | Float | Current live longitude | Updated every 3-5 seconds |
| `shift` | String(20) | Assigned working shift | `Morning` (06:00-14:00), `Evening` (14:00-22:00), `Night` (22:00-06:00) |
| `speed_kmh` | Float | Current GPS transit speed | 0.0 to 120.0 km/h |
| `battery_level` | Integer | Mobile device battery percentage | 0 to 100% |

---

## 4. `emergency_calls` (CAD / 112 Dispatch Records)

Used to analyze dispatch delays, travel times, and recurring infrastructural choke points.

| Field Name | Type | Description | Allowed Values / Format |
| :--- | :--- | :--- | :--- |
| `id` | Integer (PK) | Primary dispatch identifier | Auto-incrementing int |
| `call_number` | String(50) | Computer Aided Dispatch (CAD) call token | e.g. `112-RPR-202610-0042` |
| `call_time` | DateTime | Timestamp citizen dialed 112 | ISO 8601 UTC |
| `dispatch_time` | DateTime | Timestamp unit was radio-assigned | ISO 8601 UTC |
| `arrival_time` | DateTime | Timestamp unit marked on-scene | ISO 8601 UTC |
| `incident_type` | String(50) | Nature of emergency | e.g. `Vehicle Collision with Injury`, `Armed Robbery` |
| `priority` | String(20) | Dispatch urgency grade | `Critical`, `High`, `Medium`, `Low` |
| `life_threat` | Boolean | Immediate threat to human life | `True`, `False` |
| `vulnerable_location` | Boolean | Remote, poorly-lit, or high-risk zone | `True`, `False` |
| `caller_phone_hash` | String(64) | SHA-256 one-way hash of caller phone | e.g. `a3f89...` (non-reversible) |
| `dispatch_delay_sec` | Float | Dispatch delay in seconds (`dispatch_time - call_time`) | Numeric float |
| `travel_time_sec` | Float | Transit travel time (`arrival_time - dispatch_time`) | Numeric float |
| `total_response_time_sec`| Float | Total response duration (`dispatch_delay + travel_time`)| Numeric float |

---

## 5. `patrol_routes` (Optimized Orienteering Patrols)

Stores algorithmic patrol routes and human-in-the-loop decisions.

| Field Name | Type | Description | Allowed Values / Format |
| :--- | :--- | :--- | :--- |
| `id` | Integer (PK) | Unique route plan ID | Auto-incrementing int |
| `name` | String(100) | Patrol plan title | e.g. `Optimized Beat Patrol: Kotwali Beat 1 (Morning)` |
| `beat_id` | Integer (FK) | Assigned beat | Foreign key -> `beats.id` |
| `waypoints_json` | Text (JSON) | Ordered checkpoints array with lat/lon, halts, notes | JSON formatted list |
| `total_distance_km`| Float | Total distance in kilometers | e.g. 14.8 km |
| `estimated_duration_min`| Float | Estimated duration in minutes | e.g. 210.0 min |
| `risk_covered_pct` | Float | Percentage of beat risk density covered | e.g. 84.5% |
| `baseline_risk_covered_pct`| Float | Coverage of un-optimized perimeter loop | e.g. 48.2% |
| `status` | String(30) | Human review status | `Recommended`, `Approved`, `Modified`, `Rejected` |
| `officer_notes` | Text | Justification or comments logged by officer | Free text |
| `approved_by` | String(100) | Name of reviewing officer | Officer name / badge |
