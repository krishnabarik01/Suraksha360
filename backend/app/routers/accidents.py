from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db import get_db
from app.models.accident import Accident
from app.schemas.accident import AccidentOut, BlackspotOut
from app.ml.accident_hotspots import detect_accident_hotspots

router = APIRouter(prefix="/accidents", tags=["Accidents & Blackspots"])

@router.get("", response_model=List[AccidentOut])
def list_accidents(
    db: Session = Depends(get_db),
    severity: Optional[str] = None,
    road_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500)
):
    query = db.query(Accident)
    if severity:
        query = query.filter(Accident.severity == severity)
    if road_type:
        query = query.filter(Accident.road_type == road_type)
    return query.order_by(desc(Accident.timestamp)).limit(limit).all()

@router.get("/hotspots", response_model=List[BlackspotOut])
def get_accident_hotspots(
    db: Session = Depends(get_db),
    min_samples: int = Query(3, ge=2, le=10),
    eps_km: float = Query(0.45, ge=0.1, le=2.0)
):
    hotspots = detect_accident_hotspots(db, min_samples=min_samples, eps_km=eps_km)
    return hotspots
