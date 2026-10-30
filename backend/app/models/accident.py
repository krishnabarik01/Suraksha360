from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from datetime import datetime
from app.db import Base

class Accident(Base):
    __tablename__ = "accidents"

    id = Column(Integer, primary_key=True, index=True)
    accident_number = Column(String(50), unique=True, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    severity = Column(String(30), nullable=False)  # minor, major, fatal
    vehicles_involved = Column(Integer, default=1)
    road_type = Column(String(50), default="City Arterial")  # National Highway, City Arterial, Junction, Internal Road, Flyover
    weather = Column(String(50), default="Clear")  # Clear, Rain, Fog, Dust
    light_condition = Column(String(50), default="Daylight")  # Daylight, Dusk/Dawn, Dark - Lit, Dark - Unlit
    blackspot_id = Column(String(50), nullable=True)
    is_simulated = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
