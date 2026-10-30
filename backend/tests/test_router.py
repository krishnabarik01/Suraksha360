import pytest
from app.db import SessionLocal
from app.models.station import Beat
from app.optimization.patrol_router import PatrolRouteOptimizer, two_opt_optimize

def test_two_opt_heuristic():
    # Synthetic crossed path
    points = [
        {"latitude": 21.24, "longitude": 81.62},
        {"latitude": 21.26, "longitude": 81.64},
        {"latitude": 21.24, "longitude": 81.64},
        {"latitude": 21.26, "longitude": 81.62}
    ]
    optimized = two_opt_optimize(points)
    assert len(optimized) == len(points)

def test_route_optimization_and_override():
    db = SessionLocal()
    try:
        beat = db.query(Beat).first()
        assert beat is not None

        route = PatrolRouteOptimizer.optimize_route(
            db=db,
            beat_id=beat.id,
            shift="Morning",
            max_duration_min=180
        )

        assert route.id is not None
        assert route.total_distance_km > 0
        assert route.risk_covered_pct > 0
        assert route.status == "Recommended"

        # Test human override
        updated = PatrolRouteOptimizer.apply_human_override(
            db=db,
            route_id=route.id,
            user_name="Officer Test",
            user_id=1,
            status="Approved",
            officer_notes="Route reviewed and accepted for morning duty."
        )

        assert updated.status == "Approved"
        assert updated.officer_notes == "Route reviewed and accepted for morning duty."
    finally:
        db.close()
