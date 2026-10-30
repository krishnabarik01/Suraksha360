from typing import List, Optional
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db import get_db
from app.models.route import PatrolRoute
from app.models.user import User
from app.schemas.route import (
    RouteOptimizeRequest, RouteOut, RouteOverrideRequest,
    ResourceAllocationBeat, Waypoint
)
from app.optimization.patrol_router import PatrolRouteOptimizer
from app.optimization.resource_allocator import calculate_beat_resource_allocation
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/routes", tags=["Patrol Route Optimization"])

def format_route_out(r: PatrolRoute) -> RouteOut:
    waypoints_data = json.loads(r.waypoints_json)
    waypoints = [Waypoint(**w) for w in waypoints_data]

    # Include computed path streams if available
    path = getattr(r, "path", [])
    if not path and waypoints:
        from app.optimization.patrol_router import interpolate_dense_path
        path = interpolate_dense_path([w.model_dump() for w in waypoints], step_meters=45.0)

    baseline_path = getattr(r, "baseline_path", [])
    if not baseline_path and r.beat:
        try:
            beat_boundary = json.loads(r.beat.boundary_geojson)["coordinates"][0]
            st = r.beat.police_station
            from app.optimization.patrol_router import interpolate_dense_path
            b_pts = [{"latitude": st.latitude, "longitude": st.longitude}]
            for c in beat_boundary[:-1]:
                b_pts.append({"latitude": c[1], "longitude": c[0]})
            b_pts.append({"latitude": st.latitude, "longitude": st.longitude})
            baseline_path = interpolate_dense_path(b_pts, step_meters=60.0)
        except Exception:
            baseline_path = []

    baseline_wps = [Waypoint(**bw) for bw in getattr(r, "baseline_waypoints", [])] if getattr(r, "baseline_waypoints", None) else []
    candidates = [Waypoint(**cw) for cw in getattr(r, "candidate_checkpoints", [])] if getattr(r, "candidate_checkpoints", None) else []

    return RouteOut(
        id=r.id,
        name=r.name,
        unit_id=r.unit_id,
        beat_id=r.beat_id,
        beat_name=r.beat.name if r.beat else None,
        shift=r.shift,
        waypoints=waypoints,
        total_distance_km=r.total_distance_km,
        estimated_duration_min=r.estimated_duration_min,
        risk_covered_pct=r.risk_covered_pct,
        baseline_distance_km=r.baseline_distance_km,
        baseline_risk_covered_pct=r.baseline_risk_covered_pct,
        status=r.status,
        officer_notes=r.officer_notes,
        approved_by=r.approved_by,
        created_at=r.created_at,
        path=path,
        baseline_path=baseline_path,
        baseline_waypoints=baseline_wps,
        candidate_checkpoints=candidates
    )

@router.get("/candidates/{beat_id}")
def get_beat_candidates(beat_id: int, db: Session = Depends(get_db)):
    try:
        return PatrolRouteOptimizer.get_beat_candidates(db=db, beat_id=beat_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/optimize", response_model=RouteOut)
def optimize_patrol_route(
    payload: RouteOptimizeRequest,
    db: Session = Depends(get_db)
):
    try:
        route = PatrolRouteOptimizer.optimize_route(
            db=db,
            beat_id=payload.beat_id,
            shift=payload.shift,
            unit_id=payload.unit_id,
            max_duration_min=payload.max_duration_min,
            must_visit_points=payload.must_visit_points,
            no_go_areas=payload.no_go_areas,
            unit_type=payload.unit_type
        )
        return format_route_out(route)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=List[RouteOut])
def list_routes(
    db: Session = Depends(get_db),
    beat_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100)
):
    query = db.query(PatrolRoute)
    if beat_id:
        query = query.filter(PatrolRoute.beat_id == beat_id)
    if status:
        query = query.filter(PatrolRoute.status == status)

    routes = query.order_by(desc(PatrolRoute.created_at)).limit(limit).all()
    return [format_route_out(r) for r in routes]

@router.get("/resource-allocation", response_model=List[ResourceAllocationBeat])
def get_resource_allocation(
    shift: str = Query("Morning", description="Shift: Morning, Evening, Night"),
    db: Session = Depends(get_db)
):
    return calculate_beat_resource_allocation(db, shift=shift)

@router.get("/{route_id}", response_model=RouteOut)
def get_route_by_id(route_id: int, db: Session = Depends(get_db)):
    route = db.query(PatrolRoute).filter(PatrolRoute.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Patrol route not found")
    return format_route_out(route)

@router.post("/{route_id}/override", response_model=RouteOut)
def override_patrol_route(
    route_id: int,
    payload: RouteOverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        mod_pts = [p.model_dump() for p in payload.modified_waypoints] if payload.modified_waypoints else None
        updated_route = PatrolRouteOptimizer.apply_human_override(
            db=db,
            route_id=route_id,
            user_name=current_user.full_name,
            user_id=current_user.id,
            status=payload.status,
            officer_notes=payload.officer_notes,
            modified_waypoints=mod_pts
        )
        return format_route_out(updated_route)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
