import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Zap, Wrench } from 'lucide-react';
import { useEngineStore } from '../store/useEngineStore';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

const SUBSYSTEMS = [
  { key:'oilScore',     label:'Oil System',      weight:30, color:'#8B5CF6' },
  { key:'thermalScore', label:'Thermal System',   weight:20, color:'#EF4444' },
  { key:'vibScore',     label:'Vibration',        weight:20, color:'#F59E0B' },
  { key:'rpmScore',     label:'RPM / Performance',weight:15, color:'#3B82F6' },
  { key:'fuelScore',    label:'Fuel System',      weight:15, color:'#22C55E' },
];

const SubsystemBar = ({ label, score, weight, color }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="font-semibold text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-[9px]">wt {weight}%</span>
        <span className="font-black text-sm" style={{ color: score < 70 ? '#EF4444' : score < 85 ? '#F59E0B' : color }}>
          {score}%
        </span>
      </div>
    </div>
    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: score < 70 ? '#EF4444' : score < 85 ? '#F59E0B' : color }}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.8 }}
      />
    </div>
  </div>
);

const SOHGauge = ({ value }) => {
  const color = value >= 85 ? '#22C55E' : value >= 65 ? '#F59E0B' : '#EF4444';
  const label = value >= 85 ? 'GOOD' : value >= 65 ? 'FAIR' : value >= 45 ? 'DEGRADED' : 'CRITICAL';
  // Arc: 180° semicircle
  const r = 80; const cx = 100; const cy = 100;
  const startAngle = -180; const endAngle = 0;
  const angle = startAngle + ((value / 100) * 180);
  const rad = (deg) => (deg * Math.PI) / 180;
  const x = cx + r * Math.cos(rad(angle));
  const y = cy + r * Math.sin(rad(angle));
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const valuePath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}`;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" width="200" height="120">
        {/* Track */}
        <path d={arcPath} fill="none" stroke="#E5E7EB" strokeWidth="14" strokeLinecap="round" />
        {/* Value arc */}
        <path d={valuePath} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
        {/* Tip dot */}
        <circle cx={x} cy={y} r="8" fill={color} />
        {/* Text */}
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="28" fontWeight="900" fill={color}>{value}%</text>
        <text x={cx} y={cy + 28} textAnchor="middle" fontSize="10" fontWeight="700" fill={color} letterSpacing="2">{label}</text>
      </svg>
      <p className="text-xs text-gray-400 -mt-2">State of Health (SOH)</p>
    </div>
  );
};

const AIHealthPage = () => {
  const navigate   = useNavigate();
  const soh        = useEngineStore(s => s.soh);
  const diagnosis  = useEngineStore(s => s.diagnosis);
  const history    = useEngineStore(s => s.history);
  const maintenanceRecs = useEngineStore(s => s.maintenanceRecs);

  const overall  = soh?.overall ?? 87;
  const anomaly  = soh?.anomalyScore ?? 13;
  const degrad   = soh?.degradation ?? 13;
  const rul      = diagnosis?.rul_estimate_hours ?? 126;
  const fp30     = diagnosis?.failure_probability_30d ?? 2.1;

  const anomalyData = history.slice(-30).map(h => ({ t: h.time, 'Anomaly': h.anomaly_score ?? 0, 'SOH': h.health_score ?? 90 }));
  const tt = { fill: '#9CA3AF', fontSize: 8 }; const ax = { stroke: '#F3F4F6' };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black tracking-widest text-gray-800">AI ENGINE HEALTH ANALYTICS</span>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-green-50 border border-green-200 text-green-700">
            STEP 5 / 7
          </span>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700">
            ⚠ SIMULATED ESTIMATES
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/faults')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 border border-red-200 text-red-600">
            <Zap size={11} /> Fault Simulation
          </button>
          <button onClick={() => navigate('/maintenance')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3D00)' }}>
            Maintenance <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Top row — SOH gauge + 4 KPIs */}
        <div className="flex gap-5">
          {/* SOH Gauge card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center justify-center" style={{ minWidth: 220 }}>
            <SOHGauge value={overall} />
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3 flex-1">
            {[
              { label:'Anomaly Score', value:`${anomaly}/100`, sub: anomaly <= 30 ? 'NORMAL' : anomaly <= 60 ? 'ELEVATED' : 'ANOMALY',
                color: anomaly > 60 ? '#EF4444' : anomaly > 30 ? '#F59E0B' : '#22C55E' },
              { label:'Degradation',   value:`${degrad}%`,    sub:'From baseline',   color: degrad > 35 ? '#EF4444' : '#374151' },
              { label:'RUL Estimate',  value:`${rul} hrs`,    sub:'SIMULATED',       color: rul < 50 ? '#EF4444' : rul < 100 ? '#F59E0B' : '#374151' },
              { label:'Fail Prob 30d', value:`${fp30}%`,      sub:'Next 30 days',    color: fp30 > 20 ? '#EF4444' : fp30 > 8 ? '#F59E0B' : '#374151' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{kpi.label}</p>
                <p className="text-2xl font-black tabular-nums" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{kpi.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Subsystem breakdown + charts row */}
        <div className="flex gap-5">
          {/* Subsystem breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3 flex-1">
            <h3 className="text-sm font-bold text-gray-800">Subsystem Health Breakdown</h3>
            {SUBSYSTEMS.map(s => (
              <SubsystemBar key={s.key} label={s.label} score={soh?.[s.key] ?? 90} weight={s.weight} color={s.color} />
            ))}
            <div className="flex justify-between pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Overall SOH = Σ(score × weight)</span>
              <span className="text-base font-black" style={{ color: overall >= 85 ? '#22C55E' : overall >= 65 ? '#F59E0B' : '#EF4444' }}>
                {overall}%
              </span>
            </div>
          </div>

          {/* Charts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex-1">
            <h3 className="text-sm font-bold text-gray-800 mb-3">AI Anomaly Score vs SOH</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={anomalyData} margin={{ top:5, right:10, left:-25, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="t" tick={tt} axisLine={ax} tickLine={false} interval="preserveStartEnd" />
                  <YAxis domain={[0,100]} tick={tt} axisLine={ax} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize:10, borderRadius:8, border:'1px solid #E5E7EB' }} />
                  <Line type="monotone" dataKey="Anomaly" stroke="#EF4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="SOH" stroke="#22C55E" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[9px] text-gray-400 text-center mt-1">Red = Anomaly Score · Green = SOH · [SIMULATED]</p>
          </div>
        </div>

        {/* AI Diagnostic + Maintenance preview */}
        <div className="flex gap-5">
          {/* AI Diagnosis */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex-1">
            <h3 className="text-sm font-bold text-gray-800 mb-3">AI Diagnostic Reasoning</h3>
            <div className="space-y-2">
              {(diagnosis.reasoning || ['✓ All parameters within nominal range', '✓ No anomalous trends detected', '✓ Digital Twin deviation within 5%']).map((r,i) => (
                <div key={i} className="flex gap-2 text-xs text-gray-600">
                  <span className="text-blue-400 shrink-0 mt-0.5">›</span>{r}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Confidence</span>
              <span className="text-sm font-black text-gray-800">
                {Math.round((diagnosis.confidence ?? 0.97)*100)}%
              </span>
            </div>
          </div>

          {/* Maintenance preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex-1 space-y-2">
            <h3 className="text-sm font-bold text-gray-800 mb-1">Maintenance Recommendations Preview</h3>
            {(maintenanceRecs ?? []).slice(0,2).map(rec => (
              <div key={rec.id} className="rounded-xl p-3 border text-xs"
                style={{ borderColor: rec.priority==='HIGH' ? '#FCA5A5' : rec.priority==='MEDIUM' ? '#FCD34D' : '#A7F3D0',
                  background: rec.priority==='HIGH' ? '#FEF2F2' : rec.priority==='MEDIUM' ? '#FFFBEB' : '#F0FDF4' }}>
                <div className="flex justify-between mb-1">
                  <span className="font-bold">{rec.icon} {rec.title}</span>
                  <span className="font-black text-[9px]" style={{ color: rec.priority==='HIGH' ? '#EF4444' : rec.priority==='MEDIUM' ? '#F59E0B' : '#22C55E' }}>
                    {rec.priority}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500">{rec.recommendation}</p>
              </div>
            ))}
            <button onClick={() => navigate('/maintenance')}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold mt-2"
              style={{ background: '#1F2937', color: 'white' }}>
              <Wrench size={12} /> View Full Maintenance Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIHealthPage;
