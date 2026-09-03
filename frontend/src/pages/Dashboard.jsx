import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Hourglass, TrendingUp, Wrench, Bell,
  Activity, Thermometer, Droplets, Gauge, Disc,
  Calendar, Brain, AlertTriangle, Clock, ArrowRight,
  Eye, CheckCircle2
} from 'lucide-react';
import { useEngineStore } from '../store/useEngineStore';
import EngineModel3D from '../Components/twin/EngineModel3D';

// ── Mini SVG Sparkline Component ──────────────────────────────────────────
const MiniSparkline = ({ data, color = '#FF6B35' }) => {
  const points = data || [20, 24, 22, 28, 26, 32, 30, 35];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const width = 60;
  const height = 22;

  const pathD = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Dashboard = () => {
  const telemetry = useEngineStore((s) => s.telemetry);
  const diagnosis = useEngineStore((s) => s.diagnosis);
  const soh = useEngineStore((s) => s.soh);
  const alerts = useEngineStore((s) => s.alerts);
  const engineRunning = useEngineStore((s) => s.engineRunning);
  const startEngine = useEngineStore((s) => s.startEngine);
  const connectWebSocket = useEngineStore((s) => s.connectWebSocket);

  const [dateRange, setDateRange] = useState('May 20 – May 27, 2025');
  const [show3DToggle, setShow3DToggle] = useState(true);

  useEffect(() => {
    if (connectWebSocket) connectWebSocket();
    if (startEngine) startEngine();
  }, []);

  // Dynamic telemetry values or defaults matching the reference mockup
  const egtValue = engineRunning ? Math.round(telemetry.egt ?? 650) : 650;
  const n1Value = 88.7;
  const n2Value = engineRunning ? (92.1 + (Math.random() * 0.4 - 0.2)).toFixed(1) : 92.1;
  const oilPressurePsi = engineRunning
    ? ((telemetry.oil_pressure ?? 380) * 0.145).toFixed(1)
    : '72.4';
  const vibrationValue = engineRunning ? (telemetry.vibration ?? 2.1).toFixed(1) : '2.1';
  const fuelFlowPph = engineRunning
    ? Math.round((telemetry.fuel_flow ?? 18.5) * 46)
    : 850;

  const healthScore = soh?.overall ?? 92;
  const isHealthy = diagnosis.status === 'Healthy';

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-6 lg:p-8 flex flex-col gap-6 max-w-[1780px] mx-auto select-none font-sans">
      {/* ── Top Header ── */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-[#111827] tracking-tight uppercase">
            ENGINE HEALTH MONITORING
          </h1>
          <p className="text-xs lg:text-sm text-[#6B7280] font-medium mt-0.5">
            Real-time analytics & predictive maintenance
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Date Picker Button */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 shadow-sm text-xs font-semibold text-gray-700 hover:border-gray-300 transition-colors cursor-pointer">
            <Calendar size={15} className="text-gray-400" />
            <span>{dateRange}</span>
            <span className="text-[10px] text-gray-400">▼</span>
          </div>

          {/* AI Model Status Badge */}
          <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-50 text-[#FF6B35]">
              <Brain size={18} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">
                AI MODEL STATUS
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Optimal
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Top Row: 5 Metric KPI Cards ── */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Engine Status */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-50 text-[#FF6B35]">
              <ShieldCheck size={22} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                ENGINE STATUS
              </p>
              <h3 className="text-lg font-black text-[#FF6B35] leading-tight">
                {isHealthy ? 'HEALTHY' : diagnosis.status.toUpperCase()}
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            {isHealthy ? 'No critical issues' : diagnosis.fault_component}
          </p>
        </div>

        {/* Card 2: RUL Estimate */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-gray-700">
              <Hourglass size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                RUL ESTIMATE
              </p>
              <h3 className="text-2xl font-black text-gray-900 leading-tight">
                {isHealthy ? 128 : Math.max(12, Math.round(128 * (healthScore / 100)))}
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">Days Remaining</p>
        </div>

        {/* Card 3: Failure Probability */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-gray-700">
              <TrendingUp size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                FAILURE PROBABILITY
              </p>
              <h3 className="text-2xl font-black text-gray-900 leading-tight">
                {isHealthy ? '3.2%' : `${Math.min(88, (100 - healthScore) * 0.9).toFixed(1)}%`}
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">Next 30 Days</p>
        </div>

        {/* Card 4: Maintenance Score */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-gray-700">
              <Wrench size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                MAINTENANCE SCORE
              </p>
              <h3 className="text-2xl font-black text-gray-900 leading-tight">
                {healthScore}
                <span className="text-sm font-normal text-gray-400 ml-0.5">/100</span>
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            {healthScore >= 85 ? 'Excellent' : healthScore >= 70 ? 'Moderate' : 'Needs Action'}
          </p>
        </div>

        {/* Card 5: Alerts */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-gray-700">
              <Bell size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                ALERTS
              </p>
              <h3 className="text-2xl font-black text-gray-900 leading-tight">
                {alerts.filter((a) => a.sev !== 'info').length || 2}
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">Active Alerts</p>
        </div>
      </section>

      {/* ── Middle Section: 3-Column Layout ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: SENSOR OVERVIEW */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold tracking-wider text-[#111827] uppercase mb-4">
              SENSOR OVERVIEW
            </h3>

            <div className="divide-y divide-gray-50">
              {/* CHT */}
              <div className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-gray-500">
                  <Thermometer size={15} className="text-gray-400" />
                  <span className="font-medium text-gray-700">CHT (°C)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#FF6B35] tabular-nums">
                    {engineRunning ? Math.round(telemetry.cht ?? 110) : 110}
                  </span>
                  <MiniSparkline data={[106, 108, 107, 109, 110, 109, 110]} color="#FF6B35" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* EGT */}
              <div className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-gray-500">
                  <Thermometer size={15} className="text-gray-400" />
                  <span className="font-medium text-gray-700">EGT (°C)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#FF6B35] tabular-nums">
                    {engineRunning ? Math.round(telemetry.egt ?? 810) : 810}
                  </span>
                  <MiniSparkline data={[790, 800, 805, 802, 808, 806, 810]} color="#FF6B35" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* ENGINE SPEED (RPM) */}
              <div className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-gray-500">
                  <Gauge size={15} className="text-gray-400" />
                  <span className="font-medium text-gray-700">ENGINE RPM</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#FF6B35] tabular-nums">
                    {engineRunning ? Math.round(telemetry.rpm ?? 4800) : 4800}
                  </span>
                  <MiniSparkline data={[4750, 4780, 4810, 4790, 4820, 4800, 4800]} color="#FF6B35" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* OIL PRESSURE */}
              <div className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-gray-500">
                  <Droplets size={15} className="text-gray-400" />
                  <span className="font-medium text-gray-700">OIL PRESSURE (kPa)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#FF6B35] tabular-nums">
                    {engineRunning ? Math.round(telemetry.oil_pressure ?? 380) : 380}
                  </span>
                  <MiniSparkline data={[370, 375, 382, 378, 380, 379, 380]} color="#FF6B35" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* VIBRATION */}
              <div className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-gray-500">
                  <Activity size={15} className="text-gray-400" />
                  <span className="font-medium text-gray-700">VIBRATION (mm/s)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#FF6B35] tabular-nums">
                    {engineRunning ? (telemetry.vibration ?? 1.1).toFixed(1) : '1.1'}
                  </span>
                  <MiniSparkline data={[1.0, 1.1, 1.05, 1.12, 1.08, 1.15, 1.1]} color="#FF6B35" />
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
              </div>

              {/* FUEL FLOW */}
              <div className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-gray-500">
                  <Droplets size={15} className="text-gray-400" />
                  <span className="font-medium text-gray-700">FUEL FLOW (L/h)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#FF6B35] tabular-nums">
                    {engineRunning ? (telemetry.fuel_flow ?? 18.5).toFixed(1) : '18.5'}
                  </span>
                  <MiniSparkline data={[17.8, 18.2, 18.6, 18.3, 18.7, 18.4, 18.5]} color="#FF6B35" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </div>
            </div>
          </div>

          <Link
            to="/sensors"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#FF6B35] hover:text-[#EA580C] transition-colors"
          >
            View all sensors →
          </Link>
        </div>

        {/* Center Column: Rotax 912 ULS Engine with 4 Floating Parameter Callouts */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] relative flex flex-col justify-center items-center min-h-[440px]">
          {/* Header Bar with Model Badge & Controls */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
                Rotax 912 ULS · 100 HP MALE UAV
              </span>
              <span className="text-[10px] text-gray-400 hidden sm:inline">1,352 cc · Boxer-4</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShow3DToggle(!show3DToggle)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors shadow-sm cursor-pointer"
                title="Toggle between Live 3D Simulation and Static Cutaway"
              >
                <Eye size={13} />
                <span>{show3DToggle ? 'Show Photo Cutaway' : 'Show Live 3D Twin'}</span>
              </button>
            </div>
          </div>

          {/* Engine Area (3D Working Twin or Static Cutaway) */}
          <div className="relative w-full flex-1 flex items-center justify-center min-h-[400px] rounded-xl overflow-hidden">
            {show3DToggle ? (
              <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden">
                <EngineModel3D />
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center p-2 pt-4">
                <img
                  src="/rotax_912.png"
                  alt="Rotax 912 ULS Aircraft Engine"
                  className="max-h-[350px] w-auto object-contain select-none filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.08)]"
                />
              </div>
            )}

            {/* ── 4 Floating Parameter Pins (Rendered on top of active 3D model with live virtual sensor data) ── */}
            {/* Floating Pin 1: Vibration (Top-Left) */}
            <div className="absolute top-6 left-4 sm:left-6 bg-white/95 backdrop-blur-md rounded-xl p-2.5 px-3.5 border border-gray-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.12)] flex items-center gap-3 pointer-events-none z-20">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-[#FF6B35]">
                <Activity size={16} />
              </div>
              <div>
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  VIBRATION
                </div>
                <div className="text-xs font-black text-gray-900 leading-tight">
                  {engineRunning ? (telemetry.vibration ?? 1.1).toFixed(2) : '1.10'}{' '}
                  <span className="font-semibold text-gray-500">mm/s</span>
                </div>
                <div className={`text-[10px] font-bold ${(telemetry.vibration ?? 1.1) > 2.0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {(telemetry.vibration ?? 1.1) > 2.0 ? 'Elevated' : 'Normal'}
                </div>
              </div>
            </div>

            {/* Floating Pin 2: CHT / Head Temp (Top-Right) */}
            <div className="absolute top-6 right-4 sm:right-6 bg-white/95 backdrop-blur-md rounded-xl p-2.5 px-3.5 border border-gray-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.12)] flex items-center gap-3 pointer-events-none z-20">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-[#FF6B35]">
                <Thermometer size={16} />
              </div>
              <div>
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  HEAD TEMP (CHT)
                </div>
                <div className="text-xs font-black text-gray-900 leading-tight">
                  {engineRunning ? Math.round(telemetry.cht ?? 110) : 110}{' '}
                  <span className="font-semibold text-gray-500">°C</span>
                </div>
                <div className={`text-[10px] font-bold ${(telemetry.cht ?? 110) > 125 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {(telemetry.cht ?? 110) > 125 ? 'Thermal Warning' : 'Hybrid Cooled'}
                </div>
              </div>
            </div>

            {/* Floating Pin 3: Oil Pressure (Bottom-Left) */}
            <div className="absolute bottom-6 left-4 sm:left-6 bg-white/95 backdrop-blur-md rounded-xl p-2.5 px-3.5 border border-gray-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.12)] flex items-center gap-3 pointer-events-none z-20">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-[#FF6B35]">
                <Droplets size={16} />
              </div>
              <div>
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  DRY SUMP OIL P
                </div>
                <div className="text-xs font-black text-gray-900 leading-tight">
                  {engineRunning ? Math.round(telemetry.oil_pressure ?? 380) : 380}{' '}
                  <span className="font-semibold text-gray-500">kPa</span>
                </div>
                <div className="text-[10px] font-bold text-emerald-600">
                  {((telemetry.oil_pressure ?? 380) * 0.145).toFixed(1)} PSI
                </div>
              </div>
            </div>

            {/* Floating Pin 4: Engine RPM (Bottom-Right) */}
            <div className="absolute bottom-6 right-4 sm:right-6 bg-white/95 backdrop-blur-md rounded-xl p-2.5 px-3.5 border border-gray-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.12)] flex items-center gap-3 pointer-events-none z-20">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-[#FF6B35]">
                <Gauge size={16} />
              </div>
              <div>
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  CRANK SPEED
                </div>
                <div className="text-xs font-black text-gray-900 leading-tight">
                  {engineRunning ? Math.round(telemetry.rpm ?? 4800).toLocaleString() : '4,800'}{' '}
                  <span className="font-semibold text-gray-500">RPM</span>
                </div>
                <div className="text-[10px] font-bold text-emerald-600">
                  PSRU {((telemetry.rpm ?? 4800) / 2.43).toFixed(0)} Prop
                </div>
              </div>
            </div>
          </div>

          {/* Rotax Specs Summary Pill at Bottom */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-gray-400 bg-gray-50/80 px-4 py-1.5 rounded-full border border-gray-100 w-full">
            <span>Power: 73.5 kW (100 hp) @ 5,800 RPM</span>
            <span>•</span>
            <span>Torque: 128 Nm @ 5,100 RPM</span>
            <span>•</span>
            <span>Weight: 56.6 kg</span>
            <span>•</span>
            <span>TBO: 2,000 hrs</span>
          </div>
        </div>

        {/* Right Column: PREDICTIVE INSIGHTS & TOP MAINTENANCE TASKS */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Card: PREDICTIVE INSIGHTS */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold tracking-wider text-[#111827] uppercase mb-4">
                PREDICTIVE INSIGHTS
              </h3>

              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF6B35] flex items-center justify-center shrink-0 mt-0.5">
                  <Brain size={22} strokeWidth={2} />
                </div>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                  {isHealthy
                    ? 'Rotax 912 AI physics model confidence is high. Dual ignition & dry sump nominal. Continue routine monitoring.'
                    : diagnosis.recommended_action}
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                <span className="text-gray-500">Confidence Level</span>
                <span className="text-gray-900">96%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF6B35] rounded-full"
                  style={{ width: '96%' }}
                />
              </div>
            </div>
          </div>

          {/* Card: TOP MAINTENANCE TASKS */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between flex-1">
            <div>
              <h3 className="text-xs font-bold tracking-wider text-[#111827] uppercase mb-3">
                TOP MAINTENANCE TASKS
              </h3>

              <div className="space-y-3">
                {/* Task 1 */}
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={16} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-800 leading-snug">
                        Dual Carburetor Sync Check
                      </p>
                      <p className="text-[10px] text-gray-400">Due in 50 flight hrs</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                    Medium
                  </span>
                </div>

                {/* Task 2 */}
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <Droplets size={16} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-800 leading-snug">
                        Dry Sump Oil & Filter Change
                      </p>
                      <p className="text-[10px] text-gray-400">Due in 100 flight hrs</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                    Low
                  </span>
                </div>

                {/* Task 3 */}
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <Clock size={16} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-800 leading-snug">
                        PSRU Gearbox Inspection (2.43:1)
                      </p>
                      <p className="text-[10px] text-gray-400">Due in 200 flight hrs</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                    Low
                  </span>
                </div>
              </div>
            </div>

            <Link
              to="/maintenance"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#FF6B35] hover:text-[#EA580C] transition-colors"
            >
              View all tasks →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Bottom Row: 4 Trend & Alert Cards ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: VIBRATION TREND */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold tracking-wider text-[#111827] uppercase">
                VIBRATION TREND
              </h4>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-500 mb-2">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-[#FF6B35] inline-block" /> Actual
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 border-b border-dashed border-gray-400 inline-block" /> Baseline
              </span>
            </div>

            {/* Custom SVG Line Chart */}
            <div className="relative pt-2 pb-1">
              <span className="absolute -top-1 right-0 text-[10px] font-bold text-[#FF6B35]">
                {vibrationValue} mm/s
              </span>
              <svg viewBox="0 0 240 70" className="w-full h-20 overflow-visible">
                {/* Horizontal grid lines */}
                <line x1="0" y1="10" x2="240" y2="10" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="35" x2="240" y2="35" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="60" x2="240" y2="60" stroke="#F1F5F9" strokeWidth="1" />

                {/* Y-axis labels */}
                <text x="0" y="8" fontSize="8" fill="#94A3B8">4.0</text>
                <text x="0" y="33" fontSize="8" fill="#94A3B8">2.0</text>
                <text x="0" y="58" fontSize="8" fill="#94A3B8">0</text>

                {/* Baseline Dashed Line */}
                <path
                  d="M 20 48 Q 60 46 100 47 T 180 46 T 240 47"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />

                {/* Actual Orange Line */}
                <path
                  d="M 20 46 Q 50 40 80 43 T 130 32 T 180 39 T 235 28"
                  fill="none"
                  stroke="#FF6B35"
                  strokeWidth="2.2"
                />
                {/* Current Dot */}
                <circle cx="235" cy="28" r="3" fill="#FF6B35" />
              </svg>
            </div>
          </div>

          <div className="flex justify-between text-[9px] font-medium text-gray-400 mt-2 px-1">
            <span>May 20</span>
            <span>May 22</span>
            <span>May 24</span>
            <span>May 26</span>
            <span>May 27</span>
          </div>
        </div>

        {/* Card 2: EGT TREND */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold tracking-wider text-[#111827] uppercase">
                EGT TREND
              </h4>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-500 mb-2">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-[#FF6B35] inline-block" /> Actual
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 border-b border-dashed border-gray-400 inline-block" /> Baseline
              </span>
            </div>

            {/* Custom SVG Line Chart */}
            <div className="relative pt-2 pb-1">
              <span className="absolute -top-1 right-0 text-[10px] font-bold text-[#FF6B35]">
                {egtValue} °C
              </span>
              <svg viewBox="0 0 240 70" className="w-full h-20 overflow-visible">
                <line x1="0" y1="10" x2="240" y2="10" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="35" x2="240" y2="35" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="60" x2="240" y2="60" stroke="#F1F5F9" strokeWidth="1" />

                <text x="0" y="8" fontSize="8" fill="#94A3B8">800</text>
                <text x="0" y="33" fontSize="8" fill="#94A3B8">600</text>
                <text x="0" y="58" fontSize="8" fill="#94A3B8">400</text>

                {/* Baseline Dashed Line */}
                <path
                  d="M 20 44 Q 60 43 100 45 T 180 42 T 240 43"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />

                {/* Actual Orange Line */}
                <path
                  d="M 20 42 Q 60 38 100 40 T 150 32 T 190 35 T 235 29"
                  fill="none"
                  stroke="#FF6B35"
                  strokeWidth="2.2"
                />
                <circle cx="235" cy="29" r="3" fill="#FF6B35" />
              </svg>
            </div>
          </div>

          <div className="flex justify-between text-[9px] font-medium text-gray-400 mt-2 px-1">
            <span>May 20</span>
            <span>May 22</span>
            <span>May 24</span>
            <span>May 26</span>
            <span>May 27</span>
          </div>
        </div>

        {/* Card 3: HEALTH SCORE HISTORY */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold tracking-wider text-[#111827] uppercase">
                HEALTH SCORE HISTORY
              </h4>
            </div>
            <div className="text-[10px] font-bold text-gray-400 mb-2">Score</div>

            {/* Bar Chart matching reference */}
            <div className="relative pt-1 pb-1">
              <span className="absolute -top-1 right-1 text-xs font-bold text-gray-900">
                {healthScore}
              </span>
              <svg viewBox="0 0 240 70" className="w-full h-20 overflow-visible">
                <line x1="0" y1="10" x2="240" y2="10" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="35" x2="240" y2="35" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="60" x2="240" y2="60" stroke="#F1F5F9" strokeWidth="1" />

                <text x="0" y="8" fontSize="8" fill="#94A3B8">100</text>
                <text x="0" y="33" fontSize="8" fill="#94A3B8">50</text>
                <text x="0" y="58" fontSize="8" fill="#94A3B8">0</text>

                {/* 7 Bars */}
                {[
                  { x: 30, h: 42 },
                  { x: 62, h: 40 },
                  { x: 94, h: 44 },
                  { x: 126, h: 47 },
                  { x: 158, h: 46 },
                  { x: 190, h: 50 },
                  { x: 222, h: 54 },
                ].map((bar, i) => (
                  <rect
                    key={i}
                    x={bar.x}
                    y={65 - bar.h}
                    width="12"
                    height={bar.h}
                    rx="2.5"
                    fill={i === 6 ? '#FF6B35' : '#FF8C5A'}
                    opacity={i === 6 ? 1 : 0.85}
                  />
                ))}
              </svg>
            </div>
          </div>

          <div className="flex justify-between text-[9px] font-medium text-gray-400 mt-2 px-1">
            <span>May 20</span>
            <span>May 22</span>
            <span>May 24</span>
            <span>May 25</span>
            <span>May 26</span>
            <span>May 27</span>
          </div>
        </div>

        {/* Card 4: RECENT ALERTS */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold tracking-wider text-[#111827] uppercase mb-3">
              RECENT ALERTS
            </h4>

            <div className="space-y-3">
              {/* Alert 1 */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle size={13} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-snug">
                      Vibration Level Rising
                    </p>
                    <p className="text-[10px] text-gray-400">Engine 1 · May 27, 08:15 AM</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                  Medium
                </span>
              </div>

              {/* Alert 2 */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle size={13} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-snug">
                      EGT Deviation Detected
                    </p>
                    <p className="text-[10px] text-gray-400">Engine 1 · May 26, 11:42 PM</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                  Low
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/faults"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#FF6B35] hover:text-[#EA580C] transition-colors"
          >
            View all alerts →
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
