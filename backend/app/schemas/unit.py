from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class UnitBase(BaseModel):
    call_sign: str
    unit_type: str  # PCR Van, Motorbike Patrol, Foot Patrol, QRT
    shift: str = "Morning"
    personnel_count: int = 2
    assigned_station_id: Optional[int] = None
    assigned_beat_id: Optional[int] = None

class UnitCreate(UnitBase):
    current_lat: float
    current_lon: float

class UnitLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    speed_kmh: Optional[float] = 0.0
    status: Optional[str] = None
    battery_level: Optional[int] = None

class UnitOut(UnitBase):
    id: int
    status: str
    current_lat: float
    current_lon: float
    last_location_update: datetime
    speed_kmh: float
    battery_level: int
    station_name: Optional[str] = None
    beat_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
