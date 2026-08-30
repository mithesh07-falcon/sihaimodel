import React, { useEffect } from 'react';
import { useEngineStore } from './store/useEngineStore';
import { 
  EngineModel3D, 
  ParameterPanel, 
  DiagnosisPanel, 
  Gauges, 
  TrendCharts 
} from './Components/Components';
import { 
  Plane, 
  Radio, 
  Activity, 
  Cpu, 
  Compass, 
  Layers, 
  Wifi, 
  WifiOff, 
  Gauge, 
  HeartHandshake 
} from 'lucide-react';

const App = () => {
  const wsConnected = useEngineStore((state) => state.wsConnected);
  const connectWebSocket = useEngineStore((state) => state.connectWebSocket);
  const diagnosis = useEngineStore((state) => state.diagnosis);
  const telemetry = useEngineStore((state) => state.telemetry);
  const preset = useEngineStore((state) => state.preset);

  // Initialize Websocket client on startup
  useEffect(() => {
    connectWebSocket();
  }, [connectWebSocket]);

  const getReliabilityStyle = (score) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/20';
    if (score >= 70) return 'text-amber-400 border-amber-500/20';
    return 'text-red-400 border-red-500/20';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans scanlines flex flex-col xl:flex-row hud-grid selection:bg-cyan-500/20 selection:text-cyan-400">
      
      {/* 1. FLIGHT CONTROL SIDEBAR */}
      <aside className="w-full xl:w-72 bg-slate-900/40 border-b xl:border-b-0 xl:border-r border-slate-800/80 flex flex-col p-6 shrink-0 glass-panel">
        
        {/* Branding */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative w-9 h-9 flex items-center justify-center bg-cyan-500 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <Plane className="w-5 h-5 text-slate-950 font-black" />
          </div>
          <div>
            <h2 className="text-sm font-black font-mono tracking-wider text-slate-100">AEROTWIN GCS</h2>
            <span className="text-[8px] font-mono text-cyan-400 font-semibold tracking-widest uppercase block">PROTOTYPE OPS</span>
          </div>
        </div>

        {/* Flight Statistics HUD */}
        <div className="space-y-6 flex-1">
          <div className="space-y-2 border-b border-slate-800 pb-4">
            <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Operational Links</span>
            
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-cyan-400" />WS Telemetry</span>
              {wsConnected ? (
                <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ONLINE
                </span>
              ) : (
                <span className="text-amber-400 font-extrabold flex items-center gap-1">
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  OFFLINE (MOCK)
                </span>
              )}
            </div>

            <div className="flex justify-between items-center text-xs font-mono mt-2">
              <span className="text-slate-400 flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 text-purple-400" />Receiver Link</span>
              <span className="text-cyan-400 font-bold">100% (RSSI)</span>
            </div>
          </div>

          {/* Quick Core Sensor readouts on sidebar */}
          <div className="space-y-3 font-mono text-[10px]">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Critical Threshold Diagnostics</span>
            
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Vibration Noise</span>
                <span className="text-cyan-300 font-bold">{telemetry.vibration?.toFixed(2)} g</span>
              </div>
              <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-900">
                <div 
                  className={`h-full transition-all duration-300 ${telemetry.vibration > 2.0 ? 'bg-red-500' : telemetry.vibration > 1.4 ? 'bg-amber-500' : 'bg-cyan-500'}`} 
                  style={{ width: `${Math.min(100, (telemetry.vibration / 6.0) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Voltage level</span>
                <span className="text-cyan-300 font-bold">{telemetry.voltage?.toFixed(1)} V</span>
              </div>
              <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-900">
                <div 
                  className="h-full bg-cyan-500" 
                  style={{ width: `${Math.min(100, ((telemetry.voltage - 8) / 10) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Altitude envelope</span>
                <span className="text-cyan-300 font-bold">{Math.round(telemetry.altitude)} m</span>
              </div>
              <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-900">
                <div 
                  className="h-full bg-cyan-500" 
                  style={{ width: `${Math.min(100, (telemetry.altitude / 8000) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Global mission progress */}
        <div className="border-t border-slate-800/60 pt-4 mt-6 font-mono text-[9px] text-slate-500 space-y-1">
          <div className="flex justify-between font-bold">
            <span>UAV FLIGHT ID:</span>
            <span className="text-slate-300">ROTAX-MALE-009</span>
          </div>
          <div className="flex justify-between">
            <span>SIMULATION FRAME:</span>
            <span className="text-cyan-500 font-bold uppercase">{preset}</span>
          </div>
        </div>
      </aside>

      {/* 2. MAIN COCKPIT DASHBOARD GRID */}
      <main className="flex-1 p-6 overflow-y-auto max-w-[1400px] mx-auto w-full space-y-6">
        
        {/* Top Header Information Panel */}
        <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 border-glow-cyan">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/40 border border-cyan-500/20 rounded-lg text-cyan-400">
              <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black font-mono tracking-wider text-cyan-400 text-glow-cyan">
                AEROTWIN MISSION MONITOR
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">
                AI-Enabled Real-Time Propulsion Prognostics & Health Dashboard (SIMULATED DATA STREAM)
              </p>
            </div>
          </div>

          {/* Quick aggregate mission indicators */}
          <div className="flex items-center gap-6 font-mono">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">Mission Reliability</span>
              <span className={`text-sm font-extrabold flex items-center justify-end gap-1.5 ${getReliabilityStyle(diagnosis.mission_reliability_score)}`}>
                {diagnosis.mission_reliability_score}%
              </span>
            </div>
            <div className="border-l border-slate-800 pl-6 text-right">
              <span className="text-[10px] text-slate-500 block">Cylinder Status</span>
              <span className={`text-sm font-bold ${diagnosis.status === 'Critical' ? 'text-red-400' : diagnosis.status === 'Warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {diagnosis.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Core telemetry meters dial row */}
        <Gauges />

        {/* Dynamic Interactive Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Sliders & Controller parameters */}
          <div className="lg:col-span-1">
            <ParameterPanel />
          </div>

          {/* Column 2: R3F 3D Engine Model viewport */}
          <div className="lg:col-span-2">
            <EngineModel3D />
          </div>
        </div>

        {/* Diagnostics & trendline metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DiagnosisPanel />
          </div>
          <div className="lg:col-span-1">
            <TrendCharts />
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;
export { App };