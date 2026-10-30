from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.unit import PoliceUnit
from app.schemas.unit import UnitOut, UnitLocationUpdate

router = APIRouter(prefix="/units", tags=["Police Units & Live GPS"])

@router.get("", response_model=List[UnitOut])
def list_units(db: Session = Depends(get_db)):
    units = db.query(PoliceUnit).all()
    results = []
    for u in units:
        out = UnitOut.model_validate(u)
        out.station_name = u.police_station.name if u.police_station else None
        out.beat_name = u.assigned_beat.name if u.assigned_beat else None
        results.append(out)
    return results

@router.get("/{unit_id}", response_model=UnitOut)
def get_unit(unit_id: int, db: Session = Depends(get_db)):
    u = db.query(PoliceUnit).filter(PoliceUnit.id == unit_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Unit not found")
    out = UnitOut.model_validate(u)
    out.station_name = u.police_station.name if u.police_station else None
    out.beat_name = u.assigned_beat.name if u.assigned_beat else None
    return out

@router.post("/{unit_id}/location", response_model=UnitOut)
def update_unit_location(unit_id: int, payload: UnitLocationUpdate, db: Session = Depends(get_db)):
    unit = db.query(PoliceUnit).filter(PoliceUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail=f"Police Unit with ID {unit_id} not found.")

    unit.current_lat = payload.latitude
    unit.current_lon = payload.longitude
    unit.last_location_update = datetime.utcnow()

    if payload.speed_kmh is not None:
        unit.speed_kmh = payload.speed_kmh
    if payload.status:
        unit.status = payload.status
    if payload.battery_level is not None:
        unit.battery_level = payload.battery_level

    db.commit()
    db.refresh(unit)

    out = UnitOut.model_validate(unit)
    out.station_name = unit.police_station.name if unit.police_station else None
    out.beat_name = unit.assigned_beat.name if unit.assigned_beat else None
    return out
