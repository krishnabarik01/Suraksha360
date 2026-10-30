from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

class IncidentToRank(BaseModel):
    id: Optional[int] = None
    call_number: Optional[str] = None
    incident_type: str
    severity: int  # 1 to 5
    life_threat: bool = False
    vulnerable_location: bool = False
    waiting_minutes: float = 0.0
    latitude: float
    longitude: float
    reported_at: Optional[datetime] = None
    description: Optional[str] = None

class ScoreFactorBreakdown(BaseModel):
    factor_name: str
    raw_value: str
    points_contributed: float
    reason: str

class RankedIncidentOut(BaseModel):
    id: Optional[int]
    call_number: Optional[str]
    incident_type: str
    severity: int
    life_threat: bool
    vulnerable_location: bool
    waiting_minutes: float
    latitude: float
    longitude: float
    priority_level: str  # Critical, High, Medium, Low
    calculated_score: float  # 0 to 100
    rank_order: int
    why_explanation: str
    breakdown: List[ScoreFactorBreakdown]

class PrioritizationConfigSchema(BaseModel):
    severity_weight: float = 0.30
    life_threat_weight: float = 0.35
    vulnerable_loc_weight: float = 0.15
    wait_time_weight: float = 0.20
    category_weights: Dict[str, float] = {}

class IncidentRankRequest(BaseModel):
    incidents: List[IncidentToRank]
    custom_config: Optional[PrioritizationConfigSchema] = None
