from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base

class EmergencyCall(Base):
    __tablename__ = "emergency_calls"

    id = Column(Integer, primary_key=True, index=True)
    call_number = Column(String(50), unique=True, index=True, nullable=False)
    call_time = Column(DateTime, nullable=False, index=True)
    dispatch_time = Column(DateTime, nullable=True)
    arrival_time = Column(DateTime, nullable=True)
    incident_type = Column(String(50), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    priority = Column(String(20), default="Medium")  # Critical, High, Medium, Low
    unit_id = Column(Integer, ForeignKey("police_units.id"), nullable=True)
    police_station_id = Column(Integer, ForeignKey("police_stations.id"), nullable=True)
    status = Column(String(30), default="Closed")  # Active, Dispatched, Arrived, Closed
    life_threat = Column(Boolean, default=False)
    vulnerable_location = Column(Boolean, default=False)
    caller_phone_hash = Column(String(64), nullable=True)  # Anonymized SHA-256
    is_simulated = Column(Boolean, default=True)

    # Computed metrics cached for analytics
    dispatch_delay_sec = Column(Float, nullable=True)
    travel_time_sec = Column(Float, nullable=True)
    total_response_time_sec = Column(Float, nullable=True)

    unit = relationship("PoliceUnit", back_populates="emergency_calls")
