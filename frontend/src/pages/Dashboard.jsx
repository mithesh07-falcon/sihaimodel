import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Hourglass, TrendingUp, Wrench, Bell,
  Activity, Thermometer, Droplets, Gauge, Disc,
  Calendar, Brain, AlertTriangle, Clock, ArrowRight,
  Eye, CheckCircle2, Radio, Wifi, WifiOff
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

const TIME_RANGES = [
  'Live Stream (Realtime)',
  'Last 15 Minutes',
  'Last 1 Hour',
  'Last 24 Hours',
  'Last 7 Days (Historic)'
];

const Dashboard = () => {
  const telemetry = useEngineStore((s) => s.telemetry);
  const diagnosis = useEngineStore((s) => s.diagnosis);
  const soh = useEngineStore((s) => s.soh);
  const alerts = useEngineStore((s) => s.alerts);
  const engineRunning = useEngineStore((s) => s.engineRunning);
  const streamConnected = useEngineStore((s) => s.streamConnected);
  const packetsReceived = useEngineStore((s) => s.packetsReceived);
  const ingestionRateHz = useEngineStore((s) => s.ingestionRateHz);
  const connectWebSocket = useEngineStore((s) => s.connectWebSocket);
  const refreshStreamStatus = useEngineStore((s) => s.refreshStreamStatus);

  const [dateRange, setDateRange] = useState('Live Stream (Realtime)');
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);
  const [show3DToggle, setShow3DToggle] = useState(true);

  useEffect(() => {
    if (connectWebSocket) connectWebSocket();
    if (refreshStreamStatus) {
      refreshStreamStatus();
      const interval = setInterval(() => {
        refreshStreamStatus();
      }, 1500);
      return () => clearInterval(interval);
    }
  }, []);

  const history = useEngineStore((s) => s.history);

  // Real stream status detection
  const hasStream = streamConnected && telemetry && (telemetry.rpm > 100 || telemetry.engine_on);
  const healthScore = hasStream && soh?.overall != null && soh.overall > 0 ? soh.overall : null;
  const isHealthy = hasStream && (diagnosis.status === 'Healthy' || diagnosis.status === 'nominal' || !diagnosis.anomaly_detected);

  const egtValue = hasStream && telemetry.egt ? Math.round(telemetry.egt) : '--';
  const oilPressurePsi = hasStream && telemetry.oil_pressure
    ? ((telemetry.oil_pressure > 25 ? telemetry.oil_pressure * 0.145038 : telemetry.oil_pressure * 14.5038)).toFixed(1)
    : '--';
  const vibrationValue = hasStream && (telemetry.vibration != null || telemetry.vibration_rms != null)
    ? (telemetry.vibration ?? telemetry.vibration_rms).toFixed(2)
    : '--';
  const fuelFlowPph = hasStream && telemetry.fuel_flow
    ? Math.round(telemetry.fuel_flow * 46)
    : '--';

  const sensorOverviewItems = [
    {
      label: 'CHT (°C)',
      key: 'cht',
      val: hasStream ? (telemetry.cht ? telemetry.cht.toFixed(1) : '--') : '--',
      icon: Thermometer,
      color: '#FF6B35',
      data: history.slice(-10).map(h => h.cht || 0)
    },
    {
      label: 'EGT (°C)',
      key: 'egt',
      val: hasStream ? (telemetry.egt ? Math.round(telemetry.egt) : '--') : '--',
      icon: Thermometer,
      color: '#FF6B35',
      data: history.slice(-10).map(h => h.egt || 0)
    },
    {
      label: 'RPM',
      key: 'rpm',
      val: hasStream ? (telemetry.rpm ? Math.round(telemetry.rpm) : '--') : '--',
      icon: Gauge,
      color: '#FF6B35',
      data: history.slice(-10).map(h => h.rpm || 0)
    },
    {
      label: 'Oil Press (kPa)',
      key: 'oil_pressure',
      val: hasStream ? (telemetry.oil_pressure ? Math.round(telemetry.oil_pressure > 25 ? telemetry.oil_pressure : telemetry.oil_pressure * 100) : '--') : '--',
      icon: Droplets,
      color: '#FF6B35',
      data: history.slice(-10).map(h => (h.oil_pressure > 25 ? h.oil_pressure : (h.oil_pressure || 0) * 100))
    },
    {
      label: 'Vibration (mm/s)',
      key: 'vibration',
      val: hasStream ? ((telemetry.vibration ?? telemetry.vibration_rms)?.toFixed(2) || '--') : '--',
      icon: Activity,
      color: '#F59E0B',
      data: history.slice(-10).map(h => h.vibration || h.vibration_rms || 0)
    },
    {
      label: 'Fuel Flow (L/h)',
      key: 'fuel_flow',
      val: hasStream ? (telemetry.fuel_flow ? telemetry.fuel_flow.toFixed(1) : '--') : '--',
      icon: Droplets,
      color: '#FF6B35',
      data: history.slice(-10).map(h => h.fuel_flow || 0)
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-6 lg:p-8 flex flex-col gap-6 max-w-[1780px] mx-auto select-none font-sans text-slate-200 relative overflow-hidden">
      {/* ── Background Ambient Glow ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      {/* ── Live Ingestion Status HUD ── */}
      <div
        className={`relative z-10 rounded-2xl p-3 px-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all backdrop-blur-md ${
          hasStream
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasStream ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="font-black text-xs uppercase tracking-widest">
              {hasStream ? 'SYSTEM LIVE: TELEMETRY INGESTION ACTIVE' : 'SYSTEM STANDBY: AWAITING VIRTUAL ENGINE STREAM'}
            </span>
            <span className="text-[11px] font-mono opacity-80 hidden md:inline">
              {hasStream
                ? `SRC: virtualengine.vercel.app | PKTS: ${packetsReceived} | RATE: ${ingestionRateHz.toFixed(1)}Hz | RPM: ${Math.round(telemetry.rpm || 0)} | CHT: ${telemetry.cht ? telemetry.cht.toFixed(1) : '--'}°C`
                : 'STATUS: DISCONNECTED | AWAITING STREAM FROM https://virtualengine.vercel.app/'}
            </span>
          </div>
        </div>
        <Link
          to="/connection"
          className="text-[10px] font-bold px-3 py-1 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-300 hover:text-orange-400 hover:border-orange-500/50 transition-all shrink-0 uppercase tracking-wider"
        >
          Gateway Config →
        </Link>
      </div>

      {/* ── Top Row: 5 Metric KPI Cards ── */}
      <section className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Engine Status */}
        <div className="card bg-slate-900/60 backdrop-blur-lg border-slate-700/50 flex flex-col justify-between group hover:border-orange-500/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <ShieldCheck size={22} strokeWidth={2.2} />
            </div>
            <div>
              <p className="label-xs text-slate-500">Engine Status</p>
              <h3 className="text-lg font-black text-orange-500 leading-tight uppercase">
                {hasStream ? (isHealthy ? 'Healthy' : diagnosis.status) : 'Standby'}
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium italic">
            {hasStream ? (isHealthy ? 'Nominal performance' : diagnosis.fault_component) : 'Awaiting virtual engine data'}
          </p>
        </div>

        {/* Card 2: RUL Estimate */}
        <div className="card bg-slate-900/60 backdrop-blur-lg border-slate-700/50 flex flex-col justify-between group hover:border-slate-500 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800 text-slate-400 group-hover:text-white transition-colors">
              <Hourglass size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="label-xs text-slate-500">RUL Estimate</p>
              <h3 className="text-2xl font-black text-slate-100 leading-tight">
                {hasStream ? `${diagnosis.rul_estimate_hours ?? Math.max(12, Math.round(128 * ((healthScore || 90) / 100)))}` : '--'}
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium">Days Remaining</p>
        </div>

        {/* Card 3: Failure Probability */}
        <div className="card bg-slate-900/60 backdrop-blur-lg border-slate-700/50 flex flex-col justify-between group hover:border-slate-500 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800 text-slate-400 group-hover:text-white transition-colors">
              <TrendingUp size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="label-xs text-slate-500">Failure Prob.</p>
              <h3 className="text-2xl font-black text-slate-100 leading-tight">
                {hasStream ? (isHealthy ? '3.2%' : `${Math.min(88, (100 - (healthScore || 80)) * 0.9).toFixed(1)}%`) : '--'}
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium">Window: 30 Days</p>
        </div>

        {/* Card 4: Maintenance Score */}
        <div className="card bg-slate-900/60 backdrop-blur-lg border-slate-700/50 flex flex-col justify-between group hover:border-slate-500 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800 text-slate-400 group-hover:text-white transition-colors">
              <Wrench size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="label-xs text-slate-500">Maintenance</p>
              <h3 className="text-2xl font-black text-slate-100 leading-tight">
                {hasStream ? (
                  <>
                    {healthScore}
                    <span className="text-sm font-normal text-slate-500 ml-0.5">/100</span>
                  </>
                ) : (
                  '--'
                )}
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            {hasStream ? (healthScore >= 85 ? 'Excellent' : healthScore >= 70 ? 'Moderate' : 'Needs Action') : 'Standby'}
          </p>
        </div>

        {/* Card 5: Alerts */}
        <div className="card bg-slate-900/60 backdrop-blur-lg border-slate-700/50 flex flex-col justify-between group hover:border-rose-500/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800 text-slate-400 group-hover:text-rose-500 transition-colors">
              <Bell size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="label-xs text-slate-500">Active Alerts</p>
              <h3 className="text-2xl font-black text-slate-100 leading-tight">
                {hasStream ? alerts.filter((a) => a.sev !== 'info').length : 0}
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            {hasStream && alerts.filter((a) => a.sev !== 'info').length > 0 ? 'Action Required' : 'All Clear / Standby'}
          </p>
        </div>
      </section>

      {/* ── Middle Section: 3-Column Layout ── */}
      <section className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: SENSOR OVERVIEW */}
        <div className="lg:col-span-3 card bg-slate-900/60 backdrop-blur-lg border-slate-700/50 flex flex-col justify-between">
          <div>
            <h3 className="section-title text-slate-400 uppercase mb-4 flex items-center gap-2">
              <Activity size={14} /> Sensor Overview
            </h3>

            <div className="divide-y divide-slate-800">
              {sensorOverviewItems.map((s, i) => (
                <div key={i} className="py-3 flex items-center justify-between text-xs group hover:bg-slate-800/30 px-1 rounded-lg transition-colors">
                  <div className="flex items-center gap-2.5 text-slate-500">
                    <s.icon size={14} className="text-slate-600" />
                    <span className="font-medium text-slate-400">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-100 tabular-nums">
                      {s.val}
                    </span>
                    {s.data && s.data.length > 0 ? (
                      <MiniSparkline data={s.data} color={s.color} />
                    ) : (
                      <span className="text-[10px] text-slate-600 font-mono">--</span>
                    )}
                    <span className={`w-1.5 h-1.5 rounded-full ${hasStream ? (s.color === '#F59E0B' ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-600'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/sensors"
            className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wider"
          >
            Full Telemetry Stack →
          </Link>
        </div>

        {/* Center Column: Holographic Engine Projection */}
        <div className="lg:col-span-6 relative flex flex-col justify-center items-center min-h-[500px] rounded-3xl overflow-hidden">
          {/* Holographic Aura */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-orange-500/5 via-transparent to-transparent opacity-50" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-1/3 bg-orange-500/10 blur-[80px] rounded-full" />

          {/* Header Bar with Model Badge & Controls */}
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full backdrop-blur-md">
                Rotax 912 ULS · 100 HP MALE UAV
              </span>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">S/N: RX-912-B4-2026</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShow3DToggle(!show3DToggle)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/80 border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors backdrop-blur-md shadow-xl cursor-pointer"
              >
                <Eye size={13} />
                <span>{show3DToggle ? 'Cutaway Mode' : 'Digital Twin'}</span>
              </button>
            </div>
          </div>

          {/* Engine Area */}
          <div className="relative w-full h-full flex items-center justify-center min-h-[450px]">
            {show3DToggle ? (
              <div className="w-full h-full min-h-[450px]">
                <EngineModel3D />
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <img
                  src="/rotax_912.png"
                  alt="Rotax 912 ULS Aircraft Engine"
                  className="max-h-[400px] w-auto object-contain select-none filter drop-shadow-[0_0_30px_rgba(255,107,53,0.2)]"
                />
              </div>
            )}
          </div>

          {/* Specs Summary Pill */}
          <div className="absolute bottom-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[10px] font-mono text-slate-500 bg-slate-900/40 backdrop-blur-md px-6 py-2 rounded-full border border-slate-700/50 w-max mx-auto">
            <span className="flex items-center gap-1"><div className="w-1 h-1 bg-slate-600 rounded-full" /> Power: 73.5 kW (100 hp)</span>
            <span className="flex items-center gap-1"><div className="w-1 h-1 bg-slate-600 rounded-full" /> Torque: 128 Nm</span>
            <span className="flex items-center gap-1"><div className="w-1 h-1 bg-slate-600 rounded-full" /> Weight: 56.6 kg</span>
            <span className="flex items-center gap-1"><div className="w-1 h-1 bg-slate-600 rounded-full" /> TBO: 2,000 hrs</span>
          </div>
        </div>

        {/* Right Column: PREDICTIVE INSIGHTS & TOP MAINTENANCE TASKS */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Card: PREDICTIVE INSIGHTS */}
          <div className="card bg-slate-900/60 backdrop-blur-lg border-slate-700/50 flex flex-col justify-between group hover:border-orange-500/50 transition-colors">
            <div className="relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Brain size={60} className="text-orange-500" />
              </div>
              <h3 className="section-title text-slate-400 uppercase mb-4 flex items-center gap-2">
                <Brain size={14} /> AI Insights
              </h3>

              <div className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0 mt-0.5 border border-orange-500/20">
                  <Brain size={20} strokeWidth={2} />
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {isHealthy
                    ? 'Rotax 912 AI physics model confidence is high. Dual ignition & dry sump nominal. Continue routine monitoring.'
                    : diagnosis.recommended_action}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                <span className="text-slate-500">AI Confidence</span>
                <span className="text-slate-100">96%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                <div
                  className="h-full bg-orange-500 rounded-full shadow-[0_0_8px_rgba(255,107,53,0.5)]"
                  style={{ width: '96%' }}
                />
              </div>
            </div>
          </div>

          {/* Card: TOP MAINTENANCE TASKS */}
          <div className="card bg-slate-900/60 backdrop-blur-lg border-slate-700/50 flex flex-col justify-between flex-1 group hover:border-slate-500 transition-colors">
            <div>
              <h3 className="section-title text-slate-400 uppercase mb-4 flex items-center gap-2">
                <Wrench size={14} /> Maintenance
              </h3>

              <div className="space-y-3">
                {[
                  { title: 'Dual Carburetor Sync Check', due: '50 flight hrs', prio: 'Medium', icon: ShieldCheck, color: 'text-amber-400' },
                  { title: 'Dry Sump Oil & Filter Change', due: '100 flight hrs', prio: 'Low', icon: Droplets, color: 'text-slate-400' },
                  { title: 'PSRU Gearbox Inspection', due: '200 flight hrs', prio: 'Low', icon: Clock, color: 'text-slate-400' },
                ].map((task, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-800/40 transition-colors group/task">
                    <div className="flex items-center gap-3">
                      <task.icon size={16} className="text-slate-500 group-hover/task:text-orange-500 transition-colors" />
                      <div>
                        <p className="text-xs font-bold text-slate-200 leading-snug">{task.title}</p>
                        <p className="text-[10px] text-slate-500">Due in {task.due}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                      task.prio === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {task.prio}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/maintenance"
              className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wider"
            >
              Full Task List →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Bottom Row: Trend & Alert Cards ── */}
      <section className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: VIBRATION TREND */}
        <div className="card bg-slate-900/60 backdrop-blur-lg border-slate-700/50 flex flex-col justify-between group hover:border-slate-500 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="section-title text-slate-400 uppercase">Vibration Trend</h4>
              <Activity size={14} className="text-slate-600" />
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500 mb-4">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-orange-500 inline-block" /> Actual
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 border-b border-dashed border-slate-600 inline-block" /> Baseline
              </span>
            </div>

            <div className="relative pt-2 pb-1">
              <span className="absolute -top-1 right-0 text-[11px] font-mono font-bold text-orange-500">
                {vibrationValue} mm/s
              </span>
              <svg viewBox="0 0 240 70" className="w-full h-20 overflow-visible">
                <line x1="0" y1="10" x2="240" y2="10" stroke="#1e293b" strokeWidth="1" />
                <line x1="0" y1="35" x2="240" y2="35" stroke="#1e293b" strokeWidth="1" />
                <line x1="0" y1="60" x2="240" y2="60" stroke="#1e293b" strokeWidth="1" />
                <text x="0" y="8" fontSize="8" fill="#475569">4.0</text>
                <text x="0" y="33" fontSize="8" fill="#475569">2.0</text>
                <text x="0" y="58" fontSize="8" fill="#475569">0</text>
                <path
                  d="M 20 48 Q 60 46 100 47 T 180 46 T 240 47"
                  fill="none"
                  stroke="#475569"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <path
                  d="M 20 46 Q 50 40 80 43 T 130 32 T 180 39 T 235 28"
                  fill="none"
                  stroke="#FF6B35"
                  strokeWidth="2.2"
                />
                <circle cx="235" cy="28" r="3" fill="#FF6B35" />
              </svg>
            </div>
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-600 mt-4 px-1">
            <span>MAY 20</span><span>MAY 22</span><span>MAY 24</span><span>MAY 26</span><span>MAY 27</span>
          </div>
        </div>

        {/* Card 2: EGT TREND */}
        <div className="card bg-slate-900/60 backdrop-blur-lg border-slate-700/50 flex flex-col justify-between group hover:border-slate-500 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="section-title text-slate-400 uppercase">EGT Trend</h4>
              <Thermometer size={14} className="text-slate-600" />
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500 mb-4">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-orange-500 inline-block" /> Actual
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 border-b border-dashed border-slate-600 inline-block" /> Baseline
              </span>
            </div>

            <div className="relative pt-2 pb-1">
              <span className="absolute -top-1 right-0 text-[11px] font-mono font-bold text-orange-500">
                {egtValue} °C
              </span>
              <svg viewBox="0 0 240 70" className="w-full h-20 overflow-visible">
                <line x1="0" y1="10" x2="240" y2="10" stroke="#1e293b" strokeWidth="1" />
                <line x1="0" y1="35" x2="240" y2="35" stroke="#1e293b" strokeWidth="1" />
                <line x1="0" y1="60" x2="240" y2="60" stroke="#1e293b" strokeWidth="1" />
                <text x="0" y="8" fontSize="8" fill="#475569">800</text>
                <text x="0" y="33" fontSize="8" fill="#475569">600</text>
                <text x="0" y="58" fontSize="8" fill="#475569">400</text>
                <path
                  d="M 20 44 Q 60 43 100 45 T 180 42 T 240 43"
                  fill="none"
                  stroke="#475569"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
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
          <div className="flex justify-between text-[9px] font-mono text-slate-600 mt-4 px-1">
            <span>MAY 20</span><span>MAY 22</span><span>MAY 24</span><span>MAY 26</span><span>MAY 27</span>
          </div>
        </div>

        {/* Card 3: HEALTH SCORE HISTORY */}
        <div className="card bg-slate-900/60 backdrop-blur-lg border-slate-700/50 flex flex-col justify-between group hover:border-slate-500 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="section-title text-slate-400 uppercase">Health Score</h4>
              <TrendingUp size={14} className="text-slate-600" />
            </div>
            <div className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Composite Index</div>

            <div className="relative pt-1 pb-1">
              <span className="absolute -top-1 right-1 text-xs font-black text-slate-100">
                {hasStream && healthScore != null ? `${healthScore}%` : '--'}
              </span>
              <svg viewBox="0 0 240 70" className="w-full h-20 overflow-visible">
                <line x1="0" y1="10" x2="240" y2="10" stroke="#1e293b" strokeWidth="1" />
                <line x1="0" y1="35" x2="240" y2="35" stroke="#1e293b" strokeWidth="1" />
                <line x1="0" y1="60" x2="240" y2="60" stroke="#1e293b" strokeWidth="1" />
                <text x="0" y="8" fontSize="8" fill="#475569">100</text>
                <text x="0" y="33" fontSize="8" fill="#475569">50</text>
                <text x="0" y="58" fontSize="8" fill="#475569">0</text>
                {[
                  { x: 30, h: hasStream ? 42 : 10 }, { x: 62, h: hasStream ? 40 : 10 }, { x: 94, h: hasStream ? 44 : 10 },
                  { x: 126, h: hasStream ? 47 : 10 }, { x: 158, h: hasStream ? 46 : 10 }, { x: 190, h: hasStream ? 50 : 10 }, { x: 222, h: hasStream ? Math.round((healthScore || 80) * 0.6) : 10 },
                ].map((bar, i) => (
                  <rect
                    key={i}
                    x={bar.x}
                    y={65 - bar.h}
                    width="12"
                    height={bar.h}
                    rx="2.5"
                    fill={i === 6 ? '#FF6B35' : '#475569'}
                    opacity={i === 6 ? 1 : 0.5}
                  />
                ))}
              </svg>
            </div>
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-600 mt-4 px-1">
            <span>-60s</span><span>-50s</span><span>-40s</span><span>-30s</span><span>-20s</span><span>LIVE</span>
          </div>
        </div>

        {/* Card 4: RECENT ALERTS */}
        <div className="card bg-slate-900/60 backdrop-blur-lg border-slate-700/50 flex flex-col justify-between group hover:border-rose-500/50 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="section-title text-slate-400 uppercase">Recent Alerts</h4>
              <Bell size={14} className="text-slate-600" />
            </div>

            <div className="space-y-3">
              {alerts && alerts.length > 0 ? (
                alerts.slice(0, 3).map((alert, i) => (
                  <div key={alert.id || i} className="flex items-start justify-between p-2 rounded-lg hover:bg-slate-800/40 transition-colors group/alert">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-6 h-6 rounded-lg ${alert.sev === 'critical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'} flex items-center justify-center shrink-0 mt-0.5 border`}>
                        <AlertTriangle size={12} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200 leading-snug">{alert.msg}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{alert.ts || 'Live'}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase ${alert.sev === 'critical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                      {alert.sev}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  {hasStream ? 'All engine parameters nominal. No active alerts.' : 'System standby. Awaiting telemetry stream.'}
                </div>
              )}
            </div>
          </div>

          <Link
            to="/faults"
            className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wider"
          >
            All System Alerts →
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
