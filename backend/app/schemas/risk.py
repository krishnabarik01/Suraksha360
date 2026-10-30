from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class FeatureContribution(BaseModel):
    feature: str
    label: str
    contribution: float  # e.g. +0.18
    direction: str       # "increases_risk" or "decreases_risk"

class RiskCellProperties(BaseModel):
    cell_id: str
    center_lat: float
    center_lon: float
    risk_score: float  # Raw model probability 0.0 - 1.0
    normalized_risk_score: float  # Min-max percentile scaled 0.0 - 1.0
    risk_bucket: str   # Low, Medium, High, Very High
    predicted_count: float
    historical_count_30d: int
    top_category: str
    confidence_level: str  # High, Moderate, Low
    top_contributing_factors: List[FeatureContribution] = []

class RiskCellGeoJSON(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any]  # Polygon
    properties: RiskCellProperties

class RiskGridResponse(BaseModel):
    type: str = "FeatureCollection"
    time_window: str
    category_filter: Optional[str] = None
    shift: Optional[str] = None
    total_cells: int
    high_risk_cells: int
    features: List[RiskCellGeoJSON]
    model_version: str
    model_name: str
    metrics_summary: Dict[str, float]
    disclaimer: str = (
        "Area-level risk estimate for preventive resource deployment, "
        "not a prediction about any person. A human officer always decides."
    )

class CellExplanationOut(BaseModel):
    cell_id: str
    risk_score: float
    risk_bucket: str
    contributions: List[FeatureContribution]
    recommendations: List[str]
    disclaimer: str
