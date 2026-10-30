from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json

from app.db import get_db
from app.models.station import Beat, PoliceStation

router = APIRouter(prefix="/beats", tags=["Beats & Police Stations"])

class StationOut(BaseModel):
    id: int
    name: str
    code: str
    latitude: float
    longitude: float
    address: str
    contact_number: str

    class Config:
        from_attributes = True

class BeatOut(BaseModel):
    id: int
    name: str
    code: str
    police_station_id: int
    station_name: str
    boundary_geojson: dict
    area_sq_km: float
    priority_level: str

@router.get("/stations", response_model=List[StationOut])
def list_stations(db: Session = Depends(get_db)):
    return db.query(PoliceStation).all()

@router.get("", response_model=List[BeatOut])
def list_beats(db: Session = Depends(get_db)):
    beats = db.query(Beat).all()
    results = []
    for b in beats:
        results.append(BeatOut(
            id=b.id,
            name=b.name,
            code=b.code,
            police_station_id=b.police_station_id,
            station_name=b.police_station.name if b.police_station else "Unknown",
            boundary_geojson=json.loads(b.boundary_geojson),
            area_sq_km=b.area_sq_km,
            priority_level=b.priority_level
        ))
    return results
