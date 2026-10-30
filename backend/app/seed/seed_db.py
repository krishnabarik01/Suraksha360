import sys
import os
import json
import pandas as pd
from datetime import datetime
from passlib.context import CryptContext

# Add parent directory to path so imports work when executed directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.db import Base, engine, SessionLocal
from app.models import (
    User, PoliceStation, Beat, PoliceUnit, CrimeIncident,
    Accident, EmergencyCall, PatrolRoute, AuditLog, PrioritizationConfig
)
from app.seed.synthetic_generator import (
    generate_crime_dataset,
    generate_accident_dataset,
    generate_emergency_calls,
    LANDMARKS
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def seed_database(force: bool = False):
    print("Creating all database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        force_flag = force or ("--force" in sys.argv)
        # Check if already seeded and not force
        if db.query(User).first() and not force_flag:
            print("Database already contains data. Use --force to re-seed.")
            return

        if force_flag:
            print("Force reseed requested: clearing all tables for fresh clustered simulation...")
            db.query(AuditLog).delete()
            db.query(CrimeIncident).delete()
            db.query(Accident).delete()
            db.query(EmergencyCall).delete()
            db.query(PatrolRoute).delete()
            db.query(PoliceUnit).delete()
            db.query(Beat).delete()
            db.query(PoliceStation).delete()
            db.query(PrioritizationConfig).delete()
            db.query(User).delete()
            db.commit()

        if not db.query(User).first():
            print("Seeding Users...")
        users = [
            User(
                username="admin",
                email="admin@cgpolice.gov.in",
                hashed_password=get_password_hash("admin123"),
                full_name="Dr. Alok Verma (Superintendent of Police)",
                role="Admin",
                badge_number="IPS-CG-2012-08"
            ),
            User(
                username="control_room",
                email="control112@cgpolice.gov.in",
                hashed_password=get_password_hash("control123"),
                full_name="Inspector S. K. Sharma",
                role="Control Room Officer",
                badge_number="CGP-CR-4401"
            ),
            User(
                username="beat_officer",
                email="beat_rajesh@cgpolice.gov.in",
                hashed_password=get_password_hash("beat123"),
                full_name="Sub-Inspector Rajesh Nayak",
                role="Beat Officer",
                badge_number="CGP-BO-7812"
            ),
            User(
                username="analyst",
                email="analyst@cgpolice.gov.in",
                hashed_password=get_password_hash("analyst123"),
                full_name="Pooja Dewangan (Crime Data Analyst)",
                role="Analyst",
                badge_number="CGP-DA-102"
            )
        ]
        db.add_all(users)
        db.flush()

        print("Seeding Police Stations...")
        stations_data = [
            {
                "name": "Kotwali Police Station",
                "code": "PS-KTW",
                "latitude": 21.2497,
                "longitude": 81.6335,
                "address": "Near Jaistambh Chowk, Old Bus Stand Road, Raipur",
                "contact_number": "0771-2424100"
            },
            {
                "name": "Telibandha Police Station",
                "code": "PS-TLB",
                "latitude": 21.2355,
                "longitude": 81.6702,
                "address": "Ring Road No. 1, Near Marine Drive, Raipur",
                "contact_number": "0771-2442200"
            },
            {
                "name": "Pandri Police Station",
                "code": "PS-PND",
                "latitude": 21.2588,
                "longitude": 81.6540,
                "address": "Cloth Market Road, Pandri, Raipur",
                "contact_number": "0771-2431500"
            },
            {
                "name": "Civil Lines Police Station",
                "code": "PS-CVL",
                "latitude": 21.2380,
                "longitude": 81.6420,
                "address": "Raj Bhavan Road, Civil Lines, Raipur",
                "contact_number": "0771-2425500"
            },
            {
                "name": "Ganj Police Station",
                "code": "PS-GNJ",
                "latitude": 21.2612,
                "longitude": 81.6288,
                "address": "Station Road, Raipur Railway Junction",
                "contact_number": "0771-2426600"
            },
            {
                "name": "Saraswati Nagar Police Station",
                "code": "PS-SWN",
                "latitude": 21.2490,
                "longitude": 81.5975,
                "address": "Great Eastern (GE) Road, Near NIT Campus, Raipur",
                "contact_number": "0771-2427700"
            }
        ]

        station_objects = []
        for s in stations_data:
            st = PoliceStation(**s)
            db.add(st)
            station_objects.append(st)
        db.flush()

        print("Seeding Beats...")
        # 8 distinct beats covering Raipur urban area
        beats_data = [
            {
                "name": "Kotwali Beat 1 - Sadar Bazaar & Jaistambh",
                "code": "BEAT-KTW-01",
                "police_station_id": station_objects[0].id,
                "boundary": [
                    [81.628, 21.245], [81.638, 21.245], [81.639, 21.254], [81.627, 21.253], [81.628, 21.245]
                ],
                "area_sq_km": 3.8,
                "priority_level": "High"
            },
            {
                "name": "Kotwali Beat 2 - Malviya Road & Phool Chowk",
                "code": "BEAT-KTW-02",
                "police_station_id": station_objects[0].id,
                "boundary": [
                    [81.632, 21.240], [81.642, 21.240], [81.643, 21.248], [81.631, 21.247], [81.632, 21.240]
                ],
                "area_sq_km": 3.2,
                "priority_level": "High"
            },
            {
                "name": "Telibandha Beat 1 - Marine Drive & VIP Road",
                "code": "BEAT-TLB-01",
                "police_station_id": station_objects[1].id,
                "boundary": [
                    [81.660, 21.228], [81.682, 21.228], [81.685, 21.242], [81.658, 21.240], [81.660, 21.228]
                ],
                "area_sq_km": 6.5,
                "priority_level": "Medium"
            },
            {
                "name": "Pandri Beat 1 - Devendra Nagar & Cloth Market",
                "code": "BEAT-PND-01",
                "police_station_id": station_objects[2].id,
                "boundary": [
                    [81.640, 21.250], [81.662, 21.250], [81.664, 21.265], [81.639, 21.264], [81.640, 21.250]
                ],
                "area_sq_km": 4.5,
                "priority_level": "High"
            },
            {
                "name": "Civil Lines Beat 1 - Raj Bhavan & Shankar Nagar",
                "code": "BEAT-CVL-01",
                "police_station_id": station_objects[3].id,
                "boundary": [
                    [81.635, 21.230], [81.660, 21.230], [81.662, 21.245], [81.636, 21.244], [81.635, 21.230]
                ],
                "area_sq_km": 5.1,
                "priority_level": "Medium"
            },
            {
                "name": "Ganj Beat 1 - Station Road & Fafadih Chowk",
                "code": "BEAT-GNJ-01",
                "police_station_id": station_objects[4].id,
                "boundary": [
                    [81.620, 21.255], [81.638, 21.255], [81.640, 21.268], [81.618, 21.267], [81.620, 21.255]
                ],
                "area_sq_km": 3.6,
                "priority_level": "High"
            },
            {
                "name": "Saraswati Nagar Beat 1 - GE Road & NIT",
                "code": "BEAT-SWN-01",
                "police_station_id": station_objects[5].id,
                "boundary": [
                    [81.590, 21.240], [81.615, 21.240], [81.616, 21.258], [81.588, 21.256], [81.590, 21.240]
                ],
                "area_sq_km": 5.4,
                "priority_level": "Medium"
            },
            {
                "name": "Tatibandh Outpost Beat - Transport Nagar & Ring Road",
                "code": "BEAT-TB-01",
                "police_station_id": station_objects[5].id,
                "boundary": [
                    [81.560, 21.248], [81.585, 21.248], [81.587, 21.268], [81.558, 21.265], [81.560, 21.248]
                ],
                "area_sq_km": 7.2,
                "priority_level": "High"
            }
        ]

        beat_objects = []
        for b in beats_data:
            geojson = json.dumps({
                "type": "Polygon",
                "coordinates": [b["boundary"]]
            })
            beat = Beat(
                name=b["name"],
                code=b["code"],
                police_station_id=b["police_station_id"],
                boundary_geojson=geojson,
                area_sq_km=b["area_sq_km"],
                priority_level=b["priority_level"]
            )
            db.add(beat)
            beat_objects.append(beat)
        db.flush()

        print("Seeding Police Units...")
        units_data = [
            {"call_sign": "PCR-01 (Kotwali)", "unit_type": "PCR Van", "status": "On Patrol", "lat": 21.2497, "lon": 81.6335, "shift": "Morning", "personnel_count": 3, "station": station_objects[0], "beat": beat_objects[0]},
            {"call_sign": "PCR-02 (Telibandha)", "unit_type": "PCR Van", "status": "Available", "lat": 21.2355, "lon": 81.6702, "shift": "Morning", "personnel_count": 3, "station": station_objects[1], "beat": beat_objects[2]},
            {"call_sign": "PCR-03 (Pandri)", "unit_type": "PCR Van", "status": "Dispatched", "lat": 21.2588, "lon": 81.6540, "shift": "Morning", "personnel_count": 3, "station": station_objects[2], "beat": beat_objects[3]},
            {"call_sign": "PCR-04 (Saraswati)", "unit_type": "PCR Van", "status": "On Patrol", "lat": 21.2490, "lon": 81.5975, "shift": "Morning", "personnel_count": 3, "station": station_objects[5], "beat": beat_objects[6]},
            {"call_sign": "MOTO-01 (Sadar)", "unit_type": "Motorbike Patrol", "status": "On Patrol", "lat": 21.2435, "lon": 81.6315, "shift": "Morning", "personnel_count": 2, "station": station_objects[0], "beat": beat_objects[0]},
            {"call_sign": "MOTO-02 (Station)", "unit_type": "Motorbike Patrol", "status": "Available", "lat": 21.2610, "lon": 81.6290, "shift": "Morning", "personnel_count": 2, "station": station_objects[4], "beat": beat_objects[5]},
            {"call_sign": "MOTO-03 (Pandri)", "unit_type": "Motorbike Patrol", "status": "On Patrol", "lat": 21.2540, "lon": 81.6490, "shift": "Morning", "personnel_count": 2, "station": station_objects[2], "beat": beat_objects[3]},
            {"call_sign": "QRT-01 (City Delta)", "unit_type": "Quick Response Team", "status": "Available", "lat": 21.2385, "lon": 81.6425, "shift": "Morning", "personnel_count": 5, "station": station_objects[3], "beat": beat_objects[4]},
            {"call_sign": "QRT-02 (Ring Road)", "unit_type": "Quick Response Team", "status": "On Patrol", "lat": 21.2595, "lon": 81.5720, "shift": "Morning", "personnel_count": 5, "station": station_objects[5], "beat": beat_objects[7]},
            {"call_sign": "FOOT-01 (Jaistambh)", "unit_type": "Foot Patrol", "status": "On Patrol", "lat": 21.2495, "lon": 81.6340, "shift": "Morning", "personnel_count": 2, "station": station_objects[0], "beat": beat_objects[0]}
        ]

        unit_objects = []
        for u in units_data:
            pu = PoliceUnit(
                call_sign=u["call_sign"],
                unit_type=u["unit_type"],
                status=u["status"],
                current_lat=u["lat"],
                current_lon=u["lon"],
                shift=u["shift"],
                personnel_count=u["personnel_count"],
                assigned_station_id=u["station"].id,
                assigned_beat_id=u["beat"].id,
                speed_kmh=24.5 if u["status"] == "On Patrol" else 0.0,
                battery_level=92
            )
            db.add(pu)
            unit_objects.append(pu)
        db.flush()

        print("Seeding Crime Incidents (900 records with 8 primary hotspots)...")
        crimes_data = generate_crime_dataset(count=900)
        crime_objects = []
        for c in crimes_data:
            # Associate to closest police station roughly
            station_id = station_objects[0].id if c["longitude"] < 81.64 else station_objects[1].id
            ci = CrimeIncident(
                incident_number=c["incident_number"],
                category=c["category"],
                severity=c["severity"],
                latitude=c["latitude"],
                longitude=c["longitude"],
                timestamp=c["timestamp"],
                police_station_id=station_id,
                status=c["status"],
                description=c["description"],
                is_vulnerable_area=c["is_vulnerable_area"],
                is_simulated=True
            )
            crime_objects.append(ci)
        db.bulk_save_objects(crime_objects)

        print("Seeding Accidents (350 records)...")
        accidents_data = generate_accident_dataset(count=350)
        accident_objects = []
        for a in accidents_data:
            acc = Accident(
                accident_number=a["accident_number"],
                latitude=a["latitude"],
                longitude=a["longitude"],
                timestamp=a["timestamp"],
                severity=a["severity"],
                vehicles_involved=a["vehicles_involved"],
                road_type=a["road_type"],
                weather=a["weather"],
                light_condition=a["light_condition"],
                is_simulated=True
            )
            accident_objects.append(acc)
        db.bulk_save_objects(accident_objects)

        print("Seeding Emergency Dispatch Calls (400 records)...")
        calls_data = generate_emergency_calls(count=400)
        call_objects = []
        for cl in calls_data:
            call = EmergencyCall(
                call_number=cl["call_number"],
                call_time=cl["call_time"],
                dispatch_time=cl["dispatch_time"],
                arrival_time=cl["arrival_time"],
                incident_type=cl["incident_type"],
                latitude=cl["latitude"],
                longitude=cl["longitude"],
                priority=cl["priority"],
                status=cl["status"],
                life_threat=cl["life_threat"],
                vulnerable_location=cl["vulnerable_location"],
                caller_phone_hash=cl["caller_phone_hash"],
                dispatch_delay_sec=cl["dispatch_delay_sec"],
                travel_time_sec=cl["travel_time_sec"],
                total_response_time_sec=cl["total_response_time_sec"],
                unit_id=unit_objects[0].id,
                is_simulated=True
            )
            call_objects.append(call)
        db.bulk_save_objects(call_objects)

        print("Seeding Prioritization Matrix...")
        config = PrioritizationConfig(
            name="Raipur 112 Dial Matrix - Active Standard",
            severity_weight=0.30,
            life_threat_weight=0.35,
            vulnerable_loc_weight=0.15,
            wait_time_weight=0.20,
            category_weights_json=json.dumps({
                "Armed Robbery in Progress": 1.25,
                "Vehicle Collision with Injury": 1.20,
                "Domestic Dispute": 1.10,
                "Street Altercation": 1.05
            }),
            is_active=True
        )
        db.add(config)

        print("Seeding Initial Audit Logs...")
        logs = [
            AuditLog(
                user_id=users[0].id,
                user_name="Dr. Alok Verma",
                action="SYSTEM_INITIALIZED",
                entity_type="SYSTEM",
                entity_id="ROOT",
                details_json=json.dumps({"city": "Raipur, Chhattisgarh", "beats_seeded": len(beats_data), "simulated_data": True})
            ),
            AuditLog(
                user_id=users[1].id,
                user_name="Inspector S. K. Sharma",
                action="DISPATCH_POLICY_ACTIVATED",
                entity_type="CONFIG",
                entity_id="1",
                details_json=json.dumps({"target_response_minutes": 10.0, "compliance_alert_threshold": 12.0})
            )
        ]
        db.add_all(logs)

        db.commit()
        print("Database successfully seeded with realistic simulated data for Raipur, Chhattisgarh!")

        # Export sample CSVs for user download / import test
        os.makedirs("data/sample_csvs", exist_ok=True)
        
        # Sample crime CSV
        crime_df = pd.DataFrame([{
            "category": c["category"],
            "severity": c["severity"],
            "latitude": c["latitude"],
            "longitude": c["longitude"],
            "timestamp": c["timestamp"].isoformat(),
            "status": c["status"],
            "description": c["description"],
            "is_vulnerable_area": c["is_vulnerable_area"]
        } for c in crimes_data[:50]])
        crime_df.to_csv("data/sample_csvs/crime_incidents_sample.csv", index=False)

        # Sample accident CSV
        acc_df = pd.DataFrame([{
            "latitude": a["latitude"],
            "longitude": a["longitude"],
            "timestamp": a["timestamp"].isoformat(),
            "severity": a["severity"],
            "vehicles_involved": a["vehicles_involved"],
            "road_type": a["road_type"],
            "weather": a["weather"],
            "light_condition": a["light_condition"]
        } for a in accidents_data[:50]])
        acc_df.to_csv("data/sample_csvs/accidents_sample.csv", index=False)

        print("Exported sample CSV files in data/sample_csvs/")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
