import React from 'react';
import { Brain, Play, ChevronDown, Wifi, WifiOff } from 'lucide-react';
import { useEngineStore } from '../../store/useEngineStore';

const TopBar = () => {
  const setDrawerOpen = useEngineStore(s => s.setDrawerOpen);
  const wsConnected   = useEngineStore(s => s.wsConnected);
  const diagnosis     = useEngineStore(s => s.diagnosis);

  const aiStatus = diagnosis.status === 'Healthy'   ? { label: 'Optimal',  dot: 'bg-green-400' }
                 : diagnosis.status === 'Warning'   ? { label: 'Degraded', dot: 'bg-amber-400' }
                 : { label: 'Alert Active', dot: 'bg-red-400 animate-pulse' };

  return (
    <header className="flex items-center justify-between gap-4 flex-wrap">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          Aero Engine Health Monitoring
        </h1>
        <p className="text-sm text-gray-400 font-medium mt-0.5">
          Real-time analytics &amp; predictive maintenance
        </p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Date selector */}
        <button className="btn-ghost text-sm">
          Flight Hrs 0–24
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {/* WS status */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-card text-xs font-medium text-gray-500">
          {wsConnected
            ? <><Wifi size={13} className="text-green-500" /><span className="text-green-600">Live</span></>
            : <><WifiOff size={13} className="text-amber-500" /><span className="text-amber-600">Simulated</span></>
          }
        </div>

        {/* AI Model Status */}
        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-card">
          <Brain size={15} className="text-orange-500" />
          <span className="text-xs font-semibold text-gray-700">AI Model</span>
          <span className={`w-2 h-2 rounded-full ${aiStatus.dot}`} />
          <span className="text-xs font-medium text-gray-500">{aiStatus.label}</span>
        </div>

        {/* Run Simulation */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="btn-orange"
        >
          <Play size={14} />
          Run Simulation
        </button>
      </div>
    </header>
  );
};

export default TopBar;
