from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.station import Beat
from app.models.incident import CrimeIncident
from app.models.unit import PoliceUnit

def calculate_beat_resource_allocation(db: Session, shift: str = "Morning") -> List[Dict[str, Any]]:
    beats = db.query(Beat).all()
    results = []

    # Shift multiplier: Night shift has highest crime risk and low visibility
    shift_multipliers = {
        "Morning": 1.0,
        "Evening": 1.35,
        "Night": 1.55
    }
    s_factor = shift_multipliers.get(shift, 1.0)

    for beat in beats:
        station = beat.police_station
        # Count recent incidents in this beat
        inc_count = db.query(CrimeIncident).filter(
            CrimeIncident.police_station_id == station.id
        ).count()

        # Count currently assigned units to this beat
        current_units = db.query(PoliceUnit).filter(
            PoliceUnit.assigned_beat_id == beat.id
        ).count()

        # Workload & risk scoring formula
        area = beat.area_sq_km or 4.0
        density = inc_count / max(area, 1.0)
        
        # Determine recommended units
        if beat.priority_level == "High" or density > 15.0:
            rec_units = int(round(3 * s_factor))
            rec_pcr = 1
            rec_moto = max(1, rec_units - 1)
            risk_cat = "High Risk"
            rationale = "High pedestrian density, dense markets, and multiple transit hotspots require persistent motorized visibility."
        elif beat.priority_level == "Medium" or density > 8.0:
            rec_units = int(round(2 * s_factor))
            rec_pcr = 1
            rec_moto = max(1, rec_units - 1)
            risk_cat = "Moderate Risk"
            rationale = "Arterial roads with moderate commercial activity require roving PCR presence and periodic intersection checkpoints."
        else:
            rec_units = int(round(1 * s_factor))
            rec_pcr = 0
            rec_moto = 1
            risk_cat = "Low Risk"
            rationale = "Predominantly residential area; scheduled periodic motorcycle beats sufficient for preventive coverage."

        gap = rec_units - current_units

        results.append({
            "beat_id": beat.id,
            "beat_name": beat.name,
            "station_name": station.name,
            "risk_level": risk_cat,
            "crime_density_score": round(float(density), 1),
            "current_units_assigned": current_units,
            "recommended_units": rec_units,
            "recommended_breakdown": {
                "PCR Van": rec_pcr,
                "Motorbike Patrol": rec_moto
            },
            "gap_surplus": gap,
            "rationale": rationale
        })

    return results
