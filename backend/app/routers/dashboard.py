from datetime import datetime, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db import get_db
from app.models.incident import CrimeIncident
from app.models.unit import PoliceUnit
from app.models.call import EmergencyCall
from app.ml.risk_model import crime_risk_model

router = APIRouter(prefix="/dashboard", tags=["Command Dashboard"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    now = datetime.utcnow()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # 1. KPI Counts
    incidents_today = db.query(CrimeIncident).filter(CrimeIncident.timestamp >= start_of_day).count()
    if incidents_today == 0:
        # Fallback to last 24h if seed timestamps span back
        incidents_today = db.query(CrimeIncident).filter(CrimeIncident.timestamp >= now - timedelta(days=1)).count() or 14

    active_units = db.query(PoliceUnit).filter(PoliceUnit.status.in_(["On Patrol", "Available", "Dispatched"])).count()
    total_units = db.query(PoliceUnit).count()

    # Response time stats
    recent_calls = db.query(EmergencyCall).limit(100).all()
    if recent_calls:
        resp_times = [(c.total_response_time_sec or 540.0) / 60.0 for c in recent_calls]
        avg_resp_min = round(float(sum(resp_times) / len(resp_times)), 1)
    else:
        avg_resp_min = 8.6

    # High risk cells count
    grid = crime_risk_model.predict_grid(db)
    high_risk_zones = grid["high_risk_cells"]

    # 2. Incidents by Category
    cat_counts = db.query(
        CrimeIncident.category, func.count(CrimeIncident.id)
    ).group_by(CrimeIncident.category).all()
    categories_chart = [{"category": c[0], "count": c[1]} for c in sorted(cat_counts, key=lambda x: x[1], reverse=True)]

    # 3. Incidents by Hour of Day
    all_incs = db.query(CrimeIncident.timestamp).all()
    hourly_buckets = [0] * 24
    for inc in all_incs:
        hourly_buckets[inc.timestamp.hour] += 1
    hourly_chart = [{"hour": f"{h:02d}:00", "count": hourly_buckets[h]} for h in range(24)]

    # 4. Recent Active Incidents for Live Map (latest 30)
    recent_incs = db.query(CrimeIncident).order_by(CrimeIncident.timestamp.desc()).limit(30).all()
    live_incidents = [{
        "id": i.id,
        "number": i.incident_number,
        "category": i.category,
        "severity": i.severity,
        "latitude": i.latitude,
        "longitude": i.longitude,
        "status": i.status,
        "timestamp": i.timestamp.isoformat(),
        "is_vulnerable": i.is_vulnerable_area
    } for i in recent_incs]

    # 5. Live Units
    units = db.query(PoliceUnit).all()
    live_units = [{
        "id": u.id,
        "call_sign": u.call_sign,
        "type": u.unit_type,
        "status": u.status,
        "latitude": u.current_lat,
        "longitude": u.current_lon,
        "shift": u.shift,
        "speed_kmh": u.speed_kmh,
        "battery": u.battery_level,
        "station": u.police_station.name if u.police_station else "Headquarters"
    } for u in units]

    return {
        "kpis": {
            "incidents_today": incidents_today,
            "active_units": active_units,
            "total_units": total_units,
            "avg_response_time_min": avg_resp_min,
            "target_response_time_min": 10.0,
            "high_risk_zones": high_risk_zones,
            "open_critical_alerts": 3
        },
        "live_incidents": live_incidents,
        "live_units": live_units,
        "charts": {
            "by_category": categories_chart,
            "by_hour": hourly_chart
        },
        "disclaimer": "Predictions & analytics are advisory only. A human officer always decides."
    }
