import React from 'react';
import { Brain, Play, ChevronDown, Wifi, WifiOff } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useEngineStore } from '../../store/useEngineStore';

const PAGE_META = {
  '/':           { title: 'Aero Engine Health Monitoring', sub: 'Real-time analytics & predictive maintenance' },
  '/telemetry':  { title: 'Live Telemetry Stream',         sub: 'Real-time sensor data & WebSocket feed'      },
  '/analytics':  { title: 'Analytics & Reports',           sub: 'Historical trends & fault frequency'         },
  '/tasks':      { title: 'Maintenance Tasks',             sub: 'Scheduled & active maintenance items'        },
  '/settings':   { title: 'Settings',                      sub: 'Thresholds, presets & display preferences'   },
};

const TopBar = () => {
  const location = useLocation();
  const meta = PAGE_META[location.pathname] || PAGE_META['/'];

  const setDrawerOpen = useEngineStore(s => s.setDrawerOpen);
  const wsConnected   = useEngineStore(s => s.wsConnected);
  const diagnosis     = useEngineStore(s => s.diagnosis);

  const aiStatus =
    diagnosis.status === 'Healthy'  ? { label: 'Optimal',      dot: 'bg-green-400' } :
    diagnosis.status === 'Warning'  ? { label: 'Degraded',     dot: 'bg-amber-400' } :
                                      { label: 'Alert Active',  dot: 'bg-red-500 animate-pulse' };

  return (
    <header className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 leading-tight">{meta.title}</h1>
        <p className="text-sm text-gray-400 font-medium mt-0.5">{meta.sub}</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button className="btn-ghost text-sm">
          Flight Hrs 0–24 <ChevronDown size={14} className="text-gray-400" />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-card text-xs font-medium text-gray-500">
          {wsConnected
            ? <><Wifi size={13} className="text-green-500" /><span className="text-green-600 font-semibold">Live</span></>
            : <><WifiOff size={13} className="text-amber-500" /><span className="text-amber-600 font-semibold">Simulated</span></>
          }
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-card">
          <Brain size={15} className="text-orange-500" />
          <span className="text-xs font-semibold text-gray-700">AI Model</span>
          <span className={`w-2 h-2 rounded-full ${aiStatus.dot}`} />
          <span className="text-xs font-medium text-gray-500">{aiStatus.label}</span>
        </div>

        <button onClick={() => setDrawerOpen(true)} className="btn-orange">
          <Play size={14} /> Run Simulation
        </button>
      </div>
    </header>
  );
};

export default TopBar;
