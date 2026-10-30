import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import {
  AlertTriangle, ShieldCheck, MapPin, Wrench,
  Clock, Navigation, Eye
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

const RAIPUR_CENTER = [21.2514, 81.6296];

export const AccidentHotspots = () => {
  const [hotspots, setHotspots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHotspots = async () => {
      try {
        const data = await api.getAccidentHotspots(3, 0.45);
        setHotspots(data);
        if (data.length > 0) {
          setSelectedSpot(data[0]);
        }
      } catch (e) {
        console.error("Failed to load hotspots:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHotspots();
  }, []);

  return (
    <div className="space-y-5">
      <DisclaimerBanner message="Accident blackspots are identified using spatial density clustering (DBSCAN) on historical accident records. Recommendations are for traffic engineering and preventive interceptor patrols." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold font-heading text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Raipur Traffic Blackspot Intelligence</span>
              </h1>
              <p className="text-xs text-slate-400">
                Severity-weighted spatial clusters (Fatal = 5x, Major = 3x, Minor = 1x)
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg">
              {hotspots.length} Blackspots Identified
            </span>
          </div>

          <div className="h-[520px] rounded-xl overflow-hidden border border-slate-800 relative z-0">
            <MapContainer center={RAIPUR_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {hotspots.map((spot, idx) => {
                const isSelected = selectedSpot?.id === spot.id;
                const radius = Math.min(26, Math.max(12, spot.weighted_severity_score * 0.45));
                const color = spot.fatal_count > 0 ? '#ef4444' : '#f97316';

                return (
                  <CircleMarker
                    key={spot.id}
                    center={[spot.latitude, spot.longitude]}
                    radius={radius}
                    pathOptions={{
                      color: isSelected ? '#ffffff' : color,
                      fillColor: color,
                      fillOpacity: isSelected ? 0.75 : 0.45,
                      weight: isSelected ? 3 : 1.5
                    }}
                    eventHandlers={{
                      click: () => setSelectedSpot(spot)
                    }}
                  >
                    <Popup>
                      <div className="p-1 space-y-1">
                        <div className="font-bold text-xs text-slate-100">#{idx + 1} {spot.name}</div>
                        <div className="text-xs text-slate-300">Total Accidents: {spot.incident_count}</div>
                        <div className="text-xs text-red-400">Fatalities: {spot.fatal_count} • Major Injuries: {spot.major_count}</div>
                        <div className="text-[10px] text-slate-400">Road: {spot.primary_road_type}</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Side Ranked List & Preventive Suggestions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4 flex flex-col justify-between max-h-[600px] overflow-hidden">
          <div className="space-y-3 overflow-y-auto pr-1">
            <h2 className="text-sm font-bold font-heading text-slate-100 flex items-center justify-between">
              <span>Ranked Blackspot Priority</span>
              <span className="text-[11px] font-normal text-slate-400">Sorted by Severity</span>
            </h2>

            <div className="space-y-2">
              {hotspots.map((spot, idx) => {
                const isSelected = selectedSpot?.id === spot.id;
                return (
                  <div
                    key={spot.id}
                    onClick={() => setSelectedSpot(spot)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <div className="font-semibold text-xs text-slate-200">{spot.name}</div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-amber-400">
                        Score {spot.weighted_severity_score}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                      <span>{spot.incident_count} crashes</span>
                      <span className="text-red-400 font-medium">{spot.fatal_count} fatal</span>
                      <span className="text-orange-400 font-medium">{spot.major_count} major</span>
                      <span>{spot.primary_road_type}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Spot Detail Drawer */}
          {selectedSpot && (
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-emerald-400" />
                <span>Preventive Engineering & Patrol Actions</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {selectedSpot.preventive_suggestions.map((sug, i) => (
                  <div key={i} className="text-[11px] text-slate-300 p-2 rounded-lg bg-emerald-950/20 border border-emerald-900/30 flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                    <span>{sug}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
