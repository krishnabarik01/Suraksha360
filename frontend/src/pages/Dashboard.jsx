import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import {
  ShieldAlert, Car, Clock, AlertTriangle, Layers,
  Activity, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Polygon, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

// Custom SVG Icons for Leaflet markers
const createPoliceUnitIcon = (status) => {
  const color = status === 'On Patrol' ? '#10b981' : (status === 'Dispatched' ? '#f59e0b' : '#3b82f6');
  return L.divIcon({
    className: 'custom-unit-icon',
    html: `<div style="background-color: ${color}; width: 26px; height: 26px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px ${color};">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 10.9 2 11v5c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
};

const RAIPUR_CENTER = [21.2514, 81.6296];

export const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [beats, setBeats] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBeats, setShowBeats] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [sumData, beatsData, stationsData] = await Promise.all([
        api.getDashboardSummary(),
        api.getBeats(),
        api.getStations()
      ]);
      setSummary(sumData);
      setBeats(beatsData);
      setStations(stationsData);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000); // Polling refresh
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
        <span>Loading Command Intelligence Dashboard...</span>
      </div>
    );
  }

  const kpis = summary?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <DisclaimerBanner message="Suraksha360 provides area-level risk estimation for preventive patrol deployment only. Predictions are never proof of future crime and strictly exclude individual profiling." />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Incidents (24h Window)"
          value={kpis.incidents_today ?? 14}
          subtitle="Simulated field events recorded"
          icon={Activity}
          color="blue"
          trend={{ value: "-4.2%", label: "vs prior 24h", isPositive: true }}
        />
        <StatCard
          title="Active Patrol Units"
          value={`${kpis.active_units ?? 8} / ${kpis.total_units ?? 10}`}
          subtitle="PCR vans, bikes, foot beats"
          icon={Car}
          color="emerald"
          badge="80% Fielded"
        />
        <StatCard
          title="Avg 112 Response Time"
          value={`${kpis.avg_response_time_min ?? 8.6} min`}
          subtitle={`Target SLA: ${kpis.target_response_time_min ?? 10} min`}
          icon={Clock}
          color="amber"
          trend={{ value: "1.4m faster", label: "than target", isPositive: true }}
        />
        <StatCard
          title="High-Risk Hotspots"
          value={kpis.high_risk_zones ?? 6}
          subtitle="Priority sectors for shift deployment"
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Map Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100 font-heading">
              Raipur Real-Time Command Map
            </h2>
            <p className="text-xs text-slate-400">
              Live unit telemetry, recent field incidents, and beat jurisdictions
            </p>
          </div>

          {/* Map Layer Toggles */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setShowUnits(!showUnits)}
              className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                showUnits ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              Units ({summary?.live_units?.length || 0})
            </button>
            <button
              onClick={() => setShowIncidents(!showIncidents)}
              className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                showIncidents ? 'bg-amber-600/20 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              Incidents ({summary?.live_incidents?.length || 0})
            </button>
            <button
              onClick={() => setShowBeats(!showBeats)}
              className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                showBeats ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              Beats ({beats.length})
            </button>
          </div>
        </div>

        {/* Leaflet Map */}
        <div className="h-[460px] rounded-xl overflow-hidden border border-slate-800 relative z-0">
          <MapContainer center={RAIPUR_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Beat Polygons */}
            {showBeats && beats.map((b) => {
              const coords = b.boundary_geojson.coordinates[0].map(p => [p[1], p[0]]);
              return (
                <Polygon
                  key={b.id}
                  positions={coords}
                  pathOptions={{
                    color: b.priority_level === 'High' ? '#ef4444' : '#3b82f6',
                    fillColor: b.priority_level === 'High' ? '#ef4444' : '#3b82f6',
                    fillOpacity: 0.12,
                    weight: 2,
                    dashArray: '4, 4'
                  }}
                >
                  <Popup>
                    <div className="p-1 space-y-1">
                      <div className="font-bold text-sm text-slate-100">{b.name}</div>
                      <div className="text-xs text-slate-300">Station: {b.station_name}</div>
                      <div className="text-xs text-slate-400">Priority: <span className="font-semibold text-amber-400">{b.priority_level}</span></div>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}

            {/* Police Stations */}
            {stations.map((st) => (
              <Marker
                key={st.id}
                position={[st.latitude, st.longitude]}
                icon={L.divIcon({
                  className: 'station-icon',
                  html: `<div style="background-color: #1e3a8a; width: 30px; height: 30px; border-radius: 8px; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px #3b82f6;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4"/></svg>
                  </div>`,
                  iconSize: [30, 30],
                  iconAnchor: [15, 15]
                })}
              >
                <Popup>
                  <div className="p-1 space-y-1">
                    <div className="font-bold text-sm text-blue-300">{st.name}</div>
                    <div className="text-xs text-slate-300">{st.address}</div>
                    <div className="text-xs text-slate-400">Phone: {st.contact_number}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Live Incidents */}
            {showIncidents && summary?.live_incidents?.map((inc) => {
              const sevColors = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];
              const color = sevColors[inc.severity - 1] || '#f59e0b';
              return (
                <CircleMarker
                  key={inc.id}
                  center={[inc.latitude, inc.longitude]}
                  radius={6 + inc.severity * 1.5}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.7,
                    weight: 2
                  }}
                >
                  <Popup>
                    <div className="p-1 space-y-1">
                      <div className="font-bold text-xs text-slate-100">{inc.category}</div>
                      <div className="text-xs text-slate-300">Severity: {inc.severity} / 5</div>
                      <div className="text-xs text-slate-400">Status: {inc.status}</div>
                      <div className="text-[10px] text-slate-500">{new Date(inc.timestamp).toLocaleString()}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* Live Units */}
            {showUnits && summary?.live_units?.map((u) => (
              <Marker
                key={u.id}
                position={[u.latitude, u.longitude]}
                icon={createPoliceUnitIcon(u.status)}
              >
                <Popup>
                  <div className="p-1 space-y-1">
                    <div className="font-bold text-sm text-slate-100">{u.call_sign}</div>
                    <div className="text-xs text-slate-300">Type: {u.type}</div>
                    <div className="text-xs text-slate-300">Status: <span className="font-semibold text-emerald-400">{u.status}</span></div>
                    <div className="text-xs text-slate-400">Base: {u.station}</div>
                    <div className="text-xs text-slate-400">Speed: {u.speed_kmh} km/h • Battery: {u.battery}%</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents by Hour */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold font-heading text-slate-100">
              Diurnal Pattern: Incidents by Hour of Day
            </h3>
            <p className="text-xs text-slate-400">
              Hourly distribution across Raipur (distinct peaks observed between 18:00 - 01:00 hrs)
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.charts?.by_hour || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 10 }} interval={2} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Incident Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incidents by Category */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold font-heading text-slate-100">
              Incident Breakdown by Category
            </h3>
            <p className="text-xs text-slate-400">
              Vehicle theft and property theft represent largest volume in commercial sectors
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.charts?.by_category || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis dataKey="category" type="category" stroke="#64748b" tick={{ fontSize: 10 }} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Reported Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
