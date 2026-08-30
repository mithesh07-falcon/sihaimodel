import React from 'react';
import { Brain, Play, Cpu, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useEngineStore } from '../../store/useEngineStore';

const PAGE_META = {
  '/':           { title: 'UAV ENGINE DIGITAL TWIN', sub: 'AI-Based State-of-Health & Predictive Maintenance' },
  '/telemetry':  { title: 'Live Telemetry Stream',   sub: 'Real-time sensor data · WebSocket feed · SIMULATED' },
  '/analytics':  { title: 'Analytics & Reports',      sub: 'Historical trends & fault frequency analysis' },
  '/tasks':      { title: 'Maintenance Tasks',        sub: 'Scheduled & active maintenance items' },
  '/settings':   { title: 'Settings',                 sub: 'Thresholds, presets & display preferences' },
};

const TopBar = () => {
  const location = useLocation();
  const meta = PAGE_META[location.pathname] || PAGE_META['/'];

  const setDrawerOpen  = useEngineStore(s => s.setDrawerOpen);
  const wsConnected    = useEngineStore(s => s.wsConnected);
  const diagnosis      = useEngineStore(s => s.diagnosis);
  const soh            = useEngineStore(s => s.soh);
  const engineRunning  = useEngineStore(s => s.engineRunning);

  const aiStatus =
    diagnosis.status === 'Healthy'  ? { label: 'OPTIMAL',       dot: 'bg-green-400' } :
    diagnosis.status === 'Warning'  ? { label: 'DEGRADED',      dot: 'bg-amber-400 animate-pulse' } :
                                      { label: 'ALERT ACTIVE',  dot: 'bg-red-500 animate-pulse' };

  return (
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        {/* SIH 2026 Badge */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500 text-white text-[10px] font-black tracking-wider shadow-sm">
            <Cpu size={9} /> SIH 2026 · SIMULATION
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-bold">
            <AlertTriangle size={8} /> ALL DATA SIMULATED
          </span>
        </div>
        <h1 className="text-xl font-black text-gray-900 leading-tight tracking-tight">{meta.title}</h1>
        <p className="text-xs text-gray-400 font-medium mt-0.5">{meta.sub}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Engine status */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold
          ${engineRunning ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <span className={`w-2 h-2 rounded-full ${engineRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          ENGINE {engineRunning ? 'RUNNING' : 'STOPPED'}
        </div>

        {/* Connection */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-gray-100 shadow-sm text-xs font-medium text-gray-500">
          {wsConnected
            ? <><Wifi size={12} className="text-green-500" /><span className="text-green-600 font-semibold">Live WS</span></>
            : <><WifiOff size={12} className="text-amber-500" /><span className="text-amber-600 font-semibold">Simulated Mock</span></>
          }
        </div>

        {/* SOH quick view */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gray-100 shadow-sm">
          <span className="text-[10px] font-semibold text-gray-500">SOH</span>
          <span className={`text-sm font-black
            ${(soh?.overall ?? 100) >= 85 ? 'text-green-600' : (soh?.overall ?? 100) >= 65 ? 'text-amber-500' : 'text-red-600'}`}>
            {soh?.overall ?? 87}%
          </span>
        </div>

        {/* AI Model status */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Brain size={13} className="text-orange-500" />
          <span className="text-xs font-semibold text-gray-700">AI Model</span>
          <span className={`w-2 h-2 rounded-full ${aiStatus.dot}`} />
          <span className="text-xs font-medium text-gray-500">{aiStatus.label}</span>
        </div>

        {/* Run Simulation */}
        <button onClick={() => setDrawerOpen(true)} className="btn-orange">
          <Play size={13} /> Run Simulation
        </button>
      </div>
    </header>
  );
};

export default TopBar;
