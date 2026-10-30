from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class AccidentBase(BaseModel):
    latitude: float
    longitude: float
    timestamp: datetime
    severity: str  # minor, major, fatal
    vehicles_involved: int = 1
    road_type: str = "City Arterial"
    weather: str = "Clear"
    light_condition: str = "Daylight"

class AccidentCreate(AccidentBase):
    pass

class AccidentOut(AccidentBase):
    id: int
    accident_number: str
    blackspot_id: Optional[str] = None
    is_simulated: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BlackspotOut(BaseModel):
    id: str
    latitude: float
    longitude: float
    name: str
    incident_count: int
    fatal_count: int
    major_count: int
    minor_count: int
    weighted_severity_score: float
    primary_road_type: str
    predominant_weather: str
    predominant_light: str
    preventive_suggestions: List[str]
