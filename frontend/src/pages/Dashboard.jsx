import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import KpiCardRow          from '../Components/kpi/KpiCardRow';
import SensorList          from '../Components/sensors/SensorList';
import EngineModel3D       from '../Components/twin/EngineModel3D';
import PredictiveInsights  from '../Components/insights/PredictiveInsights';
import MaintenanceTasks    from '../Components/insights/MaintenanceTasks';
import AlertsFeed          from '../Components/insights/AlertsFeed';
import TrendChartsRow      from '../Components/charts/TrendChartsRow';

const Dashboard = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="space-y-5"
  >
    {/* KPI row */}
    <KpiCardRow />

    {/* Main 3-column grid */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" style={{ minHeight: 440 }}>
      {/* Left: sensor list */}
      <div className="lg:col-span-3 flex flex-col">
        <div className="card h-full border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-sm">Sensor Overview</h3>
            <span className="label-xs">Live</span>
          </div>
          <div className="flex-1">
            <SensorList standalone />
          </div>
          <Link to="/telemetry" className="mt-4 text-xs text-orange-500 font-semibold hover:text-orange-600 transition-colors block">
            View all sensors →
          </Link>
        </div>
      </div>

      {/* Center: 3D twin */}
      <div className="lg:col-span-5 bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden flex flex-col min-h-[460px] h-[520px]">
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-gray-50 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-gray-800">3D Digital Twin</h3>
            <p className="text-xs text-gray-400">Live engine health mapping</p>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />ROTAX-MALE-009
          </span>
        </div>
        <div className="flex-1 min-h-0 p-3 flex flex-col">
          <EngineModel3D />
        </div>
      </div>

      {/* Right: insights stack */}
      <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto">
        <PredictiveInsights />
        <MaintenanceTasks />
        <AlertsFeed />
      </div>
    </div>

    {/* Bottom trend charts */}
    <TrendChartsRow />
  </motion.div>
);

export default Dashboard;
