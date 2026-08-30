import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useEngineStore } from '../store/useEngineStore';
import { LineChart as ChartIcon, Eye } from 'lucide-react';

const TrendCharts = () => {
  const history = useEngineStore((state) => state.history);
  const [activeMetric, setActiveMetric] = useState('rpm');

  const metrics = [
    { key: 'rpm', name: 'Engine Speed', unit: 'RPM', stroke: '#22d3ee' },
    { key: 'cht', name: 'Cylinder Temp (CHT)', unit: '°C', stroke: '#f97316' },
    { key: 'egt', name: 'Exhaust Temp (EGT)', unit: '°C', stroke: '#fb7185' },
    { key: 'oil_pressure', name: 'Oil Pressure', unit: 'kPa', stroke: '#a855f7' },
    { key: 'oil_temp', name: 'Oil Temp', unit: '°C', stroke: '#fbbf24' },
    { key: 'vibration', name: 'Vibration', unit: 'g', stroke: '#34d399' }
  ];

  const selectedMetric = metrics.find(m => m.key === activeMetric) || metrics[0];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded shadow-lg font-mono text-[10px]">
          <p className="text-slate-500 mb-1">{`Frame Time: ${label || 'n/a'}`}</p>
          <p className="font-bold" style={{ color: payload[0].color }}>
            {`${payload[0].name}: ${payload[0].value.toFixed(1)} ${selectedMetric.unit}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-col h-[320px] justify-between">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 mb-4 gap-2">
        <h3 className="text-sm font-bold tracking-wider text-cyan-400 font-mono flex items-center gap-2">
          <ChartIcon className="w-5 h-5" />
          TELEMETRY TREND RECORDER
        </h3>

        {/* Toggle Select Grid */}
        <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-850 overflow-x-auto max-w-full">
          {metrics.map(m => (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold whitespace-nowrap transition-all ${
                activeMetric === m.key ? 'bg-slate-800 text-cyan-400 border border-slate-750' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56 w-full flex items-center justify-center bg-slate-950/40 rounded-lg border border-slate-900/80 p-2">
        {history.length < 2 ? (
          <div className="text-center font-mono text-xs text-slate-500 flex flex-col items-center gap-2">
            <Eye className="w-6 h-6 animate-pulse text-cyan-500" />
            <span>Waiting for streaming WebSocket telemetry frame synchronization...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
              <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 9 }} stroke="#1e293b" />
              <YAxis tick={{ fill: '#475569', fontSize: 9 }} stroke="#1e293b" domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={selectedMetric.key}
                name={selectedMetric.name}
                stroke={selectedMetric.stroke}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TrendCharts;
