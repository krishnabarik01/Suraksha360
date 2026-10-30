import React from 'react';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import {
  ShieldCheck, AlertTriangle, EyeOff, UserCheck,
  RefreshCw, Lock, PhoneCall, CheckCircle2, FileText
} from 'lucide-react';

export const ResponsibleAI = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <DisclaimerBanner message="Core Architectural Mandate: Suraksha360 enforces strictly area-level, preventive risk estimation. Predictions are advisory only and never constitute proof or accusation of crime." />

      <div className="space-y-1">
        <h1 className="text-xl font-bold font-heading text-slate-100 flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <span>Responsible AI, Privacy & Constitutional Governance Framework</span>
        </h1>
        <p className="text-xs text-slate-400">
          Operational principles, feedback-loop mitigations, and human-in-the-loop safeguards
        </p>
      </div>

      {/* Grid of Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pillar 1: No Individual Profiling */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <EyeOff className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold font-heading text-slate-100">
            1. Zero Individual-Level Profiling
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            The system operates solely on anonymized, aggregated 500-meter spatial cells. It contains <strong>zero capability</strong> for facial recognition, individual suspect scoring, demographic targeting, or personal background checks.
          </p>
          <div className="text-[11px] text-blue-400 font-semibold bg-blue-950/30 p-2 rounded-lg border border-blue-900/40">
            Constitutional Protection: Article 14 & 21 compliance guaranteed by design.
          </div>
        </div>

        {/* Pillar 2: Mandatory Human-in-the-Loop */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold font-heading text-slate-100">
            2. Mandatory Human-In-The-Loop Approval
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Every patrol route recommendation, resource allocation suggestion, and prioritization ranking is advisory. A human police officer always makes the final deployment decision. Officers may accept, modify, or reject any recommendation with logged justification.
          </p>
          <div className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/30 p-2 rounded-lg border border-emerald-900/40">
            Audit Trail: 100% of officer overrides are committed to the compliance audit log.
          </div>
        </div>

        {/* Pillar 3: Feedback Loop Warning & Mitigation */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold font-heading text-slate-100">
            3. Feedback-Loop Warning & Bias Safeguards
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>The Self-Fulfilling Patrol Trap:</strong> If more police are sent to an area, more minor infractions are recorded, artificially inflating that area's perceived risk. Suraksha360 mitigates this by weighting severe reports (citizen 112 calls) higher than proactive stops and enforcing minimum baseline coverage across all beats.
          </p>
          <div className="text-[11px] text-amber-400 font-semibold bg-amber-950/30 p-2 rounded-lg border border-amber-900/40">
            Audit Metric: Area coverage entropy and dispersion monitored continuously.
          </div>
        </div>

        {/* Pillar 4: Citizen Emergency Flow (Dial 112) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <PhoneCall className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold font-heading text-slate-100">
            4. Emergency Architecture: Citizens Dial 112
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Citizens in distress are <strong>never</strong> required or asked to access a web interface. The emergency hotline remains dial <strong>112</strong>. Suraksha360 connects via a mock adapter interface to CAD (Computer-Aided Dispatch) to assist control room operators after a call is already in queue.
          </p>
          <div className="text-[11px] text-rose-400 font-semibold bg-rose-950/30 p-2 rounded-lg border border-rose-900/40">
            Privacy: Caller phone numbers are cryptographically hashed (SHA-256) on ingest.
          </div>
        </div>
      </div>

      {/* Security & Access Controls Overview */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <h2 className="text-sm font-bold font-heading text-slate-100 flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-400" />
          <span>Security, Cryptography & Data Protection Specifications</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-semibold text-slate-100 mb-1">Password Hashing</div>
            <p className="text-slate-400 text-[11px]">Bcrypt with auto-salting; no plaintext secrets stored in memory or disk.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-semibold text-slate-100 mb-1">JWT Tokens & Expiry</div>
            <p className="text-slate-400 text-[11px]">HMAC-SHA256 bearer tokens with strict 24-hour expiration window.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-semibold text-slate-100 mb-1">CORS & Sanitation</div>
            <p className="text-slate-400 text-[11px]">Strict HTTP origin whitelisting and Pydantic v2 input schema sanitation.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
