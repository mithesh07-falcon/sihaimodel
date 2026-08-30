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
        background: crit ? '#EF444420' : warn ? '#F59E0B20' : '#22C55E20',
        color: crit ? '#EF4444' : warn ? '#F59E0B' : '#22C55E',
        border: `1px solid ${crit ? '#EF444440' : warn ? '#F59E0B40' : '#22C55E40'}`,
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
    <div className="h-screen flex flex-col" style={{ background: '#050B14', color: '#E2E8F0' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ borderBottom: '1px solid #1E2D3D', background: '#080E18' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black tracking-widest">DIGITAL TWIN</span>
          <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: '#8B5CF620', border: '1px solid #8B5CF640', color: '#8B5CF6' }}>
            Physics Model + AI/ML
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px]" style={{ color: '#4B5563' }}>STEP 4 / 7</span>
          <button onClick={() => navigate('/health')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: '#FF6B3520', border: '1px solid #FF6B3540', color: '#FF6B35' }}>
            AI Health <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Actual State */}
        <div className="flex-1 flex flex-col" style={{ borderRight: '1px solid #1E2D3D' }}>
          <div className="px-5 py-3 shrink-0" style={{ borderBottom: '1px solid #1E2D3D', background: '#080E18' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
              <span className="text-xs font-black tracking-wider" style={{ color: '#22C55E' }}>ACTUAL ENGINE STATE</span>
              <span className="text-[9px] ml-1" style={{ color: '#4B5563' }}>Live telemetry from virtual sensors</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-2">
              {PARAMS.map(p => {
                const a = telemetry[p.key];
                return (
                  <div key={p.key} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: '#0D1117', border: '1px solid #1E2D3D' }}>
                    <span className="text-xs font-semibold w-24 shrink-0" style={{ color: '#64748B' }}>{p.label}</span>
                    <span className="text-xl font-black tabular-nums" style={{ color: '#E2E8F0' }}>
                      {fmtVal(a, p.decimals)}
                      <span className="text-xs font-normal ml-1" style={{ color: '#4B5563' }}>{p.unit}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Data source */}
            <div className="mt-4 p-3 rounded-xl" style={{ background: '#080E18', border: '1px solid #1E2D3D' }}>
              <p className="text-[9px] font-bold mb-1" style={{ color: '#64748B' }}>DATA SOURCE</p>
              <p className="text-[10px]" style={{ color: '#4B5563' }}>
                Sensor layer → Data processing → Digital Twin<br />
                Update rate: ~1800ms | Filter: Moving average
              </p>
            </div>
          </div>
        </div>

        {/* Center — Comparison */}
        <div className="w-64 shrink-0 flex flex-col" style={{ background: '#060C16', borderRight: '1px solid #1E2D3D' }}>
          <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid #1E2D3D', background: '#080E18' }}>
            <p className="text-xs font-black tracking-wider text-center" style={{ color: '#8B5CF6' }}>DEVIATION</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {PARAMS.map(p => {
              const a = telemetry[p.key];
              const e = physicsExpected?.[p.key];
              const diff = (a != null && e != null) ? Math.abs(a - e) : null;
              const pct  = (diff != null && e !== 0) ? (diff/Math.abs(e))*100 : 0;
              const color = pct > 18 ? '#EF4444' : pct > 8 ? '#F59E0B' : '#22C55E';
              return (
                <div key={p.key} className="flex flex-col gap-1 px-3 py-3 rounded-xl"
                  style={{ background: '#0D1117', border: `1px solid ${pct > 8 ? color+'40' : '#1E2D3D'}` }}>
                  <span className="text-[9px] font-bold" style={{ color: '#4B5563' }}>{p.label}</span>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1E2D3D' }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: color, width: `${Math.min(100, pct * 4)}%` }}
                      animate={{ width: `${Math.min(100, pct * 4)}%` }}
                      transition={{ duration: 0.5 }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px]" style={{ color: '#4B5563' }}>
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
          <div className="p-4 shrink-0" style={{ borderTop: '1px solid #1E2D3D' }}>
            <div className="rounded-xl p-3 text-center" style={{ background: `${stColor}15`, border: `1px solid ${stColor}40` }}>
              <p className="text-[9px] font-bold mb-1" style={{ color: '#64748B' }}>ENGINE STATUS</p>
              <p className="text-base font-black" style={{ color: stColor }}>{st.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Right — Expected State + Model tabs */}
        <div className="flex-1 flex flex-col">
          <div className="px-5 py-3 shrink-0" style={{ borderBottom: '1px solid #1E2D3D', background: '#080E18' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#8B5CF6', boxShadow: '0 0 6px #8B5CF6' }} />
              <span className="text-xs font-black tracking-wider" style={{ color: '#8B5CF6' }}>EXPECTED ENGINE STATE</span>
              <span className="text-[9px] ml-1" style={{ color: '#4B5563' }}>Physics model output</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-2">
              {PARAMS.map(p => {
                const e = physicsExpected?.[p.key];
                const a = telemetry[p.key];
                return (
                  <div key={p.key} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: '#0D1117', border: '1px solid #1E2D3D' }}>
                    <span className="text-xs font-semibold w-24 shrink-0" style={{ color: '#64748B' }}>{p.label}</span>
                    <span className="text-xl font-black tabular-nums" style={{ color: '#8B5CF6' }}>
                      {fmtVal(e, p.decimals)}
                      <span className="text-xs font-normal ml-1" style={{ color: '#4B5563' }}>{p.unit}</span>
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
              <div className="rounded-xl p-4" style={{ background: '#0D1117', border: '1px solid #1E2D3D' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Cpu size={14} className="text-blue-400" />
                  <span className="text-xs font-bold" style={{ color: '#3B82F6' }}>Physics Model</span>
                </div>
                <p className="text-[10px]" style={{ color: '#4B5563' }}>
                  Expected = f(RPM, Load, Ambient)<br />
                  Thermal · Oil · Vibration · Fuel equations
                </p>
              </div>

              {/* AI model */}
              <div className="rounded-xl p-4" style={{ background: '#0D1117', border: '1px solid #1E2D3D' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={14} className="text-orange-400" />
                  <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>AI / ML Model</span>
                </div>
                <p className="text-[10px]" style={{ color: '#4B5563' }}>
                  Anomaly Score: <span style={{ color: soh?.anomalyScore > 60 ? '#EF4444' : '#22C55E', fontWeight:'bold' }}>{soh?.anomalyScore ?? 0}/100</span><br />
                  Pattern detection · Baseline deviation<br />
                  Trend analysis · Fault classification
                </p>
              </div>
            </div>
          </div>

          {/* Navigate */}
          <div className="p-4 shrink-0" style={{ borderTop: '1px solid #1E2D3D' }}>
            <button onClick={() => navigate('/health')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3D00)', color: 'white', boxShadow: '0 0 20px rgba(255,107,53,0.25)' }}>
              Proceed to AI Health <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalTwinPage;
