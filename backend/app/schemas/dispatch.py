from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class EmergencyCallOut(BaseModel):
    id: int
    call_number: str
    call_time: datetime
    dispatch_time: Optional[datetime]
    arrival_time: Optional[datetime]
    incident_type: str
    latitude: float
    longitude: float
    priority: str
    unit_id: Optional[int]
    status: str
    life_threat: bool
    vulnerable_location: bool
    dispatch_delay_sec: Optional[float]
    travel_time_sec: Optional[float]
    total_response_time_sec: Optional[float]

    model_config = ConfigDict(from_attributes=True)

class DelayZoneOut(BaseModel):
    zone_id: str
    name: str
    latitude: float
    longitude: float
    avg_total_response_min: float
    avg_dispatch_delay_min: float
    avg_travel_time_min: float
    target_response_min: float
    variance_min: float
    delay_factor: str  # "Traffic Congestion / Railway Crossing", "Dispatch Bottleneck", "Station Distance"
    call_volume: int

class DispatchAnalyticsSummary(BaseModel):
    avg_total_response_min: float
    avg_dispatch_delay_min: float
    avg_travel_time_min: float
    target_response_min: float
    compliance_rate_pct: float
    calls_under_target: int
    calls_exceeding_target: int
    hourly_trend: List[dict]
    slowest_zones: List[DelayZoneOut]
