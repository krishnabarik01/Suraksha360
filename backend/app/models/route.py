from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base

class PatrolRoute(Base):
    __tablename__ = "patrol_routes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    unit_id = Column(Integer, ForeignKey("police_units.id"), nullable=True)
    beat_id = Column(Integer, ForeignKey("beats.id"), nullable=False)
    shift = Column(String(20), default="Morning")  # Morning, Evening, Night
    waypoints_json = Column(Text, nullable=False)  # JSON array of points with lat, lon, order, risk, name
    total_distance_km = Column(Float, default=0.0)
    estimated_duration_min = Column(Float, default=0.0)
    risk_covered_pct = Column(Float, default=0.0)
    baseline_distance_km = Column(Float, default=0.0)
    baseline_risk_covered_pct = Column(Float, default=0.0)
    status = Column(String(30), default="Recommended")  # Recommended, Approved, Modified, Rejected
    officer_notes = Column(Text, nullable=True)
    approved_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    unit = relationship("PoliceUnit", back_populates="routes")
    beat = relationship("Beat", back_populates="routes")
