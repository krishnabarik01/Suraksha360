from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base

class CrimeIncident(Base):
    __tablename__ = "crime_incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_number = Column(String(50), unique=True, index=True, nullable=False)
    category = Column(String(50), index=True, nullable=False)  # Theft, Burglary, Assault, Vehicle Theft, Robbery, etc.
    severity = Column(Integer, nullable=False)  # 1 (lowest) to 5 (highest)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    police_station_id = Column(Integer, ForeignKey("police_stations.id"), nullable=True)
    beat_id = Column(Integer, ForeignKey("beats.id"), nullable=True)
    status = Column(String(30), default="Reported")  # Reported, Under Investigation, Resolved, Closed
    description = Column(String(255), nullable=True)
    is_vulnerable_area = Column(Boolean, default=False)
    is_simulated = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    police_station = relationship("PoliceStation", back_populates="incidents")
