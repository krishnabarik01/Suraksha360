from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.db import get_db
from app.schemas.risk import RiskGridResponse, CellExplanationOut
from app.ml.risk_model import crime_risk_model
from app.ml.grid_builder import city_grid

router = APIRouter(prefix="/risk", tags=["Risk Estimation"])

@router.get("/grid", response_model=RiskGridResponse)
def get_risk_grid(
    db: Session = Depends(get_db),
    time_window: str = Query("next_6h", description="Forecast time horizon (e.g. next_6h, shift, weekend)"),
    category: Optional[str] = Query(None, description="Optional crime category filter"),
    shift: str = Query("Morning", description="Shift filter: Morning, Evening, Night")
):
    result = crime_risk_model.predict_grid(
        db=db,
        time_window=time_window,
        shift=shift,
        category=category
    )
    return result

@router.get("/explain/{cell_id}", response_model=CellExplanationOut)
def explain_cell_risk(cell_id: str, db: Session = Depends(get_db)):
    grid_data = crime_risk_model.predict_grid(db=db)
    target_feat = None
    for f in grid_data["features"]:
        if f["properties"]["cell_id"] == cell_id:
            target_feat = f
            break

    if not target_feat:
        raise HTTPException(status_code=404, detail=f"Grid cell '{cell_id}' not found.")

    props = target_feat["properties"]
    score = props["risk_score"]
    bucket = props["risk_bucket"]
    factors = props["top_contributing_factors"]

    # Rule-based patrol advisory recommendations
    recs = []
    if bucket in ["High", "Very High"]:
        recs.append("Deploy stationary high-visibility PCR van presence during evening hours.")
        recs.append("Increase motorcycle foot-patrol density in surrounding commercial corridors.")
        recs.append("Conduct scheduled merchant security checks and CCTV coverage verification.")
    elif bucket == "Medium":
        recs.append("Maintain periodic roving patrol loops every 90 minutes.")
        recs.append("Verify street lighting functionality along transit link roads.")
    else:
        recs.append("Standard preventive vigilance; monitor for sudden call-volume spikes.")

    return CellExplanationOut(
        cell_id=cell_id,
        risk_score=score,
        risk_bucket=bucket,
        contributions=factors,
        recommendations=recs,
        disclaimer=(
            "Area-level statistical risk estimate. This is strictly preventive intelligence "
            "and NEVER constitutes suspicion, accusation, or prediction regarding any individual person."
        )
    )
