from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base

class PoliceUnit(Base):
    __tablename__ = "police_units"

    id = Column(Integer, primary_key=True, index=True)
    call_sign = Column(String(50), unique=True, nullable=False)
    unit_type = Column(String(50), nullable=False)  # PCR Van, Motorbike Patrol, Foot Patrol, QRT
    status = Column(String(30), default="Available")  # Available, On Patrol, Dispatched, Busy, Off Duty
    current_lat = Column(Float, nullable=False)
    current_lon = Column(Float, nullable=False)
    last_location_update = Column(DateTime, default=datetime.utcnow)
    shift = Column(String(20), default="Morning")  # Morning (06:00-14:00), Evening (14:00-22:00), Night (22:00-06:00)
    personnel_count = Column(Integer, default=2)
    assigned_station_id = Column(Integer, ForeignKey("police_stations.id"), nullable=True)
    assigned_beat_id = Column(Integer, ForeignKey("beats.id"), nullable=True)
    speed_kmh = Column(Float, default=0.0)
    battery_level = Column(Integer, default=95)

    police_station = relationship("PoliceStation", back_populates="units")
    assigned_beat = relationship("Beat", back_populates="units")
    routes = relationship("PatrolRoute", back_populates="unit")
    emergency_calls = relationship("EmergencyCall", back_populates="unit")
