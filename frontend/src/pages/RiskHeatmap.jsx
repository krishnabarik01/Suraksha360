import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../api/client';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { SimulatedBadge } from '../components/SimulatedBadge';
import {
  Flame, Filter, Clock, AlertTriangle, ShieldCheck,
  TrendingUp, CheckCircle2, X, Compass, ChevronRight, Layers
} from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Tooltip as LeafletTooltip, CircleMarker, useMap } from 'react-leaflet';

const RAIPUR_CENTER = [21.2514, 81.6296];

// Continuous gradient helper: green -> yellow -> orange -> red
const getContinuousRiskColor = (normScore) => {
  // normScore is 0.0 to 1.0
  const s = Math.max(0, Math.min(1, normScore || 0));
  if (s < 0.35) {
    // 0.0 to 0.35: #10b981 (emerald) -> #84cc16 (lime)
    const t = s / 0.35;
    const r = Math.round(16 + (132 - 16) * t);
    const g = Math.round(185 + (204 - 185) * t);
    const b = Math.round(129 + (22 - 129) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (s < 0.60) {
    // 0.35 to 0.60: #84cc16 -> #eab308 (amber yellow)
    const t = (s - 0.35) / 0.25;
    const r = Math.round(132 + (234 - 132) * t);
    const g = Math.round(204 + (179 - 204) * t);
    const b = Math.round(22 + (8 - 22) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (s < 0.80) {
    // 0.60 to 0.80: #eab308 -> #f97316 (orange)
    const t = (s - 0.60) / 0.20;
    const r = Math.round(234 + (249 - 234) * t);
    const g = Math.round(179 + (115 - 179) * t);
    const b = Math.round(8 + (22 - 8) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // 0.80 to 1.0: #f97316 -> #ef4444 (crimson red)
    const t = (s - 0.80) / 0.20;
    const r = Math.round(249 + (239 - 249) * t);
    const g = Math.round(115 + (68 - 115) * t);
    const b = Math.round(22 + (68 - 22) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
};

// Compute dynamic opacity: 0.15 for low up to 0.65 for very high
const getDynamicOpacity = (normScore) => {
  const s = Math.max(0, Math.min(1, normScore || 0));
  return 0.15 + s * 0.50;
};

const BUCKET_COLORS = {
  'Low': '#10b981',
  'Medium': '#eab308',
  'High': '#f97316',
  'Very High': '#ef4444'
};

// Helper component to fit map bounds & fly to target
function MapController({ bounds, targetCenter }) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (bounds && bounds.length > 0 && !hasFittedRef.current) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      hasFittedRef.current = true;
    }
  }, [bounds, map]);

  useEffect(() => {
    if (targetCenter) {
      map.flyTo(targetCenter, 15, { duration: 1.2 });
    }
  }, [targetCenter, map]);

  return null;
}

export const RiskHeatmap = () => {
  const [gridData, setGridData] = useState(null);
  const [accidents, setAccidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState('next_6h');
  const [shift, setShift] = useState('Evening');
  const [category, setCategory] = useState('all');
  const [viewMode, setViewMode] = useState('crime'); // crime, accident, combined
  const [selectedCell, setSelectedCell] = useState(null);
  const [cellExplanation, setCellExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [targetFlyCoords, setTargetFlyCoords] = useState(null);
  const [hoveredCellId, setHoveredCellId] = useState(null);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const [grid, accs] = await Promise.all([
        api.getRiskGrid(timeWindow, shift, category),
        api.getAccidents(null, 150)
      ]);
      setGridData(grid);
      setAccidents(accs);
    } catch (e) {
      console.error("Failed to load risk grid:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, [timeWindow, shift, category]);

  const handleCellClick = async (cellProps) => {
    setSelectedCell(cellProps);
    setLoadingExplanation(true);
    try {
      const exp = await api.explainCell(cellProps.cell_id);
      setCellExplanation(exp);
    } catch (e) {
      console.error("Error fetching cell explanation:", e);
    } finally {
      setLoadingExplanation(false);
    }
  };

  const handlePriorityCellClick = (cellProps) => {
    handleCellClick(cellProps);
    setTargetFlyCoords([cellProps.center_lat, cellProps.center_lon]);
  };

  // Calculate bucket statistics
  const bucketCounts = useMemo(() => {
    const counts = { 'Very High': 0, 'High': 0, 'Medium': 0, 'Low': 0 };
    if (!gridData?.features) return counts;
    gridData.features.forEach(f => {
      const b = f.properties.risk_bucket;
      if (counts[b] !== undefined) counts[b]++;
    });
    return counts;
  }, [gridData]);

  // Compute Top 5 priority cells by normalized_risk_score
  const topPriorityCells = useMemo(() => {
    if (!gridData?.features) return [];
    return [...gridData.features]
      .sort((a, b) => (b.properties.normalized_risk_score ?? b.properties.risk_score) - (a.properties.normalized_risk_score ?? a.properties.risk_score))
      .slice(0, 5)
      .map(f => f.properties);
  }, [gridData]);

  // Compute grid outer bounds for auto fitBounds
  const gridBounds = useMemo(() => {
    if (!gridData?.features || gridData.features.length === 0) return null;
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    gridData.features.forEach(f => {
      f.geometry.coordinates[0].forEach(([lon, lat]) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
      });
    });
    return [[minLat, minLon], [maxLat, maxLon]];
  }, [gridData]);

  return (
    <div className="space-y-5">
      {/* Disclaimer Banner */}
      <DisclaimerBanner message="Area-level risk estimate, not a prediction about any person. Estimates indicate where preventive patrolling attention may be useful; they never constitute evidence of criminal activity." />

      {/* Control Filters Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-bold font-heading text-slate-100 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span>Predictive Crime Risk Heatmap & Grid Choropleth</span>
              </h1>
              <SimulatedBadge />
            </div>
            <p className="text-xs text-slate-400">
              500-meter micro-cells evaluated via continuous percentile normalization (Top 10% Very High, 15% High, 25% Medium, 50% Low)
            </p>
          </div>

          {/* Mode Toggles */}
          <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setViewMode('crime')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'crime' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Crime Risk Grid
            </button>
            <button
              onClick={() => setViewMode('accident')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'accident' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Accident Density
            </button>
            <button
              onClick={() => setViewMode('combined')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'combined' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Combined Vulnerability
            </button>
          </div>
        </div>

        {/* Dropdown Filters (Changing these visibly shifts hotspots) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Forecast Horizon
            </label>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="next_6h">Next 6 Hours (Immediate Trend)</option>
              <option value="shift">Current Operational Shift</option>
              <option value="weekend">Upcoming Weekend Surge Window</option>
              <option value="24h">Next 24 Hours Outlook</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              Patrol Shift Window
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="Morning">Morning Shift (06:00 - 14:00) • Commute & Transit</option>
              <option value="Evening">Evening Shift (14:00 - 22:00) • Markets & Retail</option>
              <option value="Night">Night Shift (22:00 - 06:00) • Highway & Nightlife Surge</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-400" />
              Category Focus
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="all">All Incident Categories (Aggregate)</option>
              <option value="Vehicle Theft">Vehicle Theft (Parking & Markets)</option>
              <option value="Theft">Property Theft</option>
              <option value="Burglary">Commercial & Residential Burglary</option>
              <option value="Assault">Assault & Altercations</option>
              <option value="Robbery">Robbery (Transit & Outskirts)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid View & Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          {/* Legend with Counts per Bucket */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400">Continuous risk gradient (hover for details, click to inspect)</span>
            <div className="flex items-center gap-2.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-[#10b981]"></span>
                <span className="text-slate-300 font-medium">Low: <strong className="text-emerald-400">{bucketCounts['Low']}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-[#eab308]"></span>
                <span className="text-slate-300 font-medium">Med: <strong className="text-amber-400">{bucketCounts['Medium']}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-[#f97316]"></span>
                <span className="text-slate-300 font-medium">High: <strong className="text-orange-400">{bucketCounts['High']}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-[#ef4444]"></span>
                <span className="text-slate-300 font-medium">Very High: <strong className="text-rose-400">{bucketCounts['Very High']}</strong></span>
              </div>
            </div>
          </div>

          <div className="h-[540px] rounded-xl overflow-hidden border border-slate-800 relative z-0">
            <MapContainer center={RAIPUR_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapController bounds={gridBounds} targetCenter={targetFlyCoords} />

              {/* Grid Cells Choropleth with Continuous Color Gradient & Dynamic Opacity */}
              {(viewMode === 'crime' || viewMode === 'combined') && gridData?.features?.map((feat) => {
                const props = feat.properties;
                const coords = feat.geometry.coordinates[0].map(p => [p[1], p[0]]);
                const normScore = props.normalized_risk_score ?? props.risk_score;
                const fillColor = getContinuousRiskColor(normScore);
                const fillOpacity = getDynamicOpacity(normScore);
                const isSelected = selectedCell?.cell_id === props.cell_id;
                const isHovered = hoveredCellId === props.cell_id;

                return (
                  <Polygon
                    key={props.cell_id}
                    positions={coords}
                    pathOptions={{
                      color: isSelected ? '#ffffff' : (isHovered ? '#60a5fa' : 'rgba(255, 255, 255, 0.25)'),
                      fillColor: fillColor,
                      fillOpacity: isSelected ? 0.78 : (isHovered ? 0.70 : fillOpacity),
                      weight: isSelected ? 3 : (isHovered ? 2 : 1)
                    }}
                    eventHandlers={{
                      click: () => handleCellClick(props),
                      mouseover: () => setHoveredCellId(props.cell_id),
                      mouseout: () => setHoveredCellId(null)
                    }}
                  >
                    <LeafletTooltip sticky className="custom-leaflet-tooltip">
                      <div className="p-1 space-y-1 text-xs">
                        <div className="font-bold text-slate-100 flex items-center justify-between gap-3">
                          <span>{props.cell_id}</span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                            style={{ backgroundColor: `${fillColor}33`, color: fillColor }}
                          >
                            {props.risk_bucket} ({Math.round(normScore * 100)}%)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300">
                          Top Offense: <strong className="text-white">{props.top_category}</strong>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          30d Volume: {props.historical_count_30d} incidents
                        </div>
                        {props.top_contributing_factors?.length > 0 && (
                          <div className="pt-1 border-t border-slate-700/80 space-y-0.5">
                            <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Top Drivers:</div>
                            {props.top_contributing_factors.slice(0, 3).map((f, idx) => (
                              <div key={idx} className="text-[10px] text-slate-300 flex items-center justify-between gap-2">
                                <span className="truncate max-w-[130px]">{f.label}</span>
                                <span className={`font-mono font-semibold shrink-0 ${f.direction === 'increases_risk' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  {f.direction === 'increases_risk' ? '+' : ''}{f.contribution}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </LeafletTooltip>
                  </Polygon>
                );
              })}

              {/* Accident Density Overlay */}
              {(viewMode === 'accident' || viewMode === 'combined') && accidents.map((acc) => (
                <CircleMarker
                  key={acc.id}
                  center={[acc.latitude, acc.longitude]}
                  radius={acc.severity === 'fatal' ? 8 : (acc.severity === 'major' ? 6 : 4)}
                  pathOptions={{
                    color: acc.severity === 'fatal' ? '#ef4444' : (acc.severity === 'major' ? '#f97316' : '#eab308'),
                    fillColor: acc.severity === 'fatal' ? '#ef4444' : (acc.severity === 'major' ? '#f97316' : '#eab308'),
                    fillOpacity: 0.7,
                    weight: 1
                  }}
                />
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Right Column: Top 5 Priority Cells + Explainable Intelligence */}
        <div className="space-y-4">
          {/* Top 5 Priority Cells Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-xs font-bold font-heading text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
                <Flame className="w-4 h-4 text-red-500" />
                <span>Top 5 Priority Patrol Cells</span>
              </h2>
              <span className="text-[10px] text-slate-500">Click to fly & zoom</span>
            </div>

            <div className="space-y-2">
              {topPriorityCells.map((cell, idx) => {
                const norm = cell.normalized_risk_score ?? cell.risk_score;
                const color = getContinuousRiskColor(norm);
                const isSelected = selectedCell?.cell_id === cell.cell_id;
                return (
                  <div
                    key={cell.cell_id}
                    onClick={() => handlePriorityCellClick(cell)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 shadow-md'
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center font-mono shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-slate-200 truncate">{cell.cell_id}</div>
                        <div className="text-[10px] text-slate-400 truncate">{cell.top_category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-bold font-mono"
                        style={{ backgroundColor: `${color}25`, color }}
                      >
                        {Math.round(norm * 100)}%
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explainability & Advisory Drawer */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-start justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-xs font-bold font-heading text-slate-100 uppercase tracking-wider">
                  Explainable Cell Intelligence
                </h3>
                <p className="text-[11px] text-slate-400">
                  Feature attribution and preventive patrol guidance
                </p>
              </div>
              {selectedCell && (
                <button
                  onClick={() => setSelectedCell(null)}
                  className="p-1 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {selectedCell ? (
              <div className="space-y-3">
                {/* Cell Identifier Banner */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono">SELECTED CELL</span>
                    <div className="font-mono text-xs font-bold text-slate-200">{selectedCell.cell_id}</div>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: `${BUCKET_COLORS[selectedCell.risk_bucket]}25`,
                      color: BUCKET_COLORS[selectedCell.risk_bucket]
                    }}
                  >
                    {selectedCell.risk_bucket} ({Math.round((selectedCell.normalized_risk_score ?? selectedCell.risk_score) * 100)}%)
                  </span>
                </div>

                {/* Top Contributing Factors */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-blue-400" />
                    Top Contributing Factors (SHAP-Lite)
                  </span>

                  {loadingExplanation ? (
                    <div className="p-3 text-center text-xs text-slate-500 animate-pulse">
                      Computing local attribution...
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {selectedCell.top_contributing_factors?.map((f, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                          <span className="text-slate-300 text-[11px] truncate max-w-[190px]">{f.label}</span>
                          <span className={`font-mono text-[11px] font-semibold shrink-0 ${
                            f.direction === 'increases_risk' ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            {f.direction === 'increases_risk' ? '+' : ''}{f.contribution}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                {cellExplanation?.recommendations && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Preventive Patrol Instructions
                    </span>
                    <ul className="space-y-1">
                      {cellExplanation.recommendations.map((rec, i) => (
                        <li key={i} className="text-[11px] text-slate-300 p-2 rounded-lg bg-blue-950/20 border border-blue-900/30 flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <AlertTriangle className="w-6 h-6 text-slate-600 mx-auto" />
                <p>Click any cell or select from the Top 5 list above to view explainability drivers and preventive advisories.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
