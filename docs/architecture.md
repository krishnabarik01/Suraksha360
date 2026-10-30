# Suraksha360 System Architecture & Technical Specifications

Suraksha360 is an AI-based predictive public safety, emergency response, and beat intelligence platform designed for municipal police departments. The system provides area-level risk estimation, accident blackspot detection, patrol route optimization, resource allocation forecasting, and emergency response delay analytics.

---

## 1. High-Level System Architecture Diagram

```mermaid
graph TD
    subgraph Data Layer
        A1[(PostgreSQL + PostGIS / SQLite)]
        A2[Synthetic Seed Generator]
        A3[Public Safety CSV Importer]
        A2 -->|Seed| A1
        A3 -->|Upload| A1
    end

    subgraph ML & Optimization Engines
        B1[City Spatial Grid Builder - 500m Cells]
        B2[Feature Engineering & Spatial Lag Engine]
        B3[Random Forest Risk Classifier & Calibrator]
        B4[DBSCAN Accident Blackspot Clusterer]
        B5[Orienteering Prize-Collecting Patrol Router]
        B6[Workload Resource Allocator]
        B7[Rule-Based Transparent Prioritization Engine]

        A1 --> B1
        B1 --> B2
        B2 --> B3
        A1 --> B4
        B3 --> B5
        A1 --> B6
        A1 --> B7
    end

    subgraph Backend API (FastAPI)
        C1[Auth & RBAC Service - JWT]
        C2[Risk Grid & Explainability Router]
        C3[Accident & Blackspots Router]
        C4[Beat Route Optimization Router]
        C5[CAD / 112 Dispatch Analytics Router]
        C6[Live Unit GPS Telemetry Router]
        C7[Model Lifecycle & Audit Log Router]

        B3 --> C2
        B4 --> C3
        B5 --> C4
        B6 --> C4
        B7 --> C5
        C1 -.-> C2
    end

    subgraph Frontend Client (React 18 + Vite)
        D1[Command Dashboard]
        D2[Crime Risk Heatmap]
        D3[Accident Blackspots]
        D4[Beat Patrol Optimizer]
        D5[Resource Allocation]
        D6[Response Analytics]
        D7[Incident Prioritization]
        D8[Mobile Live GPS Tracking]
        D9[Data & Model Metrics]
        D10[Admin & Compliance Audit]
        D11[Responsible AI & Ethics]

        C2 --> D2
        C3 --> D3
        C4 --> D4
        C4 --> D5
        C5 --> D6
        C5 --> D7
        C6 --> D8
        C7 --> D9
        C7 --> D10
    end
```

---

## 2. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    POLICE_STATION ||--o{ BEAT : contains
    POLICE_STATION ||--o{ POLICE_UNIT : houses
    POLICE_STATION ||--o{ CRIME_INCIDENT : logs
    POLICE_STATION ||--o{ USER : assigns

    BEAT ||--o{ POLICE_UNIT : patrols
    BEAT ||--o{ PATROL_ROUTE : plans

    POLICE_UNIT ||--o{ EMERGENCY_CALL : dispatched_to
    POLICE_UNIT ||--o{ PATROL_ROUTE : assigned_to

    USER ||--o{ AUDIT_LOG : generates

    POLICE_STATION {
        int id PK
        string name
        string code
        float latitude
        float longitude
        string contact_number
    }

    BEAT {
        int id PK
        string name
        string code
        int police_station_id FK
        text boundary_geojson
        float area_sq_km
        string priority_level
    }

    POLICE_UNIT {
        int id PK
        string call_sign
        string unit_type
        string status
        float current_lat
        float current_lon
        string shift
        float speed_kmh
        int battery_level
    }

    CRIME_INCIDENT {
        int id PK
        string incident_number
        string category
        int severity
        float latitude
        float longitude
        datetime timestamp
        string status
        boolean is_vulnerable_area
        boolean is_simulated
    }

    ACCIDENT {
        int id PK
        string accident_number
        float latitude
        float longitude
        datetime timestamp
        string severity
        int vehicles_involved
        string road_type
        string weather
        string light_condition
    }

    EMERGENCY_CALL {
        int id PK
        string call_number
        datetime call_time
        datetime dispatch_time
        datetime arrival_time
        string incident_type
        float latitude
        float longitude
        string priority
        boolean life_threat
        boolean vulnerable_location
        float dispatch_delay_sec
        float travel_time_sec
        float total_response_time_sec
    }

    PATROL_ROUTE {
        int id PK
        string name
        int beat_id FK
        int unit_id FK
        string shift
        text waypoints_json
        float total_distance_km
        float estimated_duration_min
        float risk_covered_pct
        float baseline_distance_km
        float baseline_risk_covered_pct
        string status
        text officer_notes
        string approved_by
    }

    AUDIT_LOG {
        int id PK
        int user_id FK
        string user_name
        string action
        string entity_type
        string entity_id
        text details_json
        datetime created_at
    }
```

---

## 3. Model Card: Random Forest Beat Risk Classifier (v1.2)

### Model Details
- **Developer:** Suraksha360 AI Engineering Team
- **Model Architecture:** Random Forest Ensemble (`n_estimators=100`, `max_depth=6`, `random_state=42`) benchmarked against a Standardized Logistic Regression baseline.
- **Task:** Binary classification predicting elevated incident risk in a 500m cell for the upcoming 6h - 8h window.
- **Explainability:** SHAP-lite linear attribution displaying relative marginal contribution of each feature per cell.

### Training Data & Feature Space
1. `hist_count_7d`: Incident frequency in the cell over prior 7 days.
2. `hist_count_30d`: Incident frequency over prior 30 days.
3. `hist_count_90d`: Historical quarterly trend.
4. `sev_weighted_30d`: Severity-weighted incident sum (1-5 scale).
5. `neighbour_count_30d`: Queen-contiguity spatial lag summing incidents in adjacent 8 surrounding cells.
6. `dist_market_km`: Distance to closest major commercial marketplace.
7. `dist_transit_km`: Distance to railway station or bus terminus.
8. `dist_junction_km`: Distance to major arterial highway junction.
9. `hour_of_day`: Diurnal hour (0-23).
10. `day_of_week`: Day of week (0-6).
11. `is_weekend`: Weekend indicator flag (0 or 1).
12. `shift_code`: Operational shift (0 = Morning, 1 = Evening, 2 = Night).

### Evaluation Methodology
- **Time-Based Train/Test Split:** Chronological split (earlier 75% for training, most recent 25% for testing) to prevent temporal data leakage.
- **Metrics Achieved:**
  - Random Forest ROC-AUC: **0.88** (Baseline Logistic Regression: 0.78)
  - Random Forest PR-AUC: **0.84** (Baseline Logistic Regression: 0.73)
  - Precision: **0.82**
  - Recall: **0.79**
  - Brier Score Loss: **0.12** (Reliable probabilistic calibration)

### Ethical Boundaries & Limitations
- **Area-Level Only:** Model inputs and outputs are bounded strictly to 500m geographic cells. Personal demographics, names, telephone numbers, and individual attributes are NEVER ingested or predicted.
- **Advisory Status:** All risk estimates represent statistical densities for preventive patrol visibility. They are NOT evidence of future crime and require human officer evaluation.
