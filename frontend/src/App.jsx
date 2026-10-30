import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { RiskHeatmap } from './pages/RiskHeatmap';
import { AccidentHotspots } from './pages/AccidentHotspots';
import { BeatPlanner } from './pages/BeatPlanner';
import { ResourceAllocation } from './pages/ResourceAllocation';
import { EmergencyResponse } from './pages/EmergencyResponse';
import { IncidentPrioritization } from './pages/IncidentPrioritization';
import { LiveTracking } from './pages/LiveTracking';
import { DataModels } from './pages/DataModels';
import { AdminSettings } from './pages/AdminSettings';
import { ResponsibleAI } from './pages/ResponsibleAI';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center text-slate-400">
        Loading Suraksha360 session...
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="risk" element={<RiskHeatmap />} />
            <Route path="accidents" element={<AccidentHotspots />} />
            <Route path="routes" element={<BeatPlanner />} />
            <Route path="resources" element={<ResourceAllocation />} />
            <Route path="dispatch" element={<EmergencyResponse />} />
            <Route path="prioritization" element={<IncidentPrioritization />} />
            <Route path="tracking" element={<LiveTracking />} />
            <Route path="models" element={<DataModels />} />
            <Route path="admin" element={<AdminSettings />} />
            <Route path="responsible-ai" element={<ResponsibleAI />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
