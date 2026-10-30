import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = "blue", trend = null, badge = null }) => {
  const colorMap = {
    blue: "border-blue-500/30 text-blue-400 bg-blue-500/10",
    emerald: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
    amber: "border-amber-500/30 text-amber-400 bg-amber-500/10",
    rose: "border-rose-500/30 text-rose-400 bg-rose-500/10",
    purple: "border-purple-500/30 text-purple-400 bg-purple-500/10"
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${colorMap[color] || colorMap.blue}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-heading text-slate-100">{value}</span>
          {badge && <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">{badge}</span>}
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>

      {trend && (
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-xs text-slate-400">
          <span className={trend.isPositive ? "text-emerald-400" : "text-rose-400"}>
            {trend.value}
          </span>
          <span>{trend.label}</span>
        </div>
      )}
    </div>
  );
};
