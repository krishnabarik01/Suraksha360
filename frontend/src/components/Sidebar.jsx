import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Flame,
  AlertTriangle,
  Route,
  Users2,
  PhoneForwarded,
  ListOrdered,
  Radio,
  Cpu,
  Sliders,
  ShieldCheck
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Command Dashboard', icon: LayoutDashboard },
  { to: '/risk', label: 'Crime Risk Heatmap', icon: Flame },
  { to: '/accidents', label: 'Accident Blackspots', icon: AlertTriangle },
  { to: '/routes', label: 'Beat Patrol Optimizer', icon: Route },
  { to: '/resources', label: 'Resource Allocation', icon: Users2 },
  { to: '/dispatch', label: 'Response Analytics', icon: PhoneForwarded },
  { to: '/prioritization', label: 'Incident Queue', icon: ListOrdered },
  { to: '/tracking', label: 'Live Unit GPS Demo', icon: Radio },
  { to: '/models', label: 'Data & Model Metrics', icon: Cpu },
  { to: '/admin', label: 'Admin & Audit Logs', icon: Sliders },
  { to: '/responsible-ai', label: 'Responsible AI & Ethics', icon: ShieldCheck },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-slate-950/60 border-r border-slate-800/80 p-3 flex flex-col justify-between shrink-0 select-none">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Intelligence & Operations
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Advisory Footer */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-[11px] text-slate-400 space-y-1 mt-4">
        <div className="font-semibold text-slate-300">Human-In-The-Loop</div>
        <p className="text-[10px] text-slate-500 leading-normal">
          AI recommendations require officer approval before deployment.
        </p>
      </div>
    </aside>
  );
};
