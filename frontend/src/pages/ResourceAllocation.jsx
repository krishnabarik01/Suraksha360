import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { StatCard } from '../components/StatCard';
import {
  Users2, Car, ShieldAlert, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid
} from 'recharts';

export const ResourceAllocation = () => {
  const [shift, setShift] = useState('Morning');
  const [allocation, setAllocation] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllocation = async () => {
    setLoading(true);
    try {
      const data = await api.getResourceAllocation(shift);
      setAllocation(data);
    } catch (e) {
      console.error("Failed to load resource allocation:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocation();
  }, [shift]);

  const totalCurrent = allocation.reduce((acc, b) => acc + b.current_units_assigned, 0);
  const totalRecommended = allocation.reduce((acc, b) => acc + b.recommended_units, 0);
  const netGap = totalRecommended - totalCurrent;

  const chartData = allocation.map(b => ({
    name: b.beat_name.split(' - ')[1] || b.beat_name,
    current: b.current_units_assigned,
    recommended: b.recommended_units
  }));

  return (
    <div className="space-y-6">
      <DisclaimerBanner message="Resource allocation suggestions balance historical incident volume, spatial territory size, and diurnal shift factors. Final roster deployment is decided by the Shift In-Charge." />

      {/* Header and Shift Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div>
          <h1 className="text-base font-bold font-heading text-slate-100 flex items-center gap-2">
            <Users2 className="w-5 h-5 text-indigo-400" />
            <span>Patrol Resource Allocation Support</span>
          </h1>
          <p className="text-xs text-slate-400">
            AI-assisted unit deployment recommendations vs current roster strength
          </p>
        </div>

        {/* Shift Selector */}
        <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
          {['Morning', 'Evening', 'Night'].map((s) => (
            <button
              key={s}
              onClick={() => setShift(s)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                shift === s ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s} Shift
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Currently Deployed Units"
          value={totalCurrent}
          subtitle="PCR Vans & Motorbike Patrols on active roster"
          icon={Car}
          color="blue"
        />
        <StatCard
          title="AI Recommended Fleet"
          value={totalRecommended}
          subtitle={`Optimized for ${shift} shift risk distribution`}
          icon={Users2}
          color="emerald"
        />
        <StatCard
          title="Net Roster Gap"
          value={netGap > 0 ? `-${netGap} Deficit` : (netGap < 0 ? `+${Math.abs(netGap)} Surplus` : 'Balanced')}
          subtitle={netGap > 0 ? "Additional interceptors recommended" : "Adequate baseline coverage"}
          icon={ShieldAlert}
          color={netGap > 0 ? "rose" : "emerald"}
        />
      </div>

      {/* Comparison Bar Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div>
          <h2 className="text-sm font-semibold font-heading text-slate-100">
            Recommended vs Currently Deployed Units by Beat
          </h2>
          <p className="text-xs text-slate-400">
            Highlighting under-patrolled commercial nodes and surplus residential beats
          </p>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="current" fill="#3b82f6" name="Current Deployed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recommended" fill="#10b981" name="AI Recommended" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Granular Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h2 className="text-sm font-semibold font-heading text-slate-100">
          Beat-by-Beat Deployment Rationale
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Beat / Jurisdiction</th>
                <th className="p-3">Risk Level</th>
                <th className="p-3">Current</th>
                <th className="p-3">Recommended</th>
                <th className="p-3">Vehicle Mix</th>
                <th className="p-3">Gap Status</th>
                <th className="p-3">Strategic Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {allocation.map((b) => {
                const gap = b.gap_surplus;
                return (
                  <tr key={b.beat_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-slate-200">{b.beat_name}</div>
                      <div className="text-[10px] text-slate-400">{b.station_name}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.risk_level === 'High Risk' ? 'bg-red-500/20 text-red-300' :
                        (b.risk_level === 'Moderate Risk' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300')
                      }`}>
                        {b.risk_level}
                      </span>
                    </td>
                    <td className="p-3 text-sm font-bold text-slate-200">{b.current_units_assigned}</td>
                    <td className="p-3 text-sm font-bold text-emerald-400">{b.recommended_units}</td>
                    <td className="p-3 text-[11px] text-slate-400">
                      {b.recommended_breakdown['PCR Van']} PCR • {b.recommended_breakdown['Motorbike Patrol']} Bike
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        gap > 0 ? 'bg-rose-500/20 text-rose-300' :
                        (gap < 0 ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400')
                      }`}>
                        {gap > 0 ? `+${gap} Deficit` : (gap < 0 ? `${gap} Surplus` : 'Optimal')}
                      </span>
                    </td>
                    <td className="p-3 text-[11px] text-slate-400 max-w-xs">{b.rationale}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
