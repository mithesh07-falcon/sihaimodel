import React from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';
import { useEngineStore } from '../../store/useEngineStore';

const BASELINES = { vibration: 1.1, egt: 810 };

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-card-md text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {Number(p.value).toFixed(1)} {unit}
        </p>
      ))}
    </div>
  );
};

const ChartCard = ({ title, children }) => (
  <div className="card border border-gray-100 flex flex-col gap-3 flex-1 min-w-0">
    <h3 className="text-sm font-bold text-gray-800">{title}</h3>
    <div className="h-44">{children}</div>
  </div>
);

const TrendChartsRow = () => {
  const history = useEngineStore(s => s.history);

  const vibData = history.map(h => ({
    time: h.time,
    Actual:   parseFloat((h.vibration || 1.1).toFixed(2)),
    Baseline: BASELINES.vibration
  }));

  const egtData = history.map(h => ({
    time: h.time,
    Actual:   parseFloat((h.egt || 810).toFixed(0)),
    Baseline: BASELINES.egt
  }));

  const healthData = history.map((h, i) => ({
    session: `S${i + 1}`,
    Score: h.health_score ?? 95
  }));

  const tickStyle = { fill: '#9CA3AF', fontSize: 9 };
  const axisStyle = { stroke: '#F3F4F6' };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Vibration Trend */}
      <ChartCard title="Vibration Trend (g RMS)">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={vibData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="time" tick={tickStyle} axisLine={axisStyle} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={tickStyle} axisLine={axisStyle} tickLine={false} domain={['auto','auto']} />
            <Tooltip content={<CustomTooltip unit="g" />} />
            <Legend wrapperStyle={{ fontSize:10, color:'#9CA3AF' }} />
            <Line type="monotone" dataKey="Actual" stroke="#FF6B35" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="Baseline" stroke="#D1D5DB" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* EGT Trend */}
      <ChartCard title="EGT Trend (°C)">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={egtData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="time" tick={tickStyle} axisLine={axisStyle} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={tickStyle} axisLine={axisStyle} tickLine={false} domain={['auto','auto']} />
            <Tooltip content={<CustomTooltip unit="°C" />} />
            <Legend wrapperStyle={{ fontSize:10, color:'#9CA3AF' }} />
            <ReferenceLine y={870} stroke="#EF4444" strokeDasharray="3 3" label={{ value:'Limit', fill:'#EF4444', fontSize:9 }} />
            <Line type="monotone" dataKey="Actual" stroke="#F59E0B" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="Baseline" stroke="#D1D5DB" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Health Score History */}
      <ChartCard title="Health Score History">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={healthData.slice(-15)} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="session" tick={tickStyle} axisLine={axisStyle} tickLine={false} />
            <YAxis domain={[0, 100]} tick={tickStyle} axisLine={axisStyle} tickLine={false} />
            <Tooltip content={<CustomTooltip unit="" />} />
            <Bar dataKey="Score" radius={[4, 4, 0, 0]} isAnimationActive={false}
              fill="#FF6B35"
              label={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

export default TrendChartsRow;
