import React from 'react';
import { AlertCircle } from 'lucide-react';

export const SimulatedBadge = ({ className = "" }) => {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 ${className}`} title="All public safety events and patrol data are synthetic simulations for Raipur city demo">
      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
      <span>SIMULATED DEMO DATA</span>
    </span>
  );
};
