import random
import json
import math
from datetime import datetime, timedelta

# Raipur Landmark Anchors (Center: 21.2514 N, 81.6296 E)
# 8 Primary High-Concentration Hotspots
PRIMARY_HOTSPOTS = [
    {
        "name": "Sadar Bazaar Old City",
        "lat": 21.2420, "lon": 81.6310,
        "weight": 3.0,
        "spread_km": 0.20,
        "categories": ["Theft", "Theft", "Burglary", "Assault", "Vehicle Theft"],
        "night_surge": 1.4,
        "evening_surge": 2.2
    },
    {
        "name": "Jaistambh Chowk & Malviya Rd",
        "lat": 21.2497, "lon": 81.6335,
        "weight": 2.9,
        "spread_km": 0.18,
        "categories": ["Vehicle Theft", "Theft", "Theft", "Public Nuisance", "Pickpocketing"],
        "night_surge": 1.3,
        "evening_surge": 2.0
    },
    {
        "name": "Raipur Railway Station (Ganj)",
        "lat": 21.2612, "lon": 81.6288,
        "weight": 3.4,
        "spread_km": 0.20,
        "categories": ["Vehicle Theft", "Vehicle Theft", "Theft", "Robbery", "Narcotics"],
        "night_surge": 2.4,
        "evening_surge": 1.5
    },
    {
        "name": "Old Pandri Bus Stand / Fafadih",
        "lat": 21.2540, "lon": 81.6490,
        "weight": 2.6,
        "spread_km": 0.22,
        "categories": ["Public Nuisance", "Theft", "Narcotics", "Assault"],
        "night_surge": 1.8,
        "evening_surge": 1.6
    },
    {
        "name": "Pandri Wholesale Cloth Market",
        "lat": 21.2588, "lon": 81.6540,
        "weight": 2.7,
        "spread_km": 0.20,
        "categories": ["Burglary", "Theft", "Vehicle Theft", "Vandalism"],
        "night_surge": 0.8,
        "evening_surge": 2.5  # Peaks during evening market hours
    },
    {
        "name": "Telibandha Marine Drive",
        "lat": 21.2355, "lon": 81.6702,
        "weight": 2.8,
        "spread_km": 0.22,
        "categories": ["Vehicle Theft", "Public Nuisance", "Assault", "Robbery"],
        "night_surge": 2.6,  # Strong night recreation surge
        "evening_surge": 1.8
    },
    {
        "name": "Tatibandh Ring Road Junction",
        "lat": 21.2590, "lon": 81.5710,
        "weight": 2.9,
        "spread_km": 0.24,
        "categories": ["Vehicle Theft", "Robbery", "Assault", "Narcotics"],
        "night_surge": 2.5,  # Highway transport night surge
        "evening_surge": 1.2
    },
    {
        "name": "Pachpedi Naka Outbound Junction",
        "lat": 21.2185, "lon": 81.6515,
        "weight": 2.3,
        "spread_km": 0.22,
        "categories": ["Vehicle Theft", "Theft", "Assault", "Robbery"],
        "night_surge": 2.0,
        "evening_surge": 1.4
    }
]

LANDMARKS = PRIMARY_HOTSPOTS

# Secondary lower-activity landmarks
SECONDARY_LANDMARKS = [
    {"name": "Civil Lines Collectorate", "lat": 21.2380, "lon": 81.6420, "weight": 0.5, "spread_km": 0.45},
    {"name": "Devendra Nagar Sector 2", "lat": 21.2550, "lon": 81.6440, "weight": 0.6, "spread_km": 0.45},
    {"name": "NIT / GE Road Corridor", "lat": 21.2490, "lon": 81.6050, "weight": 0.7, "spread_km": 0.45},
    {"name": "Shankar Nagar Chowk", "lat": 21.2450, "lon": 81.6620, "weight": 0.6, "spread_km": 0.45}
]

CRIME_CATEGORIES = [
    ("Vehicle Theft", 2),
    ("Theft", 2),
    ("Burglary", 3),
    ("Assault", 4),
    ("Robbery", 5),
    ("Public Nuisance", 1),
    ("Vandalism", 2),
    ("Narcotics", 3)
]

ACCIDENT_SEVERITIES = [
    ("minor", 0.65),
    ("major", 0.27),
    ("fatal", 0.08)
]

ROAD_TYPES = ["City Arterial", "National Highway", "Junction", "Flyover", "Internal Road"]
WEATHER_CONDITIONS = ["Clear", "Clear", "Clear", "Rain", "Fog"]
LIGHT_CONDITIONS = ["Daylight", "Dusk/Dawn", "Dark - Lit", "Dark - Unlit"]

def generate_spatial_cluster(lat_center: float, lon_center: float, spread_km: float = 0.3):
    delta_lat = (random.gauss(0, spread_km) / 111.0)
    delta_lon = (random.gauss(0, spread_km) / (111.0 * math.cos(math.radians(lat_center))))
    return round(lat_center + delta_lat, 6), round(lon_center + delta_lon, 6)

def generate_temporal_timestamp(days_back=90, night_weight=1.0, evening_weight=1.0):
    now = datetime.utcnow()
    day_offset = random.uniform(0, days_back)
    base_date = now - timedelta(days=day_offset)

    # Shift probabilities based on night_weight and evening_weight
    total_w = 0.20 + 0.35 * evening_weight + 0.45 * night_weight
    p_morning = 0.20 / total_w
    p_evening = (0.35 * evening_weight) / total_w
    
    r = random.random()
    if r < p_morning:
        # Morning / Day (06:00 - 13:00)
        hour = random.randint(6, 13)
    elif r < p_morning + p_evening:
        # Evening / Afternoon (14:00 - 21:00)
        hour = random.randint(14, 21)
    else:
        # Night peak (22:00 - 05:00)
        hour = random.choice([22, 23, 0, 1, 2, 3, 4, 5])

    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    return base_date.replace(hour=hour, minute=minute, second=second, microsecond=0)

def generate_crime_dataset(count=900):
    incidents = []
    cat_severity_map = dict(CRIME_CATEGORIES)

    hotspot_weights = [h["weight"] for h in PRIMARY_HOTSPOTS]

    for i in range(1, count + 1):
        # 88% from primary hotspots (strongly clustered with Gaussian spread)
        # 12% random background / secondary landmarks
        if random.random() < 0.88:
            spot = random.choices(PRIMARY_HOTSPOTS, weights=hotspot_weights)[0]
            lat, lon = generate_spatial_cluster(spot["lat"], spot["lon"], spread_km=spot["spread_km"])
            category = random.choice(spot["categories"])
            ts = generate_temporal_timestamp(
                days_back=90,
                night_weight=spot.get("night_surge", 1.0),
                evening_weight=spot.get("evening_surge", 1.0)
            )
            is_vulnerable = random.random() < (0.45 if spot.get("night_surge", 1.0) > 1.8 else 0.15)
            anchor_name = spot["name"]
        else:
            # Low background: wide random distribution across city bounds
            if random.random() < 0.4:
                sec = random.choice(SECONDARY_LANDMARKS)
                lat, lon = generate_spatial_cluster(sec["lat"], sec["lon"], spread_km=sec["spread_km"])
                anchor_name = sec["name"]
            else:
                lat = round(random.uniform(21.185, 21.315), 6)
                lon = round(random.uniform(81.565, 81.695), 6)
                anchor_name = "Suburban Residential Sector"

            category = random.choice([c[0] for c in CRIME_CATEGORIES])
            ts = generate_temporal_timestamp(days_back=90, night_weight=0.8, evening_weight=1.0)
            is_vulnerable = random.random() < 0.08

        base_sev = cat_severity_map.get(category, 2)
        severity = max(1, min(5, int(random.gauss(base_sev, 0.5))))

        incidents.append({
            "incident_number": f"CR-RPR-{ts.strftime('%Y%m')}-{i:04d}",
            "category": category,
            "severity": severity,
            "latitude": lat,
            "longitude": lon,
            "timestamp": ts,
            "status": random.choice(["Resolved", "Under Investigation", "Reported", "Closed"]),
            "description": f"Reported {category} incident near {anchor_name}",
            "is_vulnerable_area": is_vulnerable,
            "is_simulated": True
        })
    return incidents

def generate_accident_dataset(count=350):
    accidents = []
    junction_anchors = [
        {"name": "Tatibandh Chowk", "lat": 21.2590, "lon": 81.5710, "weight": 2.8},
        {"name": "Pachpedi Naka", "lat": 21.2185, "lon": 81.6515, "weight": 2.0},
        {"name": "Telibandha Chowk", "lat": 21.2355, "lon": 81.6702, "weight": 1.7},
        {"name": "Jaistambh / Phool Chowk", "lat": 21.2497, "lon": 81.6335, "weight": 1.3},
        {"name": "Ganj / Station Road", "lat": 21.2612, "lon": 81.6288, "weight": 1.2},
        {"name": "Pandri Highway Cut", "lat": 21.2588, "lon": 81.6540, "weight": 1.1}
    ]
    anchor_weights = [a["weight"] for a in junction_anchors]
    sev_choices = [s[0] for s in ACCIDENT_SEVERITIES]
    sev_weights = [s[1] for s in ACCIDENT_SEVERITIES]

    for i in range(1, count + 1):
        anchor = random.choices(junction_anchors, weights=anchor_weights)[0]
        lat, lon = generate_spatial_cluster(anchor["lat"], anchor["lon"], spread_km=0.35)
        severity = random.choices(sev_choices, weights=sev_weights)[0]
        ts = generate_temporal_timestamp(days_back=90, night_weight=1.2)
        
        vehicles = random.choices([1, 2, 3], weights=[0.4, 0.5, 0.1])[0]
        road_type = "National Highway" if "Tatibandh" in anchor["name"] or "Pachpedi" in anchor["name"] else random.choice(ROAD_TYPES)
        weather = random.choices(WEATHER_CONDITIONS, weights=[0.75, 0.1, 0.05, 0.07, 0.03])[0]
        
        if ts.hour >= 20 or ts.hour <= 5:
            light = random.choice(["Dark - Lit", "Dark - Unlit"])
        else:
            light = "Daylight"

        accidents.append({
            "accident_number": f"ACC-RPR-{ts.strftime('%Y%m')}-{i:04d}",
            "latitude": lat,
            "longitude": lon,
            "timestamp": ts,
            "severity": severity,
            "vehicles_involved": vehicles,
            "road_type": road_type,
            "weather": weather,
            "light_condition": light,
            "is_simulated": True
        })
    return accidents

def generate_emergency_calls(count=400):
    calls = []
    incident_types = [
        ("Street Altercation", False, 0.22),
        ("Vehicle Collision with Injury", True, 0.18),
        ("Armed Robbery in Progress", True, 0.08),
        ("Domestic Dispute", False, 0.15),
        ("Burglary in Progress", False, 0.12),
        ("Vandalism / Noise", False, 0.10),
        ("Medical Emergency (Assistance)", True, 0.10),
        ("Suspicious Bag at Transit Point", True, 0.05)
    ]
    type_names = [t[0] for t in incident_types]
    type_weights = [t[2] for t in incident_types]
    threat_map = {t[0]: t[1] for t in incident_types}

    for i in range(1, count + 1):
        spot = random.choice(PRIMARY_HOTSPOTS)
        lat, lon = generate_spatial_cluster(spot["lat"], spot["lon"], spread_km=0.4)
        inc_type = random.choices(type_names, weights=type_weights)[0]
        life_threat = threat_map[inc_type] or (random.random() < 0.10)
        vulnerable_loc = random.random() < 0.20
        
        call_time = generate_temporal_timestamp(days_back=60, night_weight=spot.get("night_surge", 1.0))
        
        peak_factor = 1.4 if (call_time.hour in [19, 20, 21, 22, 23]) else 1.0
        dispatch_delay_sec = round(random.uniform(70, 220) * peak_factor, 1)
        dispatch_time = call_time + timedelta(seconds=dispatch_delay_sec)

        dist_factor = 1.5 if "Tatibandh" in spot["name"] or "Pachpedi" in spot["name"] else 1.0
        travel_time_sec = round(random.uniform(250, 600) * dist_factor, 1)
        arrival_time = dispatch_time + timedelta(seconds=travel_time_sec)
        total_response_time_sec = dispatch_delay_sec + travel_time_sec

        if life_threat:
            priority = "Critical"
        elif vulnerable_loc or "Robbery" in inc_type or "Collision" in inc_type:
            priority = "High"
        elif random.random() < 0.5:
            priority = "Medium"
        else:
            priority = "Low"

        phone_hash = f"hash_{random.getrandbits(64):016x}"

        calls.append({
            "call_number": f"112-RPR-{call_time.strftime('%Y%m')}-{i:04d}",
            "call_time": call_time,
            "dispatch_time": dispatch_time,
            "arrival_time": arrival_time,
            "incident_type": inc_type,
            "latitude": lat,
            "longitude": lon,
            "priority": priority,
            "status": "Closed",
            "life_threat": life_threat,
            "vulnerable_location": vulnerable_loc,
            "caller_phone_hash": phone_hash,
            "dispatch_delay_sec": dispatch_delay_sec,
            "travel_time_sec": travel_time_sec,
            "total_response_time_sec": total_response_time_sec,
            "is_simulated": True
        })
    return calls
