import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MissionControl   from './pages/MissionControl';
import EngineStartup    from './pages/EngineStartup';
import SensorMonitoring from './pages/SensorMonitoring';
import DigitalTwinPage  from './pages/DigitalTwinPage';
import AIHealthPage     from './pages/AIHealthPage';
import FaultSimulation  from './pages/FaultSimulation';
import MaintenancePage  from './pages/MaintenancePage';

const AppRouter = () => (
  <Routes>
    <Route path="/"            element={<MissionControl />}   />
    <Route path="/engine"      element={<EngineStartup />}    />
    <Route path="/sensors"     element={<SensorMonitoring />} />
    <Route path="/twin"        element={<DigitalTwinPage />}  />
    <Route path="/health"      element={<AIHealthPage />}     />
    <Route path="/faults"      element={<FaultSimulation />}  />
    <Route path="/maintenance" element={<MaintenancePage />}  />
    <Route path="*"            element={<MissionControl />}   />
  </Routes>
);

export default AppRouter;
