import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard  from './pages/Dashboard';
import Telemetry  from './pages/Telemetry';
import Analytics  from './pages/Analytics';
import Tasks      from './pages/Tasks';
import Settings   from './pages/Settings';

const AppRouter = () => (
  <Routes>
    <Route path="/"          element={<Dashboard />}  />
    <Route path="/telemetry" element={<Telemetry />}  />
    <Route path="/analytics" element={<Analytics />}  />
    <Route path="/tasks"     element={<Tasks />}      />
    <Route path="/settings"  element={<Settings />}   />
    <Route path="*"          element={<Dashboard />}  />
  </Routes>
);

export default AppRouter;
