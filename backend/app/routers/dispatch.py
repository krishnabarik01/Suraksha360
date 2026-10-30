from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db import get_db
from app.models.call import EmergencyCall
from app.schemas.dispatch import (
    DispatchAnalyticsSummary, DelayZoneOut, EmergencyCallOut
)
from app.ml.response_analytics import analyze_emergency_dispatch

router = APIRouter(prefix="/dispatch", tags=["Emergency Response & Dispatch Analytics"])

@router.get("/analytics", response_model=DispatchAnalyticsSummary)
def get_dispatch_analytics(
    target_min: float = Query(10.0, description="Target response time in minutes"),
    db: Session = Depends(get_db)
):
    return analyze_emergency_dispatch(db, target_min=target_min)

@router.get("/delay-zones", response_model=List[DelayZoneOut])
def get_delay_zones(db: Session = Depends(get_db)):
    analytics = analyze_emergency_dispatch(db)
    return analytics["slowest_zones"]

@router.get("/calls", response_model=List[EmergencyCallOut])
def list_emergency_calls(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    calls = db.query(EmergencyCall).order_by(desc(EmergencyCall.call_time)).limit(limit).all()
    return calls
