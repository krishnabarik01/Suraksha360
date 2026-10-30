from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel

from app.db import get_db
from app.models.audit import AuditLog

router = APIRouter(prefix="/audit-logs", tags=["Audit & Accountability"])

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    user_name: Optional[str]
    action: str
    entity_type: str
    entity_id: Optional[str]
    details_json: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.contains(action))
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    return query.order_by(desc(AuditLog.created_at)).limit(limit).all()
