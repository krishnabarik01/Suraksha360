import axios from 'axios';

const rawApiBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
const cleanBase = rawApiBase.replace(/\/+$/, '');
const API_BASE = cleanBase.endsWith('/api/v1') ? cleanBase : `${cleanBase}/api/v1`;

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('garuda_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  login: async (username, password) => {
    const res = await apiClient.post('/auth/login-json', { username, password });
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  // Dashboard
  getDashboardSummary: async () => {
    const res = await apiClient.get('/dashboard/summary');
    return res.data;
  },

  // Risk
  getRiskGrid: async (timeWindow = 'next_6h', shift = 'Morning', category = null) => {
    const params = { time_window: timeWindow, shift };
    if (category && category !== 'all') params.category = category;
    const res = await apiClient.get('/risk/grid', { params });
    return res.data;
  },
  explainCell: async (cellId) => {
    const res = await apiClient.get(`/risk/explain/${cellId}`);
    return res.data;
  },

  // Accidents
  getAccidents: async (severity = null, limit = 100) => {
    const params = { limit };
    if (severity) params.severity = severity;
    const res = await apiClient.get('/accidents', { params });
    return res.data;
  },
  getAccidentHotspots: async (minSamples = 3, epsKm = 0.45) => {
    const res = await apiClient.get('/accidents/hotspots', { params: { min_samples: minSamples, eps_km: epsKm } });
    return res.data;
  },

  // Incidents
  getIncidents: async (category = null, severity = null, limit = 100) => {
    const params = { limit };
    if (category) params.category = category;
    if (severity) params.severity = severity;
    const res = await apiClient.get('/incidents', { params });
    return res.data;
  },
  createIncident: async (incidentData) => {
    const res = await apiClient.post('/incidents', incidentData);
    return res.data;
  },
  importIncidentsCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/incidents/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  // Beats & Stations
  getStations: async () => {
    const res = await apiClient.get('/beats/stations');
    return res.data;
  },
  getBeats: async () => {
    const res = await apiClient.get('/beats');
    return res.data;
  },

  // Units
  getUnits: async () => {
    const res = await apiClient.get('/units');
    return res.data;
  },
  updateUnitLocation: async (unitId, locationData) => {
    const res = await apiClient.post(`/units/${unitId}/location`, locationData);
    return res.data;
  },

  // Patrol Routes
  getBeatCandidates: async (beatId) => {
    const res = await apiClient.get(`/routes/candidates/${beatId}`);
    return res.data;
  },
  optimizeRoute: async (payload) => {
    const res = await apiClient.post('/routes/optimize', payload);
    return res.data;
  },
  getRoutes: async () => {
    const res = await apiClient.get('/routes');
    return res.data;
  },
  overrideRoute: async (routeId, payload) => {
    const res = await apiClient.post(`/routes/${routeId}/override`, payload);
    return res.data;
  },
  getResourceAllocation: async (shift = 'Morning') => {
    const res = await apiClient.get('/routes/resource-allocation', { params: { shift } });
    return res.data;
  },

  // Dispatch & Response
  getDispatchAnalytics: async (targetMin = 10.0) => {
    const res = await apiClient.get('/dispatch/analytics', { params: { target_min: targetMin } });
    return res.data;
  },
  getDelayZones: async () => {
    const res = await apiClient.get('/dispatch/delay-zones');
    return res.data;
  },
  getEmergencyCalls: async () => {
    const res = await apiClient.get('/dispatch/calls');
    return res.data;
  },

  // Prioritization
  rankIncidents: async (incidents, customConfig = null) => {
    const res = await apiClient.post('/prioritization/rank', {
      incidents,
      custom_config: customConfig
    });
    return res.data;
  },
  getPrioritizationConfig: async () => {
    const res = await apiClient.get('/prioritization/config');
    return res.data;
  },
  updatePrioritizationConfig: async (configData) => {
    const res = await apiClient.put('/prioritization/config', configData);
    return res.data;
  },

  // Models & Governance
  getModelMetrics: async () => {
    const res = await apiClient.get('/models/metrics');
    return res.data;
  },
  retrainModel: async () => {
    const res = await apiClient.post('/models/retrain');
    return res.data;
  },

  // Audit Logs
  getAuditLogs: async () => {
    const res = await apiClient.get('/audit-logs');
    return res.data;
  }
};
