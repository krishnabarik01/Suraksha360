from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from datetime import datetime
from app.db import Base

class PrioritizationConfig(Base):
    __tablename__ = "prioritization_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), default="Standard Police Control Room Matrix", nullable=False)
    severity_weight = Column(Float, default=0.30)
    life_threat_weight = Column(Float, default=0.35)
    vulnerable_loc_weight = Column(Float, default=0.15)
    wait_time_weight = Column(Float, default=0.20)
    category_weights_json = Column(Text, default="{}")  # Extra weights per category
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
