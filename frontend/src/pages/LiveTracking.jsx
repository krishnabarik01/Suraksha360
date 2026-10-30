import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import {
  Radio, Smartphone, MapPin, BatteryCharging,
  Gauge, Play, Pause, RefreshCw, Car, CheckCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

const RAIPUR_CENTER = [21.2514, 81.6296];

const createUnitMarkerIcon = (callSign, status) => {
  const color = status === 'On Patrol' ? '#10b981' : (status === 'Dispatched' ? '#f59e0b' : '#3b82f6');
  return L.divIcon({
    className: 'custom-unit-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px ${color}; font-weight: bold; color: white;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 10.9 2 11v5c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

export const LiveTracking = () => {
  const [units, setUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState(1);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isSimulatingMove, setIsSimulatingMove] = useState(false);
  const [broadcastLog, setBroadcastLog] = useState([]);
  const [simStep, setSimStep] = useState(0);

  const watchIdRef = useRef(null);
  const simTimerRef = useRef(null);

  const fetchUnits = async () => {
    try {
      const data = await api.getUnits();
      setUnits(data);
    } catch (e) {
      console.error("Failed to fetch units:", e);
    }
  };

  useEffect(() => {
    fetchUnits();
    const interval = setInterval(fetchUnits, 3000); // 3s near real-time polling
    return () => clearInterval(interval);
  }, []);

  // Browser Geolocation Broadcast
  useEffect(() => {
    if (isBroadcasting) {
      if ('geolocation' in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude, longitude, speed } = pos.coords;
            try {
              await api.updateUnitLocation(selectedUnitId, {
                latitude,
                longitude,
                speed_kmh: speed ? Math.round(speed * 3.6) : 22.0,
                status: 'On Patrol'
              });
              setBroadcastLog(prev => [
                `[${new Date().toLocaleTimeString()}] Phone GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} sent`,
                ...prev.slice(0, 9)
              ]);
              fetchUnits();
            } catch (err) {
              console.error("GPS send error:", err);
            }
          },
          (err) => {
            setBroadcastLog(prev => [`GPS Error: ${err.message}`, ...prev.slice(0, 9)]);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        alert("Geolocation API is not supported by your browser");
        setIsBroadcasting(false);
      }
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isBroadcasting, selectedUnitId]);

  // Desktop Simulator for Live Movement Demo
  useEffect(() => {
    if (isSimulatingMove) {
      const waypoints = [
        [21.2497, 81.6335], // Jaistambh
        [21.2460, 81.6380],
        [21.2420, 81.6420], // Civil lines
        [21.2380, 81.6500],
        [21.2355, 81.6702], // Telibandha
        [21.2450, 81.6620], // Shankar nagar
        [21.2550, 81.6440], // Devendra nagar
        [21.2588, 81.6540], // Pandri
        [21.2612, 81.6288]  // Station
      ];

      simTimerRef.current = setInterval(async () => {
        setSimStep((prevStep) => {
          const next = (prevStep + 1) % waypoints.length;
          const [lat, lon] = waypoints[next];
          api.updateUnitLocation(selectedUnitId, {
            latitude: lat + (Math.random() - 0.5) * 0.002,
            longitude: lon + (Math.random() - 0.5) * 0.002,
            speed_kmh: Math.round(28 + Math.random() * 15),
            status: 'On Patrol'
          }).then(() => fetchUnits());
          return next;
        });
      }, 3500);
    } else {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    }

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isSimulatingMove, selectedUnitId]);

  const activeUnit = units.find(u => u.id === parseInt(selectedUnitId)) || units[0];

  return (
    <div className="space-y-6">
      <DisclaimerBanner message="Live Unit Tracking visualizes active field patrol telemetry. In production, field smartphones stream GPS via secure HTTPS. Simulated movement mode is provided for desktop validation." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold font-heading text-slate-100 flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-400" />
                <span>Control Room Live Fleet Map (3s Telemetry)</span>
              </h1>
              <p className="text-xs text-slate-400">
                Near real-time GPS locations of all PCR vans and mobile patrols in Raipur
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>LIVE REFRESH</span>
            </span>
          </div>

          <div className="h-[520px] rounded-xl overflow-hidden border border-slate-800 relative z-0">
            <MapContainer center={RAIPUR_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {units.map((u) => (
                <Marker
                  key={u.id}
                  position={[u.current_lat, u.current_lon]}
                  icon={createUnitMarkerIcon(u.call_sign, u.status)}
                >
                  <Popup>
                    <div className="p-1 space-y-1">
                      <div className="font-bold text-sm text-slate-100">{u.call_sign}</div>
                      <div className="text-xs text-slate-300">Type: {u.unit_type}</div>
                      <div className="text-xs text-emerald-400 font-semibold">Status: {u.status}</div>
                      <div className="text-xs text-slate-400">Speed: {u.speed_kmh} km/h • Battery: {u.battery_level}%</div>
                      <div className="text-[10px] text-slate-500">Updated: {new Date(u.last_location_update).toLocaleTimeString()}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Mobile GPS Transmitter / Simulator Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Smartphone className="w-5 h-5 text-blue-400" />
              <div>
                <h2 className="text-sm font-bold font-heading text-slate-100">
                  Field Officer Mobile GPS
                </h2>
                <p className="text-[11px] text-slate-400">
                  Send live phone location or run simulated patrol route
                </p>
              </div>
            </div>

            {/* Select Patrol Unit */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Select Unit Call-Sign</label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.call_sign} ({u.unit_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Status of Selected Unit */}
            {activeUnit && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Active Status</span>
                  <span className="font-semibold text-emerald-400">{activeUnit.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Speed</span>
                  <span className="font-mono text-slate-200">{activeUnit.speed_kmh} km/h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Battery Level</span>
                  <span className="font-mono text-slate-200">{activeUnit.battery_level}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Coordinates</span>
                  <span className="font-mono text-[11px] text-blue-400">
                    {activeUnit.current_lat.toFixed(4)}, {activeUnit.current_lon.toFixed(4)}
                  </span>
                </div>
              </div>
            )}

            {/* Hardware Broadcast Toggle */}
            <div className="space-y-2">
              <button
                onClick={() => setIsBroadcasting(!isBroadcasting)}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  isBroadcasting
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                    : 'bg-slate-950 border border-slate-700 hover:border-slate-600 text-slate-200'
                }`}
              >
                <Radio className={`w-4 h-4 ${isBroadcasting ? 'animate-pulse' : ''}`} />
                <span>{isBroadcasting ? 'Stop Phone GPS Broadcast' : 'Start Phone GPS Broadcast'}</span>
              </button>

              {/* Desktop Simulator Toggle */}
              <button
                onClick={() => setIsSimulatingMove(!isSimulatingMove)}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  isSimulatingMove
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                    : 'bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600/30'
                }`}
              >
                {isSimulatingMove ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isSimulatingMove ? 'Pause Patrol Simulation' : 'Simulate Live Patrol Drive'}</span>
              </button>
            </div>

            {/* Telemetry Stream Log */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400">Recent Telemetry Packets:</span>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400 h-28 overflow-y-auto space-y-1">
                {broadcastLog.length > 0 ? (
                  broadcastLog.map((log, i) => <div key={i}>{log}</div>)
                ) : (
                  <div className="text-slate-600">No pings sent yet. Toggle phone GPS or simulator above.</div>
                )}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
            HTTPS Geolocation API + WGS84 coordinates
          </div>
        </div>
      </div>
    </div>
  );
};
