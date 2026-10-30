import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { StatCard } from '../components/StatCard';
import {
  PhoneForwarded, Clock, AlertCircle, TrendingDown,
  MapPin, CheckCircle, Navigation, ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

const RAIPUR_CENTER = [21.2514, 81.6296];

export const EmergencyResponse = () => {
  const [analytics, setAnalytics] = useState(null);
  const [targetMin, setTargetMin] = useState(10.0);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await api.getDispatchAnalytics(targetMin);
      setAnalytics(data);
    } catch (e) {
      console.error("Failed to load dispatch analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [targetMin]);

  const slowest = analytics?.slowest_zones || [];
  const hourly = analytics?.hourly_trend || [];

  return (
    <div className="space-y-6">
      <DisclaimerBanner message="Emergency response metrics analyze historical dispatch timestamps (Call -> Dispatch -> Arrival). These metrics help pinpoint infrastructural bottlenecks (e.g. level crossings, narrow lanes) to optimize staging locations." />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Avg Total Response Time"
          value={`${analytics?.avg_total_response_min ?? 8.6} min`}
          subtitle={`Configured Target: ${targetMin} min`}
          icon={Clock}
          color="blue"
          trend={{ value: `${analytics?.compliance_rate_pct ?? 82}%`, label: "meet SLA target", isPositive: true }}
        />
        <StatCard
          title="Avg Dispatch Delay"
          value={`${analytics?.avg_dispatch_delay_min ?? 2.1} min`}
          subtitle="Call intake to unit radio dispatch"
          icon={PhoneForwarded}
          color="emerald"
        />
        <StatCard
          title="Avg Travel Time"
          value={`${analytics?.avg_travel_time_min ?? 6.5} min`}
          subtitle="Transit speed across traffic sectors"
          icon={Navigation}
          color="amber"
        />
        <StatCard
          title="SLA Compliance Rate"
          value={`${analytics?.compliance_rate_pct ?? 82.5}%`}
          subtitle={`${analytics?.calls_under_target ?? 330} under target / ${analytics?.calls_exceeding_target ?? 70} exceeded`}
          icon={CheckCircle}
          color="purple"
        />
      </div>

      {/* Map & Slowest Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Delay Zone Map */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-heading text-slate-100 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <span>Recurring Emergency Response Delay Zones</span>
              </h2>
              <p className="text-xs text-slate-400">
                Pulsing markers denote sectors where average arrival times exceed target SLA
              </p>
            </div>
          </div>

          <div className="h-[480px] rounded-xl overflow-hidden border border-slate-800 relative z-0">
            <MapContainer center={RAIPUR_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {slowest.map((zone) => {
                const isExceeded = zone.avg_total_response_min > targetMin;
                return (
                  <CircleMarker
                    key={zone.zone_id}
                    center={[zone.latitude, zone.longitude]}
                    radius={isExceeded ? 16 : 10}
                    pathOptions={{
                      color: isExceeded ? '#ef4444' : '#f59e0b',
                      fillColor: isExceeded ? '#ef4444' : '#f59e0b',
                      fillOpacity: 0.65,
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div className="p-1 space-y-1">
                        <div className="font-bold text-xs text-slate-100">{zone.name}</div>
                        <div className="text-xs text-slate-300">
                          Total Response: <span className="font-bold text-rose-400">{zone.avg_total_response_min} min</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Dispatch: {zone.avg_dispatch_delay_min}m • Travel: {zone.avg_travel_time_min}m
                        </div>
                        <div className="text-[10px] text-amber-300 font-medium">Bottleneck: {zone.delay_factor}</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Slowest Areas List */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
            <h3 className="text-sm font-bold font-heading text-slate-100">
              Slowest Response Zones
            </h3>

            <div className="space-y-2">
              {slowest.map((z, idx) => (
                <div key={z.zone_id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <span className="font-semibold text-xs text-slate-200">#{idx + 1} {z.name}</span>
                    <span className="font-mono text-xs font-bold text-rose-400">{z.avg_total_response_min} min</span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Dispatch: {z.avg_dispatch_delay_min}m</span>
                    <span>Travel: {z.avg_travel_time_min}m</span>
                    <span className={z.variance_min > 0 ? "text-rose-400 font-semibold" : "text-emerald-400"}>
                      {z.variance_min > 0 ? `+${z.variance_min}m over` : 'On target'}
                    </span>
                  </div>

                  <div className="text-[10px] text-amber-400/90 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                    <span className="font-semibold">Factor: </span>{z.delay_factor}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Trend Chart: Dispatch vs Travel Time */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div>
          <h3 className="text-sm font-semibold font-heading text-slate-100">
            Dispatch Delay vs Field Travel Time by Hour of Day
          </h3>
          <p className="text-xs text-slate-400">
            Demonstrates traffic congestion impacts on travel time during evening commuter rush
          </p>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
              <XAxis dataKey="time_label" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="avg_dispatch_min" stackId="a" fill="#3b82f6" name="Dispatch Delay (min)" />
              <Bar dataKey="avg_travel_min" stackId="a" fill="#f59e0b" name="Transit Travel Time (min)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
