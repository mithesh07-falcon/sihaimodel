import React from 'react';
import { useEngineStore } from '../store/useEngineStore';
import { Activity } from 'lucide-react';

const DialGauge = ({ value, min, max, label, unit, color = '#00e5ff', warningThreshold, criticalThreshold }) => {
  // Convert value to degrees (from -140 to 140 deg for visual dial gauge)
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const radius = 40;
  const strokeDash = 2 * Math.PI * radius; // ~251.2
  
  // Cut bottom arc for speedometer feel: draw only 75% of circle
  const dashoffset = strokeDash - (strokeDash * percentage * 0.75) / 100;
  
  let statusColor = color;
  if (criticalThreshold && value >= criticalThreshold) {
    statusColor = '#ef4444'; // Red
  } else if (warningThreshold && value >= warningThreshold) {
    statusColor = '#f59e0b'; // Amber
  }

  return (
    <div className="flex flex-col items-center justify-between p-4 bg-slate-900/30 border border-slate-900 rounded-xl font-mono relative overflow-hidden">
      <div className="relative w-24 h-24">
        {/* Radial background Track */}
        <svg className="w-full h-full transform -rotate-[225deg]" viewBox="0 0 100 100">
          <circle 
            cx="50" cy="50" r={radius} 
            stroke="rgba(30, 41, 59, 0.4)" 
            strokeWidth="7" 
            fill="transparent"
            strokeDasharray={strokeDash}
            strokeDashoffset={strokeDash * 0.25} // gaps bottom 25%
            strokeLinecap="round"
          />
          {/* Active indicator arc */}
          <circle 
            cx="50" cy="50" r={radius} 
            stroke={statusColor} 
            strokeWidth="7" 
            fill="transparent" 
            strokeDasharray={strokeDash}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
          />
        </svg>
        {/* Text Center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</span>
          <span className="text-sm font-black text-slate-100 tracking-tight leading-none mt-0.5">
            {Math.round(value)}
          </span>
          <span className="text-[8px] text-slate-400 font-bold">{unit}</span>
        </div>
      </div>
    </div>
  );
};

const Gauges = () => {
  const telemetry = useEngineStore((state) => state.telemetry);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
      <DialGauge 
        value={telemetry.rpm} 
        min={1000} 
        max={6000} 
        label="RPM" 
        unit="RPM" 
        color="#22d3ee" 
        warningThreshold={5200}
        criticalThreshold={5600}
      />
      <DialGauge 
        value={telemetry.cht} 
        min={40} 
        max={160} 
        label="CHT" 
        unit="°C" 
        color="#f97316" 
        warningThreshold={125}
        criticalThreshold={135}
      />
      <DialGauge 
        value={telemetry.egt} 
        min={300} 
        max={1000} 
        label="EGT" 
        unit="°C" 
        color="#fb7185" 
        warningThreshold={860}
        criticalThreshold={910}
      />
      <DialGauge 
        value={telemetry.oil_pressure} 
        min={0} 
        max={600} 
        label="Oil Pres" 
        unit="kPa" 
        color="#a855f7" 
        warningThreshold={480}
        criticalThreshold={520}
      />
    </div>
  );
};

export default Gauges;
export { DialGauge };
