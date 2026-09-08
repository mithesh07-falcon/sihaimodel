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
import EngineViewPage    from './pages/EngineViewPage';

const AppRouter = () => (
  <Routes>
    {/* Real-time Health Monitoring Dashboard as main landing page */}
    <Route path="/"            element={<Dashboard />} />
    <Route path="/dashboard"   element={<Dashboard />} />
    <Route path="/engine-view" element={<EngineViewPage />} />
    <Route path="/engine"      element={<EngineViewPage />} />
    <Route path="/connection"  element={<DataConnectionPage />} />
    <Route path="/gateway"     element={<DataConnectionPage />} />
    <Route path="/sensors"     element={<SensorMonitoring />} />
    <Route path="/twin"        element={<DigitalTwinPage />}  />
    <Route path="/health"      element={<AIHealthPage />}     />
    <Route path="/faults"      element={<FaultSimulation />}  />
    <Route path="/maintenance" element={<MaintenancePage />}  />
    <Route path="/startup"     element={<EngineStartup />}    />
    <Route path="*"            element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRouter;
