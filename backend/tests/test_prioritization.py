import pytest
from app.services.prioritization_service import PrioritizationEngine
from app.schemas.prioritization import IncidentToRank, PrioritizationConfigSchema
from app.db import SessionLocal

def test_prioritization_transparent_scoring():
    db = SessionLocal()
    try:
        incidents = [
            IncidentToRank(
                id=1,
                call_number="112-TEST-01",
                incident_type="Armed Robbery in Progress",
                severity=5,
                life_threat=True,
                vulnerable_location=True,
                waiting_minutes=15.0,
                latitude=21.25,
                longitude=81.63
            ),
            IncidentToRank(
                id=2,
                call_number="112-TEST-02",
                incident_type="Vandalism / Noise",
                severity=1,
                life_threat=False,
                vulnerable_location=False,
                waiting_minutes=2.0,
                latitude=21.24,
                longitude=81.62
            )
        ]

        ranked = PrioritizationEngine.rank_incidents(incidents, db)

        assert len(ranked) == 2
        # Armed robbery with life threat must be Critical and rank 1
        assert ranked[0].priority_level == "Critical"
        assert ranked[0].rank_order == 1
        assert ranked[0].calculated_score > ranked[1].calculated_score
        assert "active threat to life" in ranked[0].why_explanation
        assert len(ranked[0].breakdown) >= 4

        # Vandalism should rank 2 and have low priority
        assert ranked[1].rank_order == 2
        assert ranked[1].priority_level == "Low"
    finally:
        db.close()

def test_custom_rule_weights():
    db = SessionLocal()
    try:
        incidents = [
            IncidentToRank(
                id=3,
                incident_type="General",
                severity=3,
                life_threat=False,
                vulnerable_location=False,
                waiting_minutes=25.0,
                latitude=21.25,
                longitude=81.63
            )
        ]

        # Give wait time 80% weight
        custom_cfg = PrioritizationConfigSchema(
            severity_weight=0.10,
            life_threat_weight=0.10,
            vulnerable_loc_weight=0.00,
            wait_time_weight=0.80,
            category_weights={}
        )

        ranked = PrioritizationEngine.rank_incidents(incidents, db, custom_cfg=custom_cfg)
        assert ranked[0].calculated_score > 60.0
    finally:
        db.close()
