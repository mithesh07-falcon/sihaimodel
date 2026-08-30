import React, { useEffect } from 'react';
import { useEngineStore } from './store/useEngineStore';
import {
  EngineModel3D,
  ParameterPanel,
  DiagnosisPanel,
  Gauges,
  TrendCharts,
  AlertFeed
} from './Components/Components';
import {
  Plane, Radio, Activity, Wifi, WifiOff, Shield
} from 'lucide-react';

// ─── Mission Reliability Ring ─────────────────────────────────────────────────
const ReliabilityRing = ({ score }) => {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * score) / 100;
  const color = score >= 80 ? '#10b981' : score >= 55 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} stroke="rgba(30,41,59,0.6)"
          strokeWidth="6" fill="transparent" />
        <circle cx="40" cy="40" r={r}
          stroke={color} strokeWidth="6" fill="transparent"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
        <span className="text-sm font-black leading-none" style={{ color }}>{score}</span>
        <span className="text-[8px] text-slate-500 font-bold">%</span>
      </div>
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────
const App = () => {
  const wsConnected    = useEngineStore(s => s.wsConnected);
  const connectWebSocket = useEngineStore(s => s.connectWebSocket);
  const diagnosis      = useEngineStore(s => s.diagnosis);
  const telemetry      = useEngineStore(s => s.telemetry);
  const preset         = useEngineStore(s => s.preset);

  useEffect(() => { connectWebSocket(); }, [connectWebSocket]);

  const statusColor = {
    Healthy:  'text-emerald-400',
    Warning:  'text-amber-400',
    Critical: 'text-red-400'
  }[diagnosis.status] || 'text-slate-400';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans scanlines flex flex-col xl:flex-row hud-grid selection:bg-cyan-500/20 selection:text-cyan-400">

      {/* ═══ LEFT SIDEBAR ═════════════════════════════════════════════════════ */}
      <aside className="w-full xl:w-72 bg-slate-900/40 border-b xl:border-b-0 xl:border-r border-slate-800/80 flex flex-col p-5 shrink-0 glass-panel">

        {/* Branding */}
        <div className="flex items-center gap-3 mb-7">
          <div className="w-9 h-9 flex items-center justify-center bg-cyan-500 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <Plane className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h2 className="text-sm font-black font-mono tracking-wider text-slate-100">AEROTWIN GCS</h2>
            <span className="text-[8px] font-mono text-cyan-400 font-semibold tracking-widest uppercase">PROTOTYPE OPS</span>
          </div>
        </div>

        {/* Connection status */}
        <div className="space-y-2 border-b border-slate-800 pb-4 mb-5">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Operational Links</span>
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />WS Telemetry
            </span>
            {wsConnected ? (
              <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />ONLINE
              </span>
            ) : (
              <span className="text-amber-400 font-extrabold flex items-center gap-1">
                <WifiOff className="w-3.5 h-3.5" />MOCK MODE
              </span>
            )}
          </div>
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-purple-400" />Receiver Link
            </span>
            <span className="text-cyan-400 font-bold">100% RSSI</span>
          </div>
        </div>

        {/* Mission Reliability */}
        <div className="flex items-center gap-4 p-3 bg-slate-900/60 border border-slate-800 rounded-xl mb-5">
          <ReliabilityRing score={diagnosis.mission_reliability_score} />
          <div className="font-mono">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Mission Reliability</span>
            <span className={`text-base font-black ${statusColor}`}>
              {diagnosis.status.toUpperCase()}
            </span>
            <span className="text-[9px] text-slate-500 block mt-0.5">
              {(diagnosis.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
        </div>

        {/* Sensor thresholds sidebar */}
        <div className="space-y-3 font-mono text-[10px] flex-1">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Critical Thresholds</span>

          {[
            { label: 'Vibration', val: telemetry.vibration, unit: 'g',   max: 6,    warn: 2.0 },
            { label: 'Voltage',   val: telemetry.voltage,   unit: 'V',   max: 18,   warn: 11.5, invert: true },
            { label: 'Altitude',  val: telemetry.altitude,  unit: 'm',   max: 8000 },
            { label: 'Oil Temp',  val: telemetry.oil_temp,  unit: '°C',  max: 150,  warn: 110 }
          ].map(item => (
            <div key={item.label}>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>{item.label}</span>
                <span className={`font-bold ${item.warn && (item.invert ? item.val < item.warn : item.val > item.warn) ? 'text-amber-400' : 'text-cyan-300'}`}>
                  {typeof item.val === 'number' ? item.val.toFixed(item.val < 10 ? 1 : 0) : '—'} {item.unit}
                </span>
              </div>
              <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-900">
                <div
                  className={`h-full transition-all duration-300 ${item.warn && (item.invert ? item.val < item.warn : item.val > item.warn) ? 'bg-amber-500' : 'bg-cyan-500'}`}
                  style={{ width: `${Math.min(100, (item.val / item.max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800/60 pt-3 mt-4 font-mono text-[9px] text-slate-500 space-y-0.5">
          <div className="flex justify-between font-bold">
            <span>UAV FLIGHT ID:</span>
            <span className="text-slate-300">ROTAX-MALE-009</span>
          </div>
          <div className="flex justify-between">
            <span>ACTIVE FRAME:</span>
            <span className="text-cyan-500 font-bold uppercase">{preset}</span>
          </div>
          <div className="flex justify-between mt-2 items-center">
            <Shield className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span className="text-slate-600 italic text-[8px]">SIMULATED DATA — PROTOTYPE</span>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN DASHBOARD ═══════════════════════════════════════════════════ */}
      <main className="flex-1 p-5 overflow-y-auto space-y-5">

        {/* ── Top Header ── */}
        <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 border-glow-cyan">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/40 border border-cyan-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black font-mono tracking-wider text-cyan-400 text-glow-cyan">
                AEROTWIN MISSION MONITOR
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">
                AI-Enabled Real-Time Propulsion Prognostics &amp; Health Dashboard
                &nbsp;<span className="text-amber-500/80 font-bold">[SIMULATED DATA STREAM]</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5 font-mono">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">Fault Component</span>
              <span className={`text-xs font-bold ${statusColor}`}>{diagnosis.fault_component}</span>
            </div>
            <div className="border-l border-slate-800 pl-5 text-right">
              <span className="text-[10px] text-slate-500 block">Reliability Index</span>
              <span className={`text-xl font-black ${statusColor}`}>
                {diagnosis.mission_reliability_score}<span className="text-sm">%</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Gauges Row ── */}
        <Gauges />

        {/* ── Parameter Panel + 3D Model ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
            <ParameterPanel />
          </div>
          <div className="lg:col-span-2">
            <EngineModel3D />
          </div>
        </div>

        {/* ── Diagnosis + Trend Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <DiagnosisPanel />
          </div>
          <div className="lg:col-span-1">
            <TrendCharts />
          </div>
        </div>

        {/* ── Alert Feed ── */}
        <AlertFeed />

      </main>
    </div>
  );
};

export default App;
export { App };