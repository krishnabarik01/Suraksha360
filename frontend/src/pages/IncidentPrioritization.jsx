import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import {
  ListOrdered, AlertOctagon, Clock, ShieldAlert,
  ChevronDown, ChevronUp, Sliders, Plus, Zap, CheckCircle2
} from 'lucide-react';

const INITIAL_QUEUE = [
  {
    id: 1,
    call_number: "112-RPR-202610-0081",
    incident_type: "Armed Robbery in Progress",
    severity: 5,
    life_threat: true,
    vulnerable_location: false,
    waiting_minutes: 8.5,
    latitude: 21.2588,
    longitude: 81.6540,
    description: "Shots fired reported near commercial jewelry market in Pandri"
  },
  {
    id: 2,
    call_number: "112-RPR-202610-0082",
    incident_type: "Vehicle Collision with Injury",
    severity: 4,
    life_threat: true,
    vulnerable_location: true,
    waiting_minutes: 14.0,
    latitude: 21.2590,
    longitude: 81.5710,
    description: "Truck and motorcycle collision on Tatibandh Ring Road flyover"
  },
  {
    id: 3,
    call_number: "112-RPR-202610-0083",
    incident_type: "Domestic Dispute",
    severity: 3,
    life_threat: false,
    vulnerable_location: false,
    waiting_minutes: 22.0,
    latitude: 21.2420,
    longitude: 81.6310,
    description: "Loud altercation and disturbance in Sadar residential sector"
  },
  {
    id: 4,
    call_number: "112-RPR-202610-0084",
    incident_type: "Vandalism / Noise",
    severity: 1,
    life_threat: false,
    vulnerable_location: false,
    waiting_minutes: 4.0,
    latitude: 21.2490,
    longitude: 81.6050,
    description: "Loudspeaker disturbance reported near educational hostel"
  },
  {
    id: 5,
    call_number: "112-RPR-202610-0085",
    incident_type: "Burglary in Progress",
    severity: 4,
    life_threat: false,
    vulnerable_location: true,
    waiting_minutes: 11.5,
    latitude: 21.2380,
    longitude: 81.6420,
    description: "Suspects attempting forced entry at closed godown in Shankar Nagar"
  }
];

export const IncidentPrioritization = () => {
  const [incidents, setIncidents] = useState(INITIAL_QUEUE);
  const [rankedList, setRankedList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [weights, setWeights] = useState({
    severity_weight: 0.30,
    life_threat_weight: 0.35,
    vulnerable_loc_weight: 0.15,
    wait_time_weight: 0.20
  });

  const runRanking = async () => {
    setLoading(true);
    try {
      const data = await api.rankIncidents(incidents, {
        severity_weight: parseFloat(weights.severity_weight),
        life_threat_weight: parseFloat(weights.life_threat_weight),
        vulnerable_loc_weight: parseFloat(weights.vulnerable_loc_weight),
        wait_time_weight: parseFloat(weights.wait_time_weight),
        category_weights: {}
      });
      setRankedList(data);
    } catch (e) {
      console.error("Ranking error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runRanking();
  }, [incidents, weights]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleToggleLifeThreat = (incId) => {
    setIncidents(prev => prev.map(inc => inc.id === incId ? { ...inc, life_threat: !inc.life_threat } : inc));
  };

  const handleToggleVuln = (incId) => {
    setIncidents(prev => prev.map(inc => inc.id === incId ? { ...inc, vulnerable_location: !inc.vulnerable_location } : inc));
  };

  const handleIncreaseWait = (incId) => {
    setIncidents(prev => prev.map(inc => inc.id === incId ? { ...inc, waiting_minutes: inc.waiting_minutes + 5 } : inc));
  };

  const priorityBadgeColors = {
    'Critical': 'bg-red-500/20 text-red-300 border-red-500/40',
    'High': 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    'Medium': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'Low': 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  };

  return (
    <div className="space-y-6">
      <DisclaimerBanner message="Prioritization scoring is strictly rule-based, fully explainable, and transparent. Every score factor contributes a visible point breakdown. The Control Room Operator retains complete authority to re-dispatch." />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div>
          <h1 className="text-base font-bold font-heading text-slate-100 flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-red-500" />
            <span>Emergency Incident Prioritization Queue</span>
          </h1>
          <p className="text-xs text-slate-400">
            Automated urgency scoring: Severity (30%) + Life Threat (35%) + Vulnerable Area (15%) + Queue Wait (20%)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span>Config Weights</span>
          </button>
        </div>
      </div>

      {/* Rule Weights Config Panel (Expandable) */}
      {showConfig && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-blue-500/30 space-y-3">
          <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
            <span>Configurable Dispatch Rule Weights (Must sum to 1.0)</span>
            <span className="text-[11px] text-blue-400">Live Re-calculation</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-slate-400">Severity Weight</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weights.severity_weight}
                onChange={(e) => setWeights({ ...weights, severity_weight: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 mt-1 font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400">Life Threat Weight</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weights.life_threat_weight}
                onChange={(e) => setWeights({ ...weights, life_threat_weight: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 mt-1 font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400">Vulnerable Area Weight</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weights.vulnerable_loc_weight}
                onChange={(e) => setWeights({ ...weights, vulnerable_loc_weight: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 mt-1 font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400">Wait Time Weight</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weights.wait_time_weight}
                onChange={(e) => setWeights({ ...weights, wait_time_weight: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 mt-1 font-mono text-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Ranked Queue Cards */}
      <div className="space-y-3">
        {rankedList.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className={`rounded-2xl border transition-all ${
                item.priority_level === 'Critical'
                  ? 'bg-red-950/20 border-red-500/40 shadow-lg shadow-red-900/10'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Rank & Incident Info */}
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 font-mono ${
                    item.rank_order === 1 ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : 'bg-slate-800 text-slate-300'
                  }`}>
                    #{item.rank_order}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-100">{item.incident_type}</span>
                      <span className="text-[11px] font-mono text-slate-400">{item.call_number}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${priorityBadgeColors[item.priority_level]}`}>
                        {item.priority_level.toUpperCase()}
                      </span>
                    </div>

                    {/* Transparent Why Sentence */}
                    <p className="text-xs text-slate-300 font-medium">
                      {item.why_explanation}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>Severity: <strong className="text-slate-200">{item.severity}/5</strong></span>
                      <span>Waiting: <strong className="text-amber-400">{item.waiting_minutes}m</strong></span>
                      {item.life_threat && <span className="text-red-400 font-bold">• Active Life Threat</span>}
                      {item.vulnerable_location && <span className="text-amber-400 font-bold">• Sensitive Sector</span>}
                    </div>
                  </div>
                </div>

                {/* Score & Interactive Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Score</div>
                    <div className="text-2xl font-bold font-mono text-slate-100">{item.calculated_score}</div>
                  </div>

                  {/* Interactive toggle buttons for demo */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleLifeThreat(item.id)}
                      title="Toggle Life Threat Flag"
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                        item.life_threat ? 'bg-red-600 text-white border-red-500' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Threat: {item.life_threat ? 'YES' : 'NO'}
                    </button>
                    <button
                      onClick={() => handleIncreaseWait(item.id)}
                      title="Simulate Queue Delay (+5m)"
                      className="px-2 py-1 rounded text-[10px] bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300"
                    >
                      +5m Wait
                    </button>
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Factor Contribution Breakdown (Expandable) */}
              {isExpanded && (
                <div className="px-5 pb-4 pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="text-xs font-semibold text-slate-400">
                    Transparent Factor Points Contribution Breakdown:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {item.breakdown.map((b, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-200">{b.factor_name} ({b.raw_value})</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{b.reason}</div>
                        </div>
                        <span className="font-mono text-sm font-bold text-blue-400 ml-2 shrink-0">
                          +{b.points_contributed}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
