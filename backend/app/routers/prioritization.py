import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.prioritization import PrioritizationConfig
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.prioritization import (
    IncidentRankRequest, RankedIncidentOut, PrioritizationConfigSchema
)
from app.services.prioritization_service import PrioritizationEngine, DEFAULT_CONFIG
from app.services.auth_service import get_current_user, require_roles

router = APIRouter(prefix="/prioritization", tags=["Incident Prioritization Engine"])

@router.post("/rank", response_model=List[RankedIncidentOut])
def rank_incidents_queue(
    payload: IncidentRankRequest,
    db: Session = Depends(get_db)
):
    ranked = PrioritizationEngine.rank_incidents(
        incidents=payload.incidents,
        db=db,
        custom_cfg=payload.custom_config
    )
    return ranked

@router.get("/config", response_model=PrioritizationConfigSchema)
def get_prioritization_config(db: Session = Depends(get_db)):
    cfg = PrioritizationEngine.get_active_config(db)
    return PrioritizationConfigSchema(
        severity_weight=cfg["severity_weight"],
        life_threat_weight=cfg["life_threat_weight"],
        vulnerable_loc_weight=cfg["vulnerable_loc_weight"],
        wait_time_weight=cfg["wait_time_weight"],
        category_weights=cfg["category_weights"]
    )

@router.put("/config", response_model=PrioritizationConfigSchema)
def update_prioritization_config(
    payload: PrioritizationConfigSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin"]))
):
    total_w = payload.severity_weight + payload.life_threat_weight + payload.vulnerable_loc_weight + payload.wait_time_weight
    if abs(total_w - 1.0) > 0.05:
        raise HTTPException(status_code=400, detail=f"Weights must sum to 1.0 (currently {round(total_w, 2)})")

    cfg_record = db.query(PrioritizationConfig).filter(PrioritizationConfig.is_active == True).first()
    if not cfg_record:
        cfg_record = PrioritizationConfig(is_active=True)
        db.add(cfg_record)

    cfg_record.severity_weight = payload.severity_weight
    cfg_record.life_threat_weight = payload.life_threat_weight
    cfg_record.vulnerable_loc_weight = payload.vulnerable_loc_weight
    cfg_record.wait_time_weight = payload.wait_time_weight
    cfg_record.category_weights_json = json.dumps(payload.category_weights)

    audit = AuditLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        action="PRIORITIZATION_WEIGHTS_UPDATED",
        entity_type="PrioritizationConfig",
        entity_id=str(cfg_record.id or 1),
        details_json=json.dumps(payload.model_dump())
    )
    db.add(audit)
    db.commit()

    return payload
