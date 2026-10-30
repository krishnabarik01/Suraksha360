import numpy as np
import pandas as pd
from typing import List, Dict, Any
from sklearn.cluster import DBSCAN
from sqlalchemy.orm import Session
from app.models.accident import Accident
from app.ml.grid_builder import haversine_distance_km

SEVERITY_WEIGHTS = {
    "fatal": 5.0,
    "major": 3.0,
    "minor": 1.0
}

BLACKSPOT_NAME_ANCHORS = [
    {"name": "Tatibandh Ring Road Cloverleaf", "lat": 21.2590, "lon": 81.5710},
    {"name": "Pachpedi Naka Junction", "lat": 21.2185, "lon": 81.6515},
    {"name": "Telibandha Marine Drive Turn", "lat": 21.2355, "lon": 81.6702},
    {"name": "Jaistambh / Phool Chowk Intersection", "lat": 21.2497, "lon": 81.6335},
    {"name": "Pandri Bus Stand Cut", "lat": 21.2588, "lon": 81.6540},
    {"name": "Raipur Station Approach Road", "lat": 21.2612, "lon": 81.6288},
    {"name": "GE Road - NIT Campus Crossing", "lat": 21.2490, "lon": 81.6050}
]

def generate_preventive_suggestions(primary_road: str, weather: str, light: str, fatal_count: int, major_count: int) -> List[str]:
    suggestions = []
    
    if fatal_count > 0:
        suggestions.append("Install rumble strips and automated high-speed interceptor camera 150m ahead of merge point.")
    if "Highway" in primary_road or "Flyover" in primary_road:
        suggestions.append("Enforce heavy commercial vehicle lane discipline and install retro-reflective chevron signage.")
    if "Junction" in primary_road or "Intersection" in primary_road:
        suggestions.append("Re-calibrate amber signal duration and install pedestrian refuge islands with high-visibility bollards.")
    if "Dark" in light:
        suggestions.append("Erect high-mast LED floodlighting and solar blinkers for night-time visibility.")
    if "Rain" in weather or "Fog" in weather:
        suggestions.append("Deploy electronic variable message signs (VMS) warning of wet-surface skid hazards.")
    
    suggestions.append("Schedule proactive PCR interceptor vehicle halt between 20:00 and 01:00 hrs during peak vulnerability.")
    return suggestions

def detect_accident_hotspots(db: Session, min_samples: int = 4, eps_km: float = 0.45) -> List[Dict[str, Any]]:
    accidents = db.query(Accident).all()
    if not accidents:
        return []

    df = pd.DataFrame([{
        "id": a.id,
        "number": a.accident_number,
        "lat": a.latitude,
        "lon": a.longitude,
        "severity": a.severity,
        "vehicles": a.vehicles_involved,
        "road_type": a.road_type,
        "weather": a.weather,
        "light_condition": a.light_condition,
        "timestamp": a.timestamp,
        "weight": SEVERITY_WEIGHTS.get(a.severity.lower(), 1.0)
    } for a in accidents])

    # Convert coordinates to radians for DBSCAN with haversine metric
    coords_rad = np.radians(df[["lat", "lon"]].values)
    kms_per_radian = 6371.0
    epsilon = eps_km / kms_per_radian

    dbscan = DBSCAN(eps=epsilon, min_samples=min_samples, metric='haversine')
    df["cluster"] = dbscan.fit_predict(coords_rad)

    hotspots = []
    clusters = df[df["cluster"] != -1].groupby("cluster")

    for cluster_id, group in clusters:
        # Weighted center
        total_weight = group["weight"].sum()
        center_lat = (group["lat"] * group["weight"]).sum() / total_weight
        center_lon = (group["lon"] * group["weight"]).sum() / total_weight

        # Count severities
        fatal_count = int((group["severity"] == "fatal").sum())
        major_count = int((group["severity"] == "major").sum())
        minor_count = int((group["severity"] == "minor").sum())
        total_incidents = len(group)

        # Predominant conditions
        primary_road = group["road_type"].mode()[0] if not group["road_type"].empty else "City Arterial"
        predom_weather = group["weather"].mode()[0] if not group["weather"].empty else "Clear"
        predom_light = group["light_condition"].mode()[0] if not group["light_condition"].empty else "Daylight"

        # Identify nearest landmark for naming
        closest_anchor = min(
            BLACKSPOT_NAME_ANCHORS,
            key=lambda a: haversine_distance_km(center_lat, center_lon, a["lat"], a["lon"])
        )
        spot_name = f"{closest_anchor['name']} Corridor"

        suggestions = generate_preventive_suggestions(
            primary_road=primary_road,
            weather=predom_weather,
            light=predom_light,
            fatal_count=fatal_count,
            major_count=major_count
        )

        hotspots.append({
            "id": f"BLACKSPOT-RPR-{cluster_id + 1:02d}",
            "latitude": round(float(center_lat), 6),
            "longitude": round(float(center_lon), 6),
            "name": spot_name,
            "incident_count": total_incidents,
            "fatal_count": fatal_count,
            "major_count": major_count,
            "minor_count": minor_count,
            "weighted_severity_score": round(float(total_weight), 1),
            "primary_road_type": primary_road,
            "predominant_weather": predom_weather,
            "predominant_light": predom_light,
            "preventive_suggestions": suggestions
        })

    # Sort descending by weighted severity score
    hotspots.sort(key=lambda x: x["weighted_severity_score"], reverse=True)
    return hotspots
