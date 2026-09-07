import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DataConnectionPage from './pages/DataConnectionPage';
import EngineStartup    from './pages/EngineStartup';
import Dashboard        from './pages/Dashboard';
import SensorMonitoring from './pages/SensorMonitoring';
import DigitalTwinPage  from './pages/DigitalTwinPage';
import AIHealthPage     from './pages/AIHealthPage';
import FaultSimulation  from './pages/FaultSimulation';
import MaintenancePage  from './pages/MaintenancePage';

const AppRouter = () => (
  <Routes>
    {/* First page is Live Data Connection Hub as requested */}
    <Route path="/"            element={<DataConnectionPage />} />
    <Route path="/connection"  element={<DataConnectionPage />} />
    <Route path="/startup"     element={<EngineStartup />}    />
    <Route path="/engine"      element={<EngineStartup />}    />
    {/* Real-time Health Monitoring Dashboard */}
    <Route path="/dashboard"   element={<Dashboard />}        />
    <Route path="/sensors"     element={<SensorMonitoring />} />
    <Route path="/twin"        element={<DigitalTwinPage />}  />
    <Route path="/health"      element={<AIHealthPage />}     />
    <Route path="/faults"      element={<FaultSimulation />}  />
    <Route path="/maintenance" element={<MaintenancePage />}  />
    <Route path="*"            element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRouter;
