from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(50), default="Beat Officer", nullable=False) # Admin, Control Room Officer, Beat Officer, Analyst
    badge_number = Column(String(50), nullable=True)
    police_station_id = Column(Integer, ForeignKey("police_stations.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    police_station = relationship("PoliceStation", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")
