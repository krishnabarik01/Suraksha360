import React from 'react';
import { ShieldAlert, Info } from 'lucide-react';

export const DisclaimerBanner = ({
  message = "Estimates indicate where preventive attention may be useful; they are never evidence of criminal activity. This system does NOT profile individuals. A human officer always makes final decisions.",
  compact = false
}) => {
  if (compact) {
    return (
      <div className="bg-blue-950/40 border border-blue-800/40 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-blue-200">
        <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-950/60 via-slate-900/60 to-indigo-950/60 border border-blue-500/30 rounded-xl p-3.5 shadow-lg flex items-start gap-3 backdrop-blur-md">
      <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg mt-0.5">
        <ShieldAlert className="w-4 h-4" />
      </div>
      <div className="text-xs space-y-1">
        <p className="font-semibold text-blue-300 tracking-wide uppercase text-[11px]">
          Responsible AI & Constitutional Advisory Note
        </p>
        <p className="text-slate-300 leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
};
