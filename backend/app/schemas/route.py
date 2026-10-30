from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any
from datetime import datetime

class Waypoint(BaseModel):
    order: int
    name: str
    latitude: float
    longitude: float
    risk_score: float
    estimated_stop_min: int = 15
    action_note: str = "High-visibility stationary check"

class RouteOptimizeRequest(BaseModel):
    beat_id: int
    shift: str = "Morning"  # Morning, Evening, Night
    unit_id: Optional[int] = None
    max_duration_min: int = 240  # 4 hours
    must_visit_points: Optional[List[dict]] = None
    no_go_areas: Optional[List[dict]] = None
    unit_type: str = "PCR Van"

class RouteOut(BaseModel):
    id: int
    name: str
    unit_id: Optional[int]
    beat_id: int
    beat_name: Optional[str] = None
    shift: str
    waypoints: List[Waypoint]
    total_distance_km: float
    estimated_duration_min: float
    risk_covered_pct: float
    baseline_distance_km: float
    baseline_risk_covered_pct: float
    status: str
    officer_notes: Optional[str]
    approved_by: Optional[str]
    created_at: datetime
    # Dense interpolated trajectories for 60fps patrol playback
    path: List[List[float]] = []
    baseline_path: List[List[float]] = []
    baseline_waypoints: List[Waypoint] = []
    candidate_checkpoints: List[Waypoint] = []

    model_config = ConfigDict(from_attributes=True)

class BeatCandidateInfo(BaseModel):
    beat_id: int
    beat_name: str
    station_name: str
    station_lat: float
    station_lon: float
    boundary: List[List[float]]
    candidate_checkpoints: List[Waypoint]
    faint_risk_cells: List[dict]

class RouteOverrideRequest(BaseModel):
    status: str  # Approved, Modified, Rejected
    officer_notes: str
    modified_waypoints: Optional[List[Waypoint]] = None

class ResourceAllocationBeat(BaseModel):
    beat_id: int
    beat_name: str
    station_name: str
    risk_level: str
    crime_density_score: float
    current_units_assigned: int
    recommended_units: int
    recommended_breakdown: dict  # {"PCR Van": 1, "Motorbike Patrol": 2}
    gap_surplus: int
    rationale: str
