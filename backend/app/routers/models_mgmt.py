import json
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.ml.risk_model import crime_risk_model
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/models", tags=["Model Lifecycle & Governance"])

@router.get("/metrics")
def get_model_metrics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    if not crime_risk_model.is_trained:
        crime_risk_model.train(db)

    return {
        "model_version": crime_risk_model.model_version,
        "last_trained_at": crime_risk_model.last_trained_at.isoformat(),
        "metrics": crime_risk_model.metrics,
        "feature_importance": crime_risk_model.feature_importance,
        "training_metadata": {
            "target": "Binary high-incident window occurrence (next 8h)",
            "split_method": "Time-based chronological (75% train / 25% test)",
            "features_count": len(crime_risk_model.feature_importance),
            "disclaimer": "Area-level risk model only. Never trained on or applied to personal attributes."
        }
    }

@router.post("/retrain")
def retrain_model(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    metrics = crime_risk_model.train(db)

    audit = AuditLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        action="ML_MODEL_RETRAINED",
        entity_type="Model",
        entity_id=crime_risk_model.model_version,
        details_json=json.dumps({
            "metrics_summary": metrics.get("random_forest", {}),
            "retrained_at": crime_risk_model.last_trained_at.isoformat()
        })
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": f"Model successfully retrained on current incidents. Version: {crime_risk_model.model_version}",
        "metrics": metrics,
        "feature_importance": crime_risk_model.feature_importance
    }
