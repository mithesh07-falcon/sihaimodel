import React, { useEffect } from 'react';
import { useEngineStore } from './store/useEngineStore';
import {
  Sidebar,
  TopBar,
  KpiCardRow,
  SensorList,
  EngineModel3D,
  PredictiveInsights,
  MaintenanceTasks,
  AlertsFeed,
  TrendChartsRow,
  RunSimulationDrawer,
} from './Components/Components';

const App = () => {
  const connectWebSocket = useEngineStore(s => s.connectWebSocket);
  useEffect(() => { connectWebSocket(); }, [connectWebSocket]);

  return (
    <div className="flex h-screen bg-cream overflow-hidden font-sans">
      {/* ── Floating Sidebar Rail ── */}
      <div className="p-3 h-full shrink-0">
        <Sidebar />
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="px-6 pt-5 pb-3">
          <TopBar />
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
          {/* KPI Cards */}
          <KpiCardRow />

          {/* Main 3-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[420px]">
            {/* Left: Sensor Overview */}
            <div className="lg:col-span-3 flex flex-col">
              <SensorList />
            </div>

            {/* Center: 3D Twin */}
            <div className="lg:col-span-5 bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden" style={{ minHeight: 380 }}>
              <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-gray-50">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">3D Digital Twin</h3>
                  <p className="text-xs text-gray-400">Live engine health mapping</p>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  ROTAX-MALE-009
                </span>
              </div>
              <div style={{ height: 'calc(100% - 56px)' }}>
                <EngineModel3D />
              </div>
            </div>

            {/* Right: Insights + Tasks + Alerts */}
            <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto">
              <PredictiveInsights />
              <MaintenanceTasks />
              <AlertsFeed />
            </div>
          </div>

          {/* Bottom: Trend Charts */}
          <TrendChartsRow />
        </div>
      </main>

      {/* ── Slide-over Drawer ── */}
      <RunSimulationDrawer />
    </div>
  );
};

export default App;