from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base

class PoliceStation(Base):
    __tablename__ = "police_stations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(255), nullable=True)
    contact_number = Column(String(30), nullable=True)
    jurisdiction_geojson = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    beats = relationship("Beat", back_populates="police_station")
    units = relationship("PoliceUnit", back_populates="police_station")
    users = relationship("User", back_populates="police_station")
    incidents = relationship("CrimeIncident", back_populates="police_station")

class Beat(Base):
    __tablename__ = "beats"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(30), unique=True, nullable=False)
    police_station_id = Column(Integer, ForeignKey("police_stations.id"), nullable=False)
    boundary_geojson = Column(Text, nullable=False)  # GeoJSON Polygon / MultiPolygon
    area_sq_km = Column(Float, default=5.0)
    priority_level = Column(String(20), default="Medium") # Low, Medium, High
    created_at = Column(DateTime, default=datetime.utcnow)

    police_station = relationship("PoliceStation", back_populates="beats")
    units = relationship("PoliceUnit", back_populates="assigned_beat")
    routes = relationship("PatrolRoute", back_populates="beat")
