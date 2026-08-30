import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Cpu, Brain } from 'lucide-react';
import { useEngineStore } from '../store/useEngineStore';

const PARAMS = [
  { key:'rpm',          label:'Engine Speed',   unit:'RPM',   decimals:0 },
  { key:'cht',          label:'CHT',            unit:'°C',    decimals:1 },
  { key:'egt',          label:'EGT',            unit:'°C',    decimals:0 },
  { key:'oil_pressure', label:'Oil Pressure',   unit:'kPa',   decimals:0 },
  { key:'oil_temp',     label:'Oil Temp',       unit:'°C',    decimals:1 },
  { key:'vibration',    label:'Vibration',      unit:'g',     decimals:2 },
  { key:'fuel_flow',    label:'Fuel Flow',      unit:'L/h',   decimals:1 },
];

const DeviationBadge = ({ actual, expected }) => {
  if (!actual || !expected) return null;
  const diff = actual - expected;
  const pct  = expected !== 0 ? Math.abs(diff / expected) * 100 : 0;
  const crit = pct > 18; const warn = pct > 8;
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
      style={{
        background: crit ? '#FEF2F2' : warn ? '#FFFBEB' : '#F0FDF4',
        color: crit ? '#EF4444' : warn ? '#F59E0B' : '#22C55E',
        border: `1px solid ${crit ? '#FCA5A5' : warn ? '#FCD34D' : '#86EFAC'}`,
      }}>
      {diff >= 0 ? '+' : ''}{diff.toFixed(1)} {pct > 8 ? '⚠' : '✓'}
    </span>
  );
};

const DigitalTwinPage = () => {
  const navigate       = useNavigate();
  const telemetry      = useEngineStore(s => s.telemetry);
  const physicsExpected = useEngineStore(s => s.physicsExpected);
  const diagnosis      = useEngineStore(s => s.diagnosis);
  const soh            = useEngineStore(s => s.soh);
  const uavPhase       = useEngineStore(s => s.uavPhase);
  const engineRunning  = useEngineStore(s => s.engineRunning);

  const [activeModel, setActiveModel] = useState('physics');

  const fmtVal = (v, d) => (typeof v === 'number') ? (d === 0 ? Math.round(v).toLocaleString() : v.toFixed(d)) : '—';

  const st = diagnosis.status || 'Healthy';
  const stColor = st === 'Healthy' ? '#22C55E' : st === 'Warning' ? '#F59E0B' : '#EF4444';

  return (
    <div className="h-screen flex flex-col bg-white" style={{ color: '#1F2937' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black tracking-widest text-gray-800">DIGITAL TWIN</span>
          <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-purple-50 border border-purple-200 text-purple-700">
            Physics Model + AI/ML
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-gray-400">STEP 4 / 7</span>
          <button onClick={() => navigate('/health')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: '#FF6B35', boxShadow: '0 2px 8px rgba(255,107,53,0.25)' }}>
            AI Health <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Actual State */}
        <div className="flex-1 flex flex-col border-r border-gray-100">
          <div className="px-5 py-3 shrink-0 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
              <span className="text-xs font-black tracking-wider text-green-600">ACTUAL ENGINE STATE</span>
              <span className="text-[9px] ml-1 text-gray-400">Live telemetry from virtual sensors</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5" style={{ background: '#F8FAFC' }}>
            <div className="space-y-2">
              {PARAMS.map(p => {
                const a = telemetry[p.key];
                return (
                  <div key={p.key} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                    <span className="text-xs font-semibold w-24 shrink-0 text-gray-500">{p.label}</span>
                    <span className="text-xl font-black tabular-nums text-gray-800">
                      {fmtVal(a, p.decimals)}
                      <span className="text-xs font-normal ml-1 text-gray-400">{p.unit}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Data source */}
            <div className="mt-4 p-3 rounded-xl bg-white border border-gray-100">
              <p className="text-[9px] font-bold mb-1 text-gray-500">DATA SOURCE</p>
              <p className="text-[10px] text-gray-400">
                Sensor layer → Data processing → Digital Twin<br />
                Update rate: ~1800ms | Filter: Moving average
              </p>
            </div>
          </div>
        </div>

        {/* Center — Comparison */}
        <div className="w-64 shrink-0 flex flex-col border-r border-gray-100" style={{ background: '#FAFBFC' }}>
          <div className="px-4 py-3 shrink-0 border-b border-gray-100 bg-white">
            <p className="text-xs font-black tracking-wider text-center text-purple-600">DEVIATION</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {PARAMS.map(p => {
              const a = telemetry[p.key];
              const e = physicsExpected?.[p.key];
              const diff = (a != null && e != null) ? Math.abs(a - e) : null;
              const pct  = (diff != null && e !== 0) ? (diff/Math.abs(e))*100 : 0;
              const color = pct > 18 ? '#EF4444' : pct > 8 ? '#F59E0B' : '#22C55E';
              return (
                <div key={p.key} className="flex flex-col gap-1 px-3 py-3 rounded-xl bg-white shadow-sm"
                  style={{ border: `1px solid ${pct > 8 ? color+'30' : '#E5E7EB'}` }}>
                  <span className="text-[9px] font-bold text-gray-500">{p.label}</span>
                  <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
                    <motion.div className="h-full rounded-full"
                      style={{ background: color, width: `${Math.min(100, pct * 4)}%` }}
                      animate={{ width: `${Math.min(100, pct * 4)}%` }}
                      transition={{ duration: 0.5 }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-400">
                      Δ {diff != null ? diff.toFixed(1) : '—'} {p.unit}
                    </span>
                    <span className="text-[9px] font-bold" style={{ color }}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status */}
          <div className="p-4 shrink-0 border-t border-gray-100">
            <div className="rounded-xl p-3 text-center"
              style={{ background: `${stColor}10`, border: `1px solid ${stColor}30` }}>
              <p className="text-[9px] font-bold mb-1 text-gray-500">ENGINE STATUS</p>
              <p className="text-base font-black" style={{ color: stColor }}>{st.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Right — Expected State + Model tabs */}
        <div className="flex-1 flex flex-col">
          <div className="px-5 py-3 shrink-0 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#8B5CF6', boxShadow: '0 0 6px #8B5CF6' }} />
              <span className="text-xs font-black tracking-wider text-purple-600">EXPECTED ENGINE STATE</span>
              <span className="text-[9px] ml-1 text-gray-400">Physics model output</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5" style={{ background: '#F8FAFC' }}>
            <div className="space-y-2">
              {PARAMS.map(p => {
                const e = physicsExpected?.[p.key];
                const a = telemetry[p.key];
                return (
                  <div key={p.key} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                    <span className="text-xs font-semibold w-24 shrink-0 text-gray-500">{p.label}</span>
                    <span className="text-xl font-black tabular-nums text-purple-600">
                      {fmtVal(e, p.decimals)}
                      <span className="text-xs font-normal ml-1 text-gray-400">{p.unit}</span>
                    </span>
                    <div className="ml-auto">
                      <DeviationBadge actual={a} expected={e} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Model cards */}
            <div className="mt-4 grid grid-cols-1 gap-3">
              {/* Physics model */}
              <div className="rounded-xl p-4 bg-white border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu size={14} className="text-blue-500" />
                  <span className="text-xs font-bold text-blue-600">Physics Model</span>
                </div>
                <p className="text-[10px] text-gray-400">
                  Expected = f(RPM, Load, Ambient)<br />
                  Thermal · Oil · Vibration · Fuel equations
                </p>
              </div>

              {/* AI model */}
              <div className="rounded-xl p-4 bg-white border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={14} className="text-orange-500" />
                  <span className="text-xs font-bold text-orange-500">AI / ML Model</span>
                </div>
                <p className="text-[10px] text-gray-400">
                  Anomaly Score: <span style={{ color: soh?.anomalyScore > 60 ? '#EF4444' : '#22C55E', fontWeight:'bold' }}>{soh?.anomalyScore ?? 0}/100</span><br />
                  Pattern detection · Baseline deviation<br />
                  Trend analysis · Fault classification
                </p>
              </div>
            </div>
          </div>

          {/* Navigate */}
          <div className="p-4 shrink-0 border-t border-gray-100">
            <button onClick={() => navigate('/health')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white"
              style={{ background: '#FF6B35', boxShadow: '0 4px 14px rgba(255,107,53,0.3)' }}>
              Proceed to AI Health <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalTwinPage;
