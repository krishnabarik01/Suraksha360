from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class IncidentBase(BaseModel):
    category: str
    severity: int
    latitude: float
    longitude: float
    timestamp: datetime
    police_station_id: Optional[int] = None
    beat_id: Optional[int] = None
    status: str = "Reported"
    description: Optional[str] = None
    is_vulnerable_area: bool = False

class IncidentCreate(IncidentBase):
    pass

class IncidentOut(IncidentBase):
    id: int
    incident_number: str
    is_simulated: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CSVImportResult(BaseModel):
    total_rows: int
    imported: int
    skipped: int
    errors: List[str] = []
