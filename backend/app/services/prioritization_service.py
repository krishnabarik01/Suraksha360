from typing import List, Dict, Any, Optional
import json
from sqlalchemy.orm import Session
from app.models.prioritization import PrioritizationConfig
from app.schemas.prioritization import (
    IncidentToRank, RankedIncidentOut, ScoreFactorBreakdown,
    PrioritizationConfigSchema
)

DEFAULT_CONFIG = {
    "severity_weight": 0.30,
    "life_threat_weight": 0.35,
    "vulnerable_loc_weight": 0.15,
    "wait_time_weight": 0.20,
    "category_weights": {
        "Armed Robbery in Progress": 1.25,
        "Vehicle Collision with Injury": 1.20,
        "Domestic Dispute": 1.10,
        "Street Altercation": 1.05,
        "Burglary in Progress": 1.15,
        "Medical Emergency (Assistance)": 1.20
    }
}

class PrioritizationEngine:
    @staticmethod
    def get_active_config(db: Session, custom_cfg: Optional[PrioritizationConfigSchema] = None) -> Dict[str, Any]:
        if custom_cfg:
            return {
                "severity_weight": custom_cfg.severity_weight,
                "life_threat_weight": custom_cfg.life_threat_weight,
                "vulnerable_loc_weight": custom_cfg.vulnerable_loc_weight,
                "wait_time_weight": custom_cfg.wait_time_weight,
                "category_weights": custom_cfg.category_weights or DEFAULT_CONFIG["category_weights"]
            }

        db_cfg = db.query(PrioritizationConfig).filter(PrioritizationConfig.is_active == True).first()
        if not db_cfg:
            return DEFAULT_CONFIG

        try:
            cat_weights = json.loads(db_cfg.category_weights_json or "{}")
        except:
            cat_weights = DEFAULT_CONFIG["category_weights"]

        return {
            "severity_weight": db_cfg.severity_weight,
            "life_threat_weight": db_cfg.life_threat_weight,
            "vulnerable_loc_weight": db_cfg.vulnerable_loc_weight,
            "wait_time_weight": db_cfg.wait_time_weight,
            "category_weights": cat_weights
        }

    @classmethod
    def rank_incidents(
        cls,
        incidents: List[IncidentToRank],
        db: Session,
        custom_cfg: Optional[PrioritizationConfigSchema] = None
    ) -> List[RankedIncidentOut]:
        cfg = cls.get_active_config(db, custom_cfg)
        w_sev = cfg["severity_weight"]
        w_threat = cfg["life_threat_weight"]
        w_vuln = cfg["vulnerable_loc_weight"]
        w_wait = cfg["wait_time_weight"]
        cat_weights = cfg["category_weights"]

        ranked_list = []
        for inc in incidents:
            breakdown: List[ScoreFactorBreakdown] = []

            # 1. Severity points
            sev_norm = (max(1, min(5, inc.severity)) / 5.0) * 100.0
            sev_pts = round(sev_norm * w_sev, 1)
            breakdown.append(ScoreFactorBreakdown(
                factor_name="Severity Rating",
                raw_value=f"{inc.severity}/5",
                points_contributed=sev_pts,
                reason=f"Incident severity rated at level {inc.severity} contributing {sev_pts} pts"
            ))

            # 2. Life Threat points
            threat_norm = 100.0 if inc.life_threat else 0.0
            threat_pts = round(threat_norm * w_threat, 1)
            breakdown.append(ScoreFactorBreakdown(
                factor_name="Immediate Life Threat",
                raw_value="YES" if inc.life_threat else "NO",
                points_contributed=threat_pts,
                reason="Active imminent threat to human life flagged (+35 pts)" if inc.life_threat else "No active life threat detected (0 pts)"
            ))

            # 3. Vulnerable Location points
            vuln_norm = 100.0 if inc.vulnerable_location else 0.0
            vuln_pts = round(vuln_norm * w_vuln, 1)
            breakdown.append(ScoreFactorBreakdown(
                factor_name="Vulnerable / High-Risk Area",
                raw_value="YES" if inc.vulnerable_location else "NO",
                points_contributed=vuln_pts,
                reason="Located in poorly-lit or historically sensitive sector (+15 pts)" if inc.vulnerable_location else "Standard sector profile (0 pts)"
            ))

            # 4. Wait time escalation points (capped at 30 mins for 100%)
            wait_norm = min(100.0, (inc.waiting_minutes / 30.0) * 100.0)
            wait_pts = round(wait_norm * w_wait, 1)
            breakdown.append(ScoreFactorBreakdown(
                factor_name="Elapsed Waiting Time",
                raw_value=f"{round(inc.waiting_minutes, 1)} min",
                points_contributed=wait_pts,
                reason=f"Elapsed queue time of {round(inc.waiting_minutes, 1)} min escalates dispatch urgency (+{wait_pts} pts)"
            ))

            raw_score = sev_pts + threat_pts + vuln_pts + wait_pts

            # Multiplier for specific categories
            cat_multiplier = cat_weights.get(inc.incident_type, 1.0)
            final_score = round(min(100.0, raw_score * cat_multiplier), 1)

            if cat_multiplier != 1.0:
                breakdown.append(ScoreFactorBreakdown(
                    factor_name="Category Policy Multiplier",
                    raw_value=f"{cat_multiplier}x",
                    points_contributed=round(final_score - raw_score, 1),
                    reason=f"Priority multiplier applied for critical category: {inc.incident_type}"
                ))

            # Priority level categorization
            if inc.life_threat or final_score >= 75.0:
                priority_level = "Critical"
            elif final_score >= 55.0:
                priority_level = "High"
            elif final_score >= 35.0:
                priority_level = "Medium"
            else:
                priority_level = "Low"

            # Construct transparent human explanation
            reasons = []
            if inc.life_threat:
                reasons.append("active threat to life (+35 pts)")
            if inc.severity >= 4:
                reasons.append(f"high severity rating ({inc.severity}/5)")
            if inc.vulnerable_location:
                reasons.append("vulnerable sector location (+15 pts)")
            if inc.waiting_minutes >= 10:
                reasons.append(f"extended dispatch queue wait of {round(inc.waiting_minutes, 1)}m")
            if not reasons:
                reasons.append(f"routine severity level {inc.severity} with baseline response SLA")

            why_text = f"Ranked {priority_level.upper()} (Score {final_score}/100) primarily driven by: {', '.join(reasons)}."

            ranked_list.append(RankedIncidentOut(
                id=inc.id,
                call_number=inc.call_number,
                incident_type=inc.incident_type,
                severity=inc.severity,
                life_threat=inc.life_threat,
                vulnerable_location=inc.vulnerable_location,
                waiting_minutes=round(inc.waiting_minutes, 1),
                latitude=inc.latitude,
                longitude=inc.longitude,
                priority_level=priority_level,
                calculated_score=final_score,
                rank_order=1,  # will sort below
                why_explanation=why_text,
                breakdown=breakdown
            ))

        # Sort descending by score
        ranked_list.sort(key=lambda x: (1 if x.life_threat else 0, x.calculated_score), reverse=True)

        for idx, item in enumerate(ranked_list):
            item.rank_order = idx + 1

        return ranked_list
