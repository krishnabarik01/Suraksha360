import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SimulatedBadge } from './SimulatedBadge';
import { Shield, PhoneCall, Radio, LogOut, User, MapPin } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const roleColors = {
    'Admin': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    'Control Room Officer': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    'Beat Officer': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    'Analyst': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
  };

  return (
    <header className="h-16 bg-slate-950/80 border-b border-slate-800/80 px-5 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
      {/* Brand & City */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-base tracking-wide text-white">Suraksha<span className="text-blue-500">360</span></span>
            <SimulatedBadge />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <MapPin className="w-3 h-3 text-red-400" />
            <span>Raipur Urban District • CG Police</span>
          </div>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="hidden lg:flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <Radio className="w-3.5 h-3.5 text-blue-400" />
          <span>Cadence Engine: Live (10s)</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
          <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
          <span>Dial 112 Link: Active (Mock Adapter)</span>
        </div>

        <div className="font-mono text-slate-400 text-xs px-2.5 py-1 rounded bg-slate-900/50">
          {currentTime.toLocaleTimeString('en-IN', { hour12: false })} IST
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-200">{user.full_name}</div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${roleColors[user.role] || 'bg-slate-800 text-slate-300'}`}>
                {user.role}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User className="w-4 h-4" />
            </div>
          </div>
        )}

        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 rounded-lg bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
