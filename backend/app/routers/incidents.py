import io
import csv
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db import get_db
from app.models.incident import CrimeIncident
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.incident import IncidentOut, IncidentCreate, CSVImportResult
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("", response_model=List[IncidentOut])
def list_incidents(
    db: Session = Depends(get_db),
    category: Optional[str] = None,
    severity: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    query = db.query(CrimeIncident)
    if category:
        query = query.filter(CrimeIncident.category == category)
    if severity:
        query = query.filter(CrimeIncident.severity == severity)
    if status:
        query = query.filter(CrimeIncident.status == status)
    if start_date:
        query = query.filter(CrimeIncident.timestamp >= start_date)
    if end_date:
        query = query.filter(CrimeIncident.timestamp <= end_date)

    return query.order_by(desc(CrimeIncident.timestamp)).offset(skip).limit(limit).all()

@router.post("", response_model=IncidentOut)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.utcnow()
    inc_num = f"CR-RPR-{now.strftime('%Y%m')}-{int(now.timestamp()) % 100000:05d}"
    incident = CrimeIncident(
        incident_number=inc_num,
        category=payload.category,
        severity=payload.severity,
        latitude=payload.latitude,
        longitude=payload.longitude,
        timestamp=payload.timestamp,
        police_station_id=payload.police_station_id,
        beat_id=payload.beat_id,
        status=payload.status,
        description=payload.description,
        is_vulnerable_area=payload.is_vulnerable_area,
        is_simulated=False
    )
    db.add(incident)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        action="INCIDENT_MANUALLY_RECORDED",
        entity_type="CrimeIncident",
        entity_id=inc_num,
        details_json=json.dumps({"category": payload.category, "severity": payload.severity})
    )
    db.add(audit)
    db.commit()
    db.refresh(incident)
    return incident

@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    inc = db.query(CrimeIncident).filter(CrimeIncident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc

@router.post("/import", response_model=CSVImportResult)
async def import_incidents_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted for dataset import")

    content = await file.read()
    decoded = content.decode("utf-8", errors="replace")
    csv_reader = csv.DictReader(io.StringIO(decoded))

    imported = 0
    skipped = 0
    errors = []
    objects_to_add = []

    for row_idx, row in enumerate(csv_reader, start=1):
        try:
            category = row.get("category", "Theft").strip()
            severity = int(row.get("severity", 2))
            lat = float(row.get("latitude"))
            lon = float(row.get("longitude"))
            ts_str = row.get("timestamp")
            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00")) if ts_str else datetime.utcnow()
            desc = row.get("description", f"Imported incident: {category}")
            is_vuln = str(row.get("is_vulnerable_area", "false")).lower() in ["true", "1", "yes"]

            inc_num = f"CR-IMP-{int(datetime.utcnow().timestamp()) % 10000}-{row_idx:04d}"

            incident = CrimeIncident(
                incident_number=inc_num,
                category=category,
                severity=max(1, min(5, severity)),
                latitude=lat,
                longitude=lon,
                timestamp=ts,
                status=row.get("status", "Reported"),
                description=desc,
                is_vulnerable_area=is_vuln,
                is_simulated=False
            )
            objects_to_add.append(incident)
            imported += 1
        except Exception as e:
            skipped += 1
            if len(errors) < 5:
                errors.append(f"Row {row_idx}: {str(e)}")

    if objects_to_add:
        db.bulk_save_objects(objects_to_add)

        audit = AuditLog(
            user_id=current_user.id,
            user_name=current_user.full_name,
            action="CSV_DATASET_IMPORTED",
            entity_type="CrimeIncident",
            entity_id=file.filename,
            details_json=json.dumps({"filename": file.filename, "imported": imported, "skipped": skipped})
        )
        db.add(audit)
        db.commit()

    return CSVImportResult(
        total_rows=imported + skipped,
        imported=imported,
        skipped=skipped,
        errors=errors
    )
