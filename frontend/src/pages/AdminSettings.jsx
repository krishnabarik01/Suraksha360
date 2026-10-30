import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import {
  Sliders, Users, Shield, FileText, Check, AlertCircle,
  Lock, RefreshCw
} from 'lucide-react';

export const AdminSettings = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [weights, setWeights] = useState({
    severity_weight: 0.30,
    life_threat_weight: 0.35,
    vulnerable_loc_weight: 0.15,
    wait_time_weight: 0.20
  });
  const [saveStatus, setSaveStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logs, cfg] = await Promise.all([
          api.getAuditLogs(),
          api.getPrioritizationConfig()
        ]);
        setAuditLogs(logs);
        if (cfg) setWeights(cfg);
      } catch (e) {
        console.error("Admin fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveWeights = async (e) => {
    e.preventDefault();
    setSaveStatus('');
    const total = parseFloat(weights.severity_weight) + parseFloat(weights.life_threat_weight) + parseFloat(weights.vulnerable_loc_weight) + parseFloat(weights.wait_time_weight);
    if (Math.abs(total - 1.0) > 0.02) {
      alert(`Weights must sum to 1.0 (Current: ${total.toFixed(2)})`);
      return;
    }
    try {
      await api.updatePrioritizationConfig({
        severity_weight: parseFloat(weights.severity_weight),
        life_threat_weight: parseFloat(weights.life_threat_weight),
        vulnerable_loc_weight: parseFloat(weights.vulnerable_loc_weight),
        wait_time_weight: parseFloat(weights.wait_time_weight),
        category_weights: weights.category_weights || {}
      });
      setSaveStatus('Dispatch policy weights successfully updated and logged to audit table.');
      // Refresh audit logs
      const updatedLogs = await api.getAuditLogs();
      setAuditLogs(updatedLogs);
    } catch (err) {
      alert("Update failed: " + (err.response?.data?.detail || err.message));
    }
  };

  const usersList = [
    { name: "Dr. Alok Verma", role: "Admin", badge: "IPS-CG-2012-08", email: "admin@cgpolice.gov.in" },
    { name: "Inspector S. K. Sharma", role: "Control Room Officer", badge: "CGP-CR-4401", email: "control112@cgpolice.gov.in" },
    { name: "Sub-Inspector Rajesh Nayak", role: "Beat Officer", badge: "CGP-BO-7812", email: "beat_rajesh@cgpolice.gov.in" },
    { name: "Pooja Dewangan", role: "Analyst", badge: "CGP-DA-102", email: "analyst@cgpolice.gov.in" }
  ];

  return (
    <div className="space-y-6">
      <DisclaimerBanner message="Administrative & Governance Module. All policy adjustments, route approvals, and model retrain actions are immutably recorded in the compliance audit trail." />

      {/* Roster & Role Access Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h2 className="text-sm font-bold font-heading text-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          <span>Role-Based Access Control (RBAC) Accounts</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Officer Name</th>
                <th className="p-3">Assigned Role</th>
                <th className="p-3">Badge Number</th>
                <th className="p-3">Official Email</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {usersList.map((u, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-semibold text-slate-200">{u.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-400">{u.badge}</td>
                  <td className="p-3 text-slate-400">{u.email}</td>
                  <td className="p-3 text-emerald-400 font-semibold">Active</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rule Weights Config Form */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h2 className="text-sm font-bold font-heading text-slate-100 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>Prioritization Scoring Policy Configuration</span>
        </h2>

        <form onSubmit={handleSaveWeights} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Incident Severity (0-1.0)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weights.severity_weight}
                onChange={(e) => setWeights({ ...weights, severity_weight: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Imminent Life Threat (0-1.0)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weights.life_threat_weight}
                onChange={(e) => setWeights({ ...weights, life_threat_weight: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Vulnerable Sector (0-1.0)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weights.vulnerable_loc_weight}
                onChange={(e) => setWeights({ ...weights, vulnerable_loc_weight: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Waiting Time Escalation (0-1.0)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weights.wait_time_weight}
                onChange={(e) => setWeights({ ...weights, wait_time_weight: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-blue-600/30"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save & Broadcast Policy Update</span>
            </button>
            {saveStatus && <span className="text-xs text-emerald-400">{saveStatus}</span>}
          </div>
        </form>
      </div>

      {/* Compliance Audit Trail */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h2 className="text-sm font-bold font-heading text-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-400" />
          <span>Audit Log & Accountability Trail</span>
        </h2>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0">
              <tr>
                <th className="p-3">Timestamp (UTC)</th>
                <th className="p-3">Officer / Actor</th>
                <th className="p-3">Action Recorded</th>
                <th className="p-3">Entity Type</th>
                <th className="p-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-mono text-[11px] text-slate-400">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 font-semibold text-slate-200">{log.user_name || "System"}</td>
                  <td className="p-3 font-mono font-semibold text-blue-400">{log.action}</td>
                  <td className="p-3 text-slate-400">{log.entity_type}</td>
                  <td className="p-3 text-[11px] text-slate-400 font-mono truncate max-w-xs">{log.details_json}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
