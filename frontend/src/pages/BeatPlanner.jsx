import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { api } from '../api/client';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { SimulatedBadge } from '../components/SimulatedBadge';
import {
  Route, Play, Pause, RotateCcw, CheckCircle, XCircle, Edit3,
  Clock, Navigation, ShieldAlert, Award, FileText, Check, ChevronRight,
  Eye, Layers, Car, Users, Zap, Compass, AlertCircle, Save, Sliders, MapPin
} from 'lucide-react';
import {
  MapContainer, TileLayer, Polygon, Polyline, Marker, Popup,
  Tooltip as LeafletTooltip, useMap
} from 'react-leaflet';
import L from 'leaflet';

const RAIPUR_CENTER = [21.2514, 81.6296];

// ==========================================
// GEOMETRIC & KINEMATIC UTILITIES
// ==========================================

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  return bearing;
}

function buildDistanceLookup(path) {
  if (!path || path.length === 0) return { distances: [], totalDistance: 0 };
  const distances = [0];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = haversineDistanceKm(path[i][0], path[i][1], path[i+1][0], path[i+1][1]);
    total += d;
    distances.push(total);
  }
  return { distances, totalDistance: total };
}

function interpolateDensePath(waypoints, stepMeters = 40.0) {
  if (!waypoints || waypoints.length === 0) return [];
  const dense = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i+1];
    const lat1 = p1.latitude;
    const lon1 = p1.longitude;
    const lat2 = p2.latitude;
    const lon2 = p2.longitude;
    const distKm = haversineDistanceKm(lat1, lon1, lat2, lon2);
    const steps = Math.max(3, Math.floor((distKm * 1000.0) / stepMeters));

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      dense.push([
        lat1 + (lat2 - lat1) * t,
        lon1 + (lon2 - lon1) * t
      ]);
    }
  }
  const last = waypoints[waypoints.length - 1];
  dense.push([last.latitude, last.longitude]);
  return dense;
}

// Map shift to start hour
const SHIFT_START_HOURS = {
  Morning: 6,
  Evening: 14,
  Night: 22
};

function formatSimClock(baseHour, elapsedSec) {
  const totalSec = baseHour * 3600 + Math.floor(elapsedSec);
  const h = Math.floor((totalSec / 3600) % 24);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ==========================================
// CUSTOM LEAFLET DIV ICONS
// ==========================================

const getVehicleSvg = (color = '#06b6d4', isGhost = false, unitType = 'PCR Van') => {
  if (unitType === 'Motorbike Patrol') {
    return `
      <svg width="24" height="34" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="30" rx="6" fill="rgba(0,0,0,0.3)"/>
        <rect x="9" y="3" width="6" height="28" rx="3" fill="${isGhost ? '#64748b' : '#0f172a'}" stroke="${color}" stroke-width="2"/>
        <circle cx="12" cy="7" r="3" fill="${color}"/>
        <rect x="5" y="12" width="14" height="3" rx="1.5" fill="${color}"/>
        <circle cx="12" cy="27" r="3.5" fill="#334155" stroke="${color}" stroke-width="1.5"/>
        ${!isGhost ? `<circle cx="12" cy="14" r="2" fill="#ef4444" />` : ''}
      </svg>
    `;
  }

  // PCR Van Cruiser Top-Down SVG
  return `
    <svg width="28" height="42" viewBox="0 0 28 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="24" height="34" rx="7" fill="rgba(0,0,0,0.4)"/>
      <rect x="3" y="3" width="22" height="34" rx="6" fill="${isGhost ? '#334155' : '#090d16'}" stroke="${color}" stroke-width="2"/>
      <!-- Windshield -->
      <path d="M6 13 C6 9 8 7 14 7 C20 7 22 9 22 13 L21 17 H7 L6 13 Z" fill="${isGhost ? '#94a3b8' : color}" fill-opacity="0.85"/>
      <!-- Rear Glass -->
      <path d="M7 28 H21 L20 32 C20 33 18 34 14 34 C10 34 8 33 8 32 L7 28 Z" fill="${isGhost ? '#64748b' : color}" fill-opacity="0.4"/>
      <!-- Roof Beacon Bar -->
      ${!isGhost ? `
        <rect x="8" y="19" width="5" height="4" rx="1.5" fill="#ef4444"/>
        <rect x="15" y="19" width="5" height="4" rx="1.5" fill="#3b82f6"/>
      ` : ''}
      <!-- Headlights -->
      <circle cx="6.5" cy="4.5" r="1.5" fill="#fef08a"/>
      <circle cx="21.5" cy="4.5" r="1.5" fill="#fef08a"/>
    </svg>
  `;
};

const createVehicleIcon = (color = '#06b6d4', isGhost = false, unitType = 'PCR Van') => {
  return L.divIcon({
    className: 'patrol-vehicle-marker',
    html: `
      <div class="relative flex items-center justify-center" style="width: 36px; height: 46px;">
        ${!isGhost ? `<div class="absolute -inset-1 rounded-full police-beacon-active pointer-events-none"></div>` : ''}
        <div class="vehicle-inner-icon flex items-center justify-center transition-transform duration-100 ease-linear" style="transform-origin: center center;">
          ${getVehicleSvg(color, isGhost, unitType)}
        </div>
      </div>
    `,
    iconSize: [36, 46],
    iconAnchor: [18, 23]
  });
};

const createCheckpointIcon = (order, risk = 0.5, isVisited = false, isHalt = false, isStation = false, isShared = false) => {
  if (isStation) {
    return L.divIcon({
      className: 'station-icon',
      html: `
        <div style="background-color: #1e3a8a; width: 30px; height: 30px; border-radius: 50%; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; color: #60a5fa; box-shadow: 0 0 12px rgba(37,99,235,0.8);">
          ★
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  }

  // Risk Color code: green (<0.4), amber (0.4-0.7), red (>0.7)
  let ringColor = '#10b981';
  if (risk >= 0.70) ringColor = '#ef4444';
  else if (risk >= 0.40) ringColor = '#f59e0b';

  if (isVisited) {
    return L.divIcon({
      className: 'checkpoint-visited-icon',
      html: `
        <div class="checkpoint-visited" style="background-color: #10b981; width: 26px; height: 26px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: white; box-shadow: 0 0 10px rgba(16,185,129,0.7);">
          ✓
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  }

  const borderStyle = isShared
    ? `border: 3px double #a855f7;`
    : `border: 2px solid white;`;

  return L.divIcon({
    className: isHalt ? 'checkpoint-icon-active' : 'checkpoint-icon',
    html: `
      <div class="${isHalt ? 'marker-pulse' : ''}" style="background-color: ${ringColor}; width: 26px; height: 26px; border-radius: 50%; ${borderStyle} display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; color: white; box-shadow: 0 0 8px rgba(0,0,0,0.6);">
        ${order}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
};

const createCandidateIcon = (order) => {
  return L.divIcon({
    className: 'candidate-dot-icon',
    html: `
      <div style="background-color: #475569; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; color: #f1f5f9; box-shadow: 0 0 5px rgba(0,0,0,0.5);">
        ${order}
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
};

// ==========================================
// MAP BOUNDS CONTROLLER
// ==========================================

function MapBoundsController({ bounds, followCoords, isFollowing }) {
  const map = useMap();
  const lastBoundsKeyRef = useRef('');

  useEffect(() => {
    if (bounds && bounds.length > 0) {
      const key = JSON.stringify(bounds);
      if (lastBoundsKeyRef.current !== key) {
        lastBoundsKeyRef.current = key;
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
      }
    }
  }, [bounds, map]);

  useEffect(() => {
    if (isFollowing && followCoords && followCoords[0] && followCoords[1]) {
      map.panTo(followCoords, { animate: true, duration: 0.25 });
    }
  }, [followCoords, isFollowing, map]);

  return null;
}

// ==========================================
// MAIN COMPONENT: BEAT PATROL ROUTE OPTIMIZER
// ==========================================

export const BeatPlanner = () => {
  // Config & Selections
  const [beats, setBeats] = useState([]);
  const [selectedBeatId, setSelectedBeatId] = useState('');
  const [shift, setShift] = useState('Morning');
  const [unitType, setUnitType] = useState('PCR Van');
  const [maxDuration, setMaxDuration] = useState(240); // 4 hours
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Pre-generation Candidate Info
  const [beatCandidateInfo, setBeatCandidateInfo] = useState(null);

  // Generated Patrol Route
  const [currentRoute, setCurrentRoute] = useState(null);
  const [routeUnit2, setRouteUnit2] = useState(null); // Optional secondary unit

  // Toggles
  const [compareBaseline, setCompareBaseline] = useState(true);
  const [multiUnit, setMultiUnit] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableWaypoints, setEditableWaypoints] = useState([]);

  // Human-in-the-loop Notes
  const [officerNotes, setOfficerNotes] = useState('');

  // Patrol Playback Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(5); // 1x, 5x, 20x, 60x
  const [followUnit, setFollowUnit] = useState(false);
  const [sliderProgress, setSliderProgress] = useState(0); // 0 to 1000

  // Live Telemetry Display State (updated ~4Hz)
  const [telemetry, setTelemetry] = useState({
    simClock: '06:00:00',
    distanceCoveredKm: 0,
    totalDistanceKm: 0,
    elapsedMin: 0,
    totalDurationMin: 0,
    visitedCount: 0,
    totalCheckpoints: 0,
    riskCoveredPct: 0,
    currentSegmentDesc: 'Ready at Base Station'
  });

  // Checkpoint Logs
  const [checkpointLogs, setCheckpointLogs] = useState([]);

  // Animation Refs (60 FPS Performance)
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);
  const simSecondsRef = useRef(0);
  const isPlayingRef = useRef(false);
  const speedRef = useRef(5);
  const followUnitRef = useRef(false);
  const lastReactUpdateRef = useRef(0);
  const visitedOrdersRef = useRef(new Set());
  const activeHaltIndexRef = useRef(-1);

  // Leaflet Marker Direct Refs
  const unit1MarkerRef = useRef(null);
  const unit2MarkerRef = useRef(null);
  const ghostMarkerRef = useRef(null);

  // Follow coordinate state for map.panTo
  const [followCoords, setFollowCoords] = useState(null);

  // Visited orders state for React rendering
  const [visitedOrdersState, setVisitedOrdersState] = useState(new Set());
  const [activeHaltOrder, setActiveHaltOrder] = useState(null);

  // Synchronize playback refs with state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    speedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    followUnitRef.current = followUnit;
  }, [followUnit]);

  // Load Beats on mount
  useEffect(() => {
    const fetchBeats = async () => {
      try {
        const data = await api.getBeats();
        setBeats(data);
        if (data.length > 0) {
          setSelectedBeatId(data[0].id);
        }
      } catch (e) {
        console.error("Failed to load beats:", e);
      }
    };
    fetchBeats();
  }, []);

  // Fetch Beat Candidates & Pre-generation geometry whenever selected beat changes
  const loadBeatCandidates = useCallback(async (beatId) => {
    if (!beatId) return;
    try {
      const data = await api.getBeatCandidates(beatId);
      setBeatCandidateInfo(data);
      // Reset current generated route on beat change to show clean pre-generation state
      setCurrentRoute(null);
      setRouteUnit2(null);
      setIsPlaying(false);
      setSliderProgress(0);
      simSecondsRef.current = 0;
      visitedOrdersRef.current = new Set();
      setVisitedOrdersState(new Set());
      setCheckpointLogs([]);
      setActiveHaltOrder(null);
    } catch (e) {
      console.error("Failed to load beat candidate checkpoints:", e);
    }
  }, []);

  useEffect(() => {
    if (selectedBeatId) {
      loadBeatCandidates(selectedBeatId);
    }
  }, [selectedBeatId, loadBeatCandidates]);

  // Selected beat object
  const selectedBeat = useMemo(() => {
    return beats.find(b => b.id === parseInt(selectedBeatId));
  }, [beats, selectedBeatId]);

  // Compute map bounds (beat boundary + station + candidates)
  const mapFitBounds = useMemo(() => {
    const pts = [];
    if (beatCandidateInfo?.boundary) {
      beatCandidateInfo.boundary.forEach(p => pts.push([p[1], p[0]]));
    } else if (selectedBeat?.boundary_geojson) {
      const coords = typeof selectedBeat.boundary_geojson === 'string'
        ? JSON.parse(selectedBeat.boundary_geojson).coordinates[0]
        : selectedBeat.boundary_geojson.coordinates[0];
      coords.forEach(p => pts.push([p[1], p[0]]));
    }
    if (beatCandidateInfo?.station_lat && beatCandidateInfo?.station_lon) {
      pts.push([beatCandidateInfo.station_lat, beatCandidateInfo.station_lon]);
    }
    if (currentRoute?.waypoints) {
      currentRoute.waypoints.forEach(w => pts.push([w.latitude, w.longitude]));
    }
    return pts.length > 0 ? pts : null;
  }, [beatCandidateInfo, selectedBeat, currentRoute]);

  // ==========================================
  // ROUTE OPTIMIZATION TRIGGER
  // ==========================================

  const handleOptimize = async () => {
    if (!selectedBeatId) return;
    setLoading(true);
    setStatusMessage('');
    setIsPlaying(false);
    simSecondsRef.current = 0;
    setSliderProgress(0);
    visitedOrdersRef.current = new Set();
    setVisitedOrdersState(new Set());
    setCheckpointLogs([]);
    setActiveHaltOrder(null);

    try {
      const res = await api.optimizeRoute({
        beat_id: parseInt(selectedBeatId),
        shift,
        unit_type: unitType,
        max_duration_min: maxDuration
      });

      setCurrentRoute(res);
      setEditableWaypoints(res.waypoints || []);
      setOfficerNotes(res.officer_notes || '');
      setStatusMessage('Patrol route successfully generated via Orienteering algorithm.');

      // If multi-unit is requested, also generate Unit 2 (Motorbike loop)
      if (multiUnit) {
        try {
          const res2 = await api.optimizeRoute({
            beat_id: parseInt(selectedBeatId),
            shift,
            unit_type: 'Motorbike Patrol',
            max_duration_min: Math.max(120, maxDuration - 60)
          });
          setRouteUnit2(res2);
        } catch (e2) {
          console.warn("Secondary unit optimization skipped:", e2);
        }
      } else {
        setRouteUnit2(null);
      }
    } catch (e) {
      console.error("Optimization error:", e);
      setStatusMessage('Failed to optimize route. Please verify beat constraints.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // SCHEDULE & TIMELINE COMPUTATION
  // ==========================================

  // Dense coordinate paths & distance lookups
  const pathData1 = useMemo(() => {
    if (!currentRoute?.waypoints || currentRoute.waypoints.length === 0) return null;
    const dense = currentRoute.path && currentRoute.path.length > 5
      ? currentRoute.path
      : interpolateDensePath(currentRoute.waypoints, 35.0);
    const lookup = buildDistanceLookup(dense);
    return { dense, lookup };
  }, [currentRoute]);

  const baselinePathData = useMemo(() => {
    if (!currentRoute?.baseline_waypoints || currentRoute.baseline_waypoints.length === 0) return null;
    const dense = currentRoute.baseline_path && currentRoute.baseline_path.length > 5
      ? currentRoute.baseline_path
      : interpolateDensePath(currentRoute.baseline_waypoints, 50.0);
    const lookup = buildDistanceLookup(dense);
    return { dense, lookup };
  }, [currentRoute]);

  const pathData2 = useMemo(() => {
    if (!routeUnit2?.waypoints || routeUnit2.waypoints.length === 0) return null;
    const dense = routeUnit2.path && routeUnit2.path.length > 5
      ? routeUnit2.path
      : interpolateDensePath(routeUnit2.waypoints, 35.0);
    const lookup = buildDistanceLookup(dense);
    return { dense, lookup };
  }, [routeUnit2]);

  // Compute Checkpoint Distance Markers & Halts
  const timelineSchedule = useMemo(() => {
    if (!pathData1 || !currentRoute?.waypoints) return null;

    const waypoints = currentRoute.waypoints;
    const { dense, lookup } = pathData1;
    const speedKmh = unitType === 'Motorbike Patrol' ? 30.0 : 25.0;

    // Find path index for each waypoint
    const wpSchedule = [];
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      let bestIdx = 0;
      let minD = Infinity;
      for (let k = 0; k < dense.length; k++) {
        const d = haversineDistanceKm(wp.latitude, wp.longitude, dense[k][0], dense[k][1]);
        if (d < minD) {
          minD = d;
          bestIdx = k;
        }
      }
      wpSchedule.push({
        wp,
        pathIdx: bestIdx,
        distKm: lookup.distances[bestIdx] || 0,
        haltMin: wp.estimated_stop_min || 15
      });
    }

    // Build timeline blocks: [Transit 0->1, Halt at 1, Transit 1->2, Halt at 2, ...]
    const blocks = [];
    let curSimSec = 0;

    for (let i = 0; i < wpSchedule.length; i++) {
      const cur = wpSchedule[i];
      if (i > 0) {
        const prev = wpSchedule[i - 1];
        const segDistKm = Math.max(0, cur.distKm - prev.distKm);
        const transitSec = (segDistKm / speedKmh) * 3600;

        blocks.push({
          type: 'TRANSIT',
          fromWp: prev.wp,
          toWp: cur.wp,
          startSec: curSimSec,
          endSec: curSimSec + transitSec,
          fromDist: prev.distKm,
          toDist: cur.distKm,
          segDistKm
        });
        curSimSec += transitSec;
      }

      // Halt block (except return to base end of shift)
      if (i > 0 && i < wpSchedule.length - 1 && cur.haltMin > 0) {
        const haltSec = cur.haltMin * 60;
        blocks.push({
          type: 'HALT',
          wp: cur.wp,
          startSec: curSimSec,
          endSec: curSimSec + haltSec,
          distKm: cur.distKm
        });
        curSimSec += haltSec;
      }
    }

    return {
      wpSchedule,
      blocks,
      totalSimSec: curSimSec,
      totalDistanceKm: lookup.totalDistance,
      baseHour: SHIFT_START_HOURS[shift] || 6
    };
  }, [pathData1, currentRoute, unitType, shift]);

  // ==========================================
  // PLAYBACK INTERPOLATION & 60 FPS ENGINE
  // ==========================================

  const getPositionAtSec = useCallback((schedule, pathData, currentSec) => {
    if (!schedule || !pathData) return null;
    const { dense, lookup } = pathData;
    const { blocks, totalSimSec } = schedule;

    const clampedSec = Math.max(0, Math.min(totalSimSec, currentSec));

    // Find active block
    let activeBlock = blocks[0];
    for (let i = 0; i < blocks.length; i++) {
      if (clampedSec >= blocks[i].startSec && clampedSec <= blocks[i].endSec) {
        activeBlock = blocks[i];
        break;
      }
    }

    if (!activeBlock) {
      const lastPt = dense[dense.length - 1];
      return {
        lat: lastPt[0],
        lon: lastPt[1],
        bearing: 0,
        distanceCoveredKm: lookup.totalDistance,
        activeHaltWp: null,
        statusDesc: 'Patrol Shift Completed — Logged at Base Station',
        visitedWpOrders: schedule.wpSchedule.map(s => s.wp.order)
      };
    }

    if (activeBlock.type === 'HALT') {
      const wp = activeBlock.wp;
      const haltRemainingMin = Math.ceil((activeBlock.endSec - clampedSec) / 60);
      return {
        lat: wp.latitude,
        lon: wp.longitude,
        bearing: 0,
        distanceCoveredKm: activeBlock.distKm,
        activeHaltWp: wp,
        statusDesc: `Stationary Inspection: ${wp.name} (${haltRemainingMin}m remaining)`,
        visitedWpOrders: schedule.wpSchedule.filter(s => s.distKm <= activeBlock.distKm).map(s => s.wp.order)
      };
    }

    // Transit block: interpolate between fromDist and toDist
    const segT = (clampedSec - activeBlock.startSec) / Math.max(0.001, (activeBlock.endSec - activeBlock.startSec));
    const targetDist = activeBlock.fromDist + segT * activeBlock.segDistKm;

    // Find index in lookup
    let idx = 0;
    while (idx < lookup.distances.length - 1 && lookup.distances[idx + 1] < targetDist) {
      idx++;
    }

    const p1 = dense[idx];
    const p2 = dense[Math.min(dense.length - 1, idx + 1)];
    const d1 = lookup.distances[idx];
    const d2 = lookup.distances[Math.min(dense.length - 1, idx + 1)];
    const subT = d2 > d1 ? (targetDist - d1) / (d2 - d1) : 0;

    const curLat = p1[0] + (p2[0] - p1[0]) * subT;
    const curLon = p1[1] + (p2[1] - p1[1]) * subT;
    const bearing = calculateBearing(p1[0], p1[1], p2[0], p2[1]);

    const distRemaining = Math.max(0, activeBlock.toDist - targetDist).toFixed(1);

    return {
      lat: curLat,
      lon: curLon,
      bearing,
      distanceCoveredKm: targetDist,
      activeHaltWp: null,
      statusDesc: `En route to Stop #${activeBlock.toWp.order}: ${activeBlock.toWp.name} (${distRemaining} km)`,
      visitedWpOrders: schedule.wpSchedule.filter(s => s.distKm <= targetDist - 0.05).map(s => s.wp.order)
    };
  }, []);

  // Ghost Baseline Position
  const getGhostPositionAtSec = useCallback((currentSec) => {
    if (!baselinePathData || !timelineSchedule) return null;
    const { dense, lookup } = baselinePathData;
    const frac = Math.min(1.0, currentSec / Math.max(1, timelineSchedule.totalSimSec));
    const targetDist = frac * lookup.totalDistance;

    let idx = 0;
    while (idx < lookup.distances.length - 1 && lookup.distances[idx + 1] < targetDist) {
      idx++;
    }
    const p1 = dense[idx];
    const p2 = dense[Math.min(dense.length - 1, idx + 1)];
    const d1 = lookup.distances[idx];
    const d2 = lookup.distances[Math.min(dense.length - 1, idx + 1)];
    const subT = d2 > d1 ? (targetDist - d1) / (d2 - d1) : 0;

    const curLat = p1[0] + (p2[0] - p1[0]) * subT;
    const curLon = p1[1] + (p2[1] - p1[1]) * subT;
    const bearing = calculateBearing(p1[0], p1[1], p2[0], p2[1]);

    return { lat: curLat, lon: curLon, bearing };
  }, [baselinePathData, timelineSchedule]);

  // ==========================================
  // REQUEST-ANIMATION-FRAME ENGINE
  // ==========================================

  useEffect(() => {
    if (!timelineSchedule || !pathData1) return;

    let frameId;

    const animateLoop = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaSec = (timestamp - lastTimeRef.current) / 1000.0;
      lastTimeRef.current = timestamp;

      if (isPlayingRef.current) {
        // Advance simulation clock
        const addedSimSec = deltaSec * speedRef.current;
        simSecondsRef.current += addedSimSec;

        if (simSecondsRef.current >= timelineSchedule.totalSimSec) {
          simSecondsRef.current = timelineSchedule.totalSimSec;
          setIsPlaying(false);
        }
      }

      // Compute current unit position
      const pos1 = getPositionAtSec(timelineSchedule, pathData1, simSecondsRef.current);
      if (pos1) {
        // Direct Marker setLatLng & Bearing Rotation (60 FPS)
        if (unit1MarkerRef.current) {
          unit1MarkerRef.current.setLatLng([pos1.lat, pos1.lon]);
          const el = unit1MarkerRef.current.getElement();
          if (el) {
            const inner = el.querySelector('.vehicle-inner-icon');
            if (inner) inner.style.transform = `rotate(${Math.round(pos1.bearing)}deg)`;
          }
        }

        // Camera Follow
        if (followUnitRef.current) {
          setFollowCoords([pos1.lat, pos1.lon]);
        }

        // Checkpoint arrival toast logging
        if (pos1.activeHaltWp) {
          const wpOrder = pos1.activeHaltWp.order;
          if (!visitedOrdersRef.current.has(wpOrder)) {
            visitedOrdersRef.current.add(wpOrder);
            const timeStr = formatSimClock(timelineSchedule.baseHour, simSecondsRef.current);
            setCheckpointLogs(prev => [
              {
                time: timeStr,
                order: wpOrder,
                name: pos1.activeHaltWp.name,
                risk: pos1.activeHaltWp.risk_score
              },
              ...prev.slice(0, 15)
            ]);
          }
        }

        // Update Ghost Unit marker if compare mode is enabled
        if (ghostMarkerRef.current && baselinePathData) {
          const ghostPos = getGhostPositionAtSec(simSecondsRef.current);
          if (ghostPos) {
            ghostMarkerRef.current.setLatLng([ghostPos.lat, ghostPos.lon]);
            const gEl = ghostMarkerRef.current.getElement();
            if (gEl) {
              const gInner = gEl.querySelector('.vehicle-inner-icon');
              if (gInner) gInner.style.transform = `rotate(${Math.round(ghostPos.bearing)}deg)`;
            }
          }
        }

        // Throttle React State Updates for Telemetry Panel (~4Hz = 250ms)
        if (timestamp - lastReactUpdateRef.current > 240) {
          lastReactUpdateRef.current = timestamp;

          const progressFrac = Math.min(1.0, simSecondsRef.current / Math.max(1, timelineSchedule.totalSimSec));
          setSliderProgress(Math.round(progressFrac * 1000));

          const clockStr = formatSimClock(timelineSchedule.baseHour, simSecondsRef.current);
          const visitedList = pos1.visitedWpOrders || [];
          setVisitedOrdersState(new Set(visitedList));
          setActiveHaltOrder(pos1.activeHaltWp ? pos1.activeHaltWp.order : null);

          const visitedCount = visitedList.length;
          const totalWp = currentRoute.waypoints.length;
          const riskAccum = Math.round(Math.min(currentRoute.risk_covered_pct, (visitedCount / totalWp) * currentRoute.risk_covered_pct + 12));

          setTelemetry({
            simClock: clockStr,
            distanceCoveredKm: parseFloat(pos1.distanceCoveredKm.toFixed(1)),
            totalDistanceKm: currentRoute.total_distance_km,
            elapsedMin: Math.floor(simSecondsRef.current / 60),
            totalDurationMin: Math.floor(currentRoute.estimated_duration_min),
            visitedCount,
            totalCheckpoints: totalWp,
            riskCoveredPct: riskAccum,
            currentSegmentDesc: pos1.statusDesc
          });
        }
      }

      frameId = requestAnimationFrame(animateLoop);
    };

    frameId = requestAnimationFrame(animateLoop);
    return () => {
      cancelAnimationFrame(frameId);
      lastTimeRef.current = null;
    };
  }, [timelineSchedule, pathData1, getPositionAtSec, getGhostPositionAtSec, baselinePathData, currentRoute]);

  // Scrub Slider change
  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value);
    setSliderProgress(val);
    if (timelineSchedule) {
      const targetSec = (val / 1000) * timelineSchedule.totalSimSec;
      simSecondsRef.current = targetSec;
    }
  };

  const handleRestart = () => {
    setIsPlaying(false);
    simSecondsRef.current = 0;
    setSliderProgress(0);
    visitedOrdersRef.current = new Set();
    setVisitedOrdersState(new Set());
    setCheckpointLogs([]);
    setActiveHaltOrder(null);
  };

  // ==========================================
  // TRAVELED VS REMAINING POLYLINES & COMET
  // ==========================================

  const { traveledCoords, remainingCoords, cometCoords } = useMemo(() => {
    if (!pathData1) return { traveledCoords: [], remainingCoords: [], cometCoords: [] };
    const { dense, lookup } = pathData1;
    const curDist = telemetry.distanceCoveredKm;

    let cutIdx = 0;
    while (cutIdx < dense.length - 1 && lookup.distances[cutIdx] < curDist) {
      cutIdx++;
    }

    const traveled = dense.slice(0, cutIdx + 1);
    const remaining = dense.slice(Math.max(0, cutIdx));
    const comet = dense.slice(Math.max(0, cutIdx - 6), cutIdx + 1);

    return { traveledCoords: traveled, remainingCoords: remaining, cometCoords: comet };
  }, [pathData1, telemetry.distanceCoveredKm]);

  // ==========================================
  // HUMAN-IN-THE-LOOP OVERRIDE & EDIT MODE
  // ==========================================

  const handleOverride = async (actionStatus) => {
    if (!currentRoute) return;
    try {
      const res = await api.overrideRoute(currentRoute.id, {
        status: actionStatus,
        officer_notes: officerNotes || `${actionStatus} by officer on duty.`,
        modified_waypoints: isEditMode ? editableWaypoints : null
      });
      setCurrentRoute(res);
      setStatusMessage(`Route ${actionStatus.toUpperCase()} recorded in compliance audit log.`);
      setIsEditMode(false);
    } catch (e) {
      console.error("Override error:", e);
      setStatusMessage("Failed to log route override.");
    }
  };

  const handleMarkerDragEnd = (event, order) => {
    const { lat, lng } = event.target.getLatLng();
    setEditableWaypoints(prev =>
      prev.map(w => w.order === order ? { ...w, latitude: lat, longitude: lng } : w)
    );
  };

  const handleRecalculateEdited = () => {
    if (!editableWaypoints || editableWaypoints.length === 0) return;
    const newPath = interpolateDensePath(editableWaypoints, 35.0);
    const lookup = buildDistanceLookup(newPath);
    setCurrentRoute(prev => ({
      ...prev,
      waypoints: editableWaypoints,
      path: newPath,
      total_distance_km: parseFloat(lookup.totalDistance.toFixed(2))
    }));
    setStatusMessage('Waypoints relocated. Recomputed smooth patrol trajectory.');
  };

  return (
    <div className="space-y-4">
      {/* Disclaimer Banner */}
      <DisclaimerBanner message="Patrol route optimization uses prize-collecting orienteering to maximize preventive coverage under shift time constraints. Officers retain full authority to accept, modify, or reject any route." />

      {/* Control Filters Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-bold font-heading text-slate-100 flex items-center gap-2">
                <Route className="w-5 h-5 text-blue-500" />
                <span>Beat Patrol Route Optimizer</span>
              </h1>
              <SimulatedBadge />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Prize-collecting orienteering algorithm with live simulated patrol playback, multi-unit support, and baseline comparison
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOptimize}
              disabled={loading || !selectedBeatId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-blue-600/30 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>{currentRoute ? 'Re-Generate Optimal Route' : 'Generate Optimal Route'}</span>
            </button>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Target Beat</label>
            <select
              value={selectedBeatId}
              onChange={(e) => setSelectedBeatId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
            >
              {beats.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.priority_level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Operational Shift</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="Morning">Morning Shift (06:00 - 14:00)</option>
              <option value="Evening">Evening Shift (14:00 - 22:00)</option>
              <option value="Night">Night Shift (22:00 - 06:00)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Patrol Unit Vehicle</label>
            <select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="PCR Van">PCR Van (15 min stationary halts)</option>
              <option value="Motorbike Patrol">Motorbike Patrol (10 min halts)</option>
              <option value="Foot Patrol">Foot Patrol (Dense Markets)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 font-medium mb-1">
              <span>Max Duration</span>
              <span className="text-blue-400 font-bold">{maxDuration} min</span>
            </div>
            <input
              type="range"
              min="120"
              max="360"
              step="30"
              value={maxDuration}
              onChange={(e) => setMaxDuration(parseInt(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer mt-1"
            />
          </div>
        </div>

        {/* Feature Toggles Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={compareBaseline}
                onChange={(e) => setCompareBaseline(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
              />
              <span>Compare with Baseline Perimeter Loop (Ghost Unit)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={multiUnit}
                onChange={(e) => setMultiUnit(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-0"
              />
              <span>Multi-Unit Patrol (PCR Van + Motorbike)</span>
            </label>
          </div>

          {currentRoute && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                isEditMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Exit Edit Mode' : 'Edit Waypoints (Drag & Drop)'}</span>
            </button>
          )}
        </div>

        {statusMessage && (
          <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-800/40 text-blue-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            {isEditMode && (
              <button
                onClick={handleRecalculateEdited}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold"
              >
                Recalculate Route Path
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Map & Live Telemetry Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Map Column */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 shadow-xl space-y-3">
            {/* Map Header Status Indicator */}
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-300 font-semibold">
                  {currentRoute ? 'Active Patrol Trajectory' : 'Pre-Generation Beat Context'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">
                  {beatCandidateInfo?.beat_name || selectedBeat?.name || 'Raipur Central'}
                </span>
              </div>

              {/* Digital Simulated Shift Clock */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 font-mono text-xs">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">SHIFT TIME:</span>
                <strong className="text-cyan-300 tracking-wider">{telemetry.simClock}</strong>
              </div>
            </div>

            {/* Leaflet Map Container */}
            <div className="h-[500px] rounded-xl overflow-hidden border border-slate-800 relative z-0">
              <MapContainer center={RAIPUR_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
                {/* Clean OpenStreetMap Tiles with Soft Light-Gray Look */}
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Map Auto-FitBounds Controller */}
                <MapBoundsController
                  bounds={mapFitBounds}
                  followCoords={followCoords}
                  isFollowing={followUnit}
                />

                {/* Selected Beat Polygon: Soft purple fill, dashed border */}
                {beatCandidateInfo?.boundary && (
                  <Polygon
                    positions={beatCandidateInfo.boundary.map(p => [p[1], p[0]])}
                    pathOptions={{
                      color: '#a855f7',
                      fillColor: '#8b5cf6',
                      fillOpacity: 0.12,
                      weight: 2,
                      dashArray: '6, 6'
                    }}
                  >
                    <LeafletTooltip sticky>
                      <span className="font-semibold text-xs">{beatCandidateInfo.beat_name}</span>
                    </LeafletTooltip>
                  </Polygon>
                )}

                {/* Faint Risk Cells Inside Beat (Micro-Choropleth) */}
                {beatCandidateInfo?.faint_risk_cells?.map((c, idx) => (
                  <Polygon
                    key={idx}
                    positions={c.polygon.map(p => [p[1], p[0]])}
                    pathOptions={{
                      color: 'rgba(255, 255, 255, 0.15)',
                      fillColor: c.risk_bucket === 'Very High' ? '#ef4444' : (c.risk_bucket === 'High' ? '#f97316' : '#10b981'),
                      fillOpacity: 0.18,
                      weight: 1
                    }}
                  />
                ))}

                {/* Police Station Base Marker */}
                {beatCandidateInfo?.station_lat && (
                  <Marker
                    position={[beatCandidateInfo.station_lat, beatCandidateInfo.station_lon]}
                    icon={createCheckpointIcon(1, 0, false, false, true)}
                  >
                    <Popup>
                      <div className="p-1 space-y-1">
                        <div className="font-bold text-xs text-blue-400">★ Police Station Base</div>
                        <div className="text-xs text-slate-200">{beatCandidateInfo.station_name}</div>
                        <div className="text-[10px] text-slate-400">Shift Briefing & Patrol Vehicle Staging Hub</div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Candidate Checkpoints (Pre-Generation: Small Gray Numbered Dots) */}
                {!currentRoute && beatCandidateInfo?.candidate_checkpoints?.map((cand) => (
                  <Marker
                    key={cand.order}
                    position={[cand.latitude, cand.longitude]}
                    icon={createCandidateIcon(cand.order)}
                  >
                    <Popup>
                      <div className="p-1 space-y-1">
                        <div className="font-bold text-xs text-slate-300">Candidate #{cand.order}: {cand.name}</div>
                        <div className="text-[11px] text-slate-400">Estimated Risk: {cand.risk_score}</div>
                        <div className="text-[10px] text-slate-500">Planned Stop: {cand.estimated_stop_min} min</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Baseline Comparison Route (Thin Gray Dashed Line) */}
                {compareBaseline && baselinePathData?.dense && (
                  <Polyline
                    positions={baselinePathData.dense}
                    pathOptions={{
                      color: '#94a3b8',
                      weight: 3,
                      opacity: 0.65,
                      dashArray: '6, 8'
                    }}
                  />
                )}

                {/* Ghost Baseline Patrol Unit Marker */}
                {compareBaseline && baselinePathData && (
                  <Marker
                    ref={ghostMarkerRef}
                    position={[baselinePathData.dense[0][0], baselinePathData.dense[0][1]]}
                    icon={createVehicleIcon('#94a3b8', true, 'PCR Van')}
                  />
                )}

                {/* Secondary Unit Route (Motorbike in Multi-Unit Mode: Amber Glow) */}
                {multiUnit && pathData2?.dense && (
                  <>
                    <Polyline
                      positions={pathData2.dense}
                      pathOptions={{
                        color: '#f59e0b',
                        weight: 16,
                        opacity: 0.18
                      }}
                    />
                    <Polyline
                      positions={pathData2.dense}
                      pathOptions={{
                        color: '#f59e0b',
                        weight: 6,
                        opacity: 0.85
                      }}
                    />
                  </>
                )}

                {/* Secondary Unit Vehicle Marker */}
                {multiUnit && pathData2 && (
                  <Marker
                    ref={unit2MarkerRef}
                    position={[pathData2.dense[0][0], pathData2.dense[0][1]]}
                    icon={createVehicleIcon('#f59e0b', false, 'Motorbike Patrol')}
                  />
                )}

                {/* Optimized Route Lines (After Generation) */}
                {currentRoute && (
                  <>
                    {/* Soft Ambient Glow Polyline Underneath (18px, 22% opacity) */}
                    <Polyline
                      positions={pathData1?.dense || []}
                      pathOptions={{
                        color: '#06b6d4',
                        weight: 18,
                        opacity: 0.22,
                        lineCap: 'round',
                        lineJoin: 'round'
                      }}
                    />

                    {/* Remaining Route: Dashed Dim Cyan */}
                    <Polyline
                      positions={remainingCoords}
                      pathOptions={{
                        color: '#38bdf8',
                        weight: 5,
                        opacity: 0.45,
                        dashArray: '8, 8'
                      }}
                    />

                    {/* Traveled Route: Solid Bright Cyan */}
                    <Polyline
                      positions={traveledCoords}
                      pathOptions={{
                        color: '#22d3ee',
                        weight: 8,
                        opacity: 0.95,
                        lineCap: 'round',
                        lineJoin: 'round'
                      }}
                    />

                    {/* Comet Trail Polyline Behind Vehicle */}
                    {cometCoords.length > 1 && (
                      <Polyline
                        positions={cometCoords}
                        pathOptions={{
                          color: '#ffffff',
                          weight: 9,
                          opacity: 0.85,
                          lineCap: 'round'
                        }}
                      />
                    )}
                  </>
                )}

                {/* Animated Patrol Vehicle Marker (PCR Van) */}
                {currentRoute && pathData1 && (
                  <Marker
                    ref={unit1MarkerRef}
                    position={[pathData1.dense[0][0], pathData1.dense[0][1]]}
                    icon={createVehicleIcon('#06b6d4', false, unitType)}
                  />
                )}

                {/* Route Checkpoint Markers */}
                {currentRoute?.waypoints?.map((wp, idx) => {
                  const isStation = idx === 0 || idx === currentRoute.waypoints.length - 1;
                  const isVisited = visitedOrdersState.has(wp.order);
                  const isCurrentHalt = activeHaltOrder === wp.order;

                  return (
                    <Marker
                      key={wp.order}
                      position={[wp.latitude, wp.longitude]}
                      draggable={isEditMode}
                      eventHandlers={{
                        dragend: (e) => handleMarkerDragEnd(e, wp.order)
                      }}
                      icon={createCheckpointIcon(
                        wp.order,
                        wp.risk_score,
                        isVisited,
                        isCurrentHalt,
                        isStation,
                        multiUnit && idx % 3 === 0
                      )}
                    >
                      <Popup>
                        <div className="p-1 space-y-1">
                          <div className="font-bold text-xs text-cyan-300">
                            {isStation ? 'Base Police Station' : `Stop #${wp.order}: ${wp.name}`}
                          </div>
                          <div className="text-xs text-slate-300">Stationary Halt: {wp.estimated_stop_min} min</div>
                          <div className="text-xs text-slate-400">Directive: {wp.action_note}</div>
                          <div className="text-[10px] text-amber-400">Area Risk Score: {wp.risk_score}</div>
                          {isEditMode && (
                            <div className="text-[10px] text-amber-300 font-semibold pt-1 border-t border-slate-700">
                              (Draggable: Drag marker to relocate waypoint)
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Playback Controls Strip Under Map */}
            {currentRoute && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Play / Pause / Restart */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/30"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                      <span>{isPlaying ? 'Pause Patrol' : 'Play Patrol'}</span>
                    </button>

                    <button
                      onClick={handleRestart}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-all"
                      title="Restart from base"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Speed Selector */}
                    <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
                      {[1, 5, 20, 60].map(s => (
                        <button
                          key={s}
                          onClick={() => setPlaybackSpeed(s)}
                          className={`px-2 py-0.5 rounded transition-all ${
                            playbackSpeed === s
                              ? 'bg-blue-600 text-white font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Camera Follow Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFollowUnit(!followUnit)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                        followUnit
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Follow Unit Camera</span>
                    </button>
                  </div>
                </div>

                {/* Scrub Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Shift Progress: {Math.round(sliderProgress / 10)}%</span>
                    <span className="text-cyan-400 font-semibold">{telemetry.currentSegmentDesc}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={sliderProgress}
                    onChange={handleSliderChange}
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Telemetry, Comparison, Checkpoints & Human Approval */}
        <div className="space-y-4">
          {/* Live Telemetry Panel */}
          {currentRoute && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h2 className="text-xs font-bold font-heading text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
                  <ActivityLogIcon />
                  <span>Patrol Telemetry & Progress</span>
                </h2>
                <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/40 border border-cyan-900/40 px-2 py-0.5 rounded">
                  {unitType}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400">DISTANCE COVERED</span>
                  <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
                    {telemetry.distanceCoveredKm} <span className="text-xs text-slate-400">/ {telemetry.totalDistanceKm} km</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400">ELAPSED TIME</span>
                  <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                    {telemetry.elapsedMin}m <span className="text-xs text-slate-400">/ {telemetry.totalDurationMin}m</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400">CHECKPOINTS VISITED</span>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                    {telemetry.visitedCount} <span className="text-xs text-slate-400">/ {telemetry.totalCheckpoints}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400">RISK COVERED</span>
                  <div className="text-lg font-bold font-mono text-purple-400 mt-0.5">
                    {telemetry.riskCoveredPct}%
                  </div>
                </div>
              </div>

              {/* Baseline Comparison Card (when Compare is active) */}
              {compareBaseline && (
                <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-900/30 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-400" />
                      <span>Optimized vs Baseline Gain</span>
                    </span>
                    <span className="text-emerald-400 font-mono">
                      +{Math.round(currentRoute.risk_covered_pct - currentRoute.baseline_risk_covered_pct)}% Risk
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Distance: <strong className="text-white">{currentRoute.total_distance_km} km</strong> vs {currentRoute.baseline_distance_km} km perimeter (
                    <span className="text-emerald-400 font-semibold">
                      {Math.max(0, Math.round(((currentRoute.baseline_distance_km - currentRoute.total_distance_km) / currentRoute.baseline_distance_km) * 100))}% distance saved
                    </span>)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Checkpoint Dispatch Logs */}
          {currentRoute && checkpointLogs.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
              <h3 className="text-xs font-bold font-heading text-slate-100 flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span>Checkpoint Arrival Log</span>
                <span className="text-[10px] text-slate-400 font-mono">LIVE TOAST</span>
              </h3>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {checkpointLogs.map((log, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-cyan-400 text-[10px]">{log.time}</span>
                      <span className="text-slate-300 truncate">Stop #{log.order}: {log.name}</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono shrink-0">Risk {log.risk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checkpoint Sequence & Draggable List */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold font-heading text-slate-100 uppercase tracking-wider">
                Planned Waypoint Sequence
              </h3>
              {currentRoute && (
                <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                  currentRoute.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-300' :
                  (currentRoute.status === 'Rejected' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300')
                }`}>
                  Status: {currentRoute.status}
                </span>
              )}
            </div>

            {currentRoute ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                {(isEditMode ? editableWaypoints : currentRoute.waypoints).map((wp) => {
                  const isVisited = visitedOrdersState.has(wp.order);
                  return (
                    <div
                      key={wp.order}
                      className={`p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                        isVisited
                          ? 'bg-emerald-950/15 border-emerald-900/40'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isVisited ? 'bg-emerald-600 text-white' : 'bg-blue-600/30 text-blue-400'
                      }`}>
                        {isVisited ? '✓' : wp.order}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-200 truncate">{wp.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{wp.action_note}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>Halt: {wp.estimated_stop_min} min</span>
                          <span>•</span>
                          <span className="text-amber-400">Risk: {wp.risk_score}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                <Navigation className="w-6 h-6 text-slate-600 mx-auto" />
                <p>Click "Generate Optimal Route" above to compute sequence.</p>
              </div>
            )}

            {/* Human-in-the-Loop Officer Decision Controls */}
            {currentRoute && (
              <div className="pt-3 border-t border-slate-800 space-y-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Officer Deployment Log & Justification
                  </label>
                  <input
                    type="text"
                    value={officerNotes}
                    onChange={(e) => setOfficerNotes(e.target.value)}
                    placeholder="e.g. Approved; heavy evening footfall expected near Sadar Bazaar."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <button
                    onClick={() => handleOverride(isEditMode ? 'Modified' : 'Approved')}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{isEditMode ? 'Save & Accept' : 'Accept Route'}</span>
                  </button>
                  <button
                    onClick={() => handleOverride('Rejected')}
                    className="py-2 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Route</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityLogIcon = () => (
  <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);
