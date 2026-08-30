import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { useEngineStore } from '../store/useEngineStore';

const FAULTS = [
  { key:'nominal',             label:'Normal Operation',    color:'#22C55E', icon:'✅', desc:'All systems nominal' },
  { key:'low_oil_pressure',    label:'Low Oil Pressure',    color:'#8B5CF6', icon:'🛢️', desc:'Lubrication failure' },
  { key:'high_cht',            label:'High CHT',            color:'#F97316', icon:'🌡️', desc:'Cylinder overheat' },
  { key:'overheating',         label:'Overheating',         color:'#DC2626', icon:'🔥', desc:'Thermal critical' },
  { key:'bearing_wear',        label:'Excessive Vibration', color:'#F59E0B', icon:'📳', desc:'Bearing wear' },
  { key:'rpm_instability',     label:'RPM Instability',     color:'#EF4444', icon:'⚡', desc:'Misfire/governor' },
  { key:'fuel_pressure_drop',  label:'Fuel Pressure Drop',  color:'#3B82F6', icon:'⛽', desc:'Injector restriction' },
  { key:'cooling_problem',     label:'Cooling Problem',     color:'#EC4899', icon:'❄️', desc:'Coolant circuit' },
];

// Cascading metric display
const CascadeMetric = ({ label, values, unit, color }) => (
  <div className="rounded-xl p-3" style={{ background: '#0D1117', border: '1px solid #1E2D3D' }}>
    <p className="text-[9px] font-bold mb-2" style={{ color: '#64748B' }}>{label}</p>
    <div className="flex items-end gap-1">
      {values.map((v, i) => (
        <React.Fragment key={i}>
          <span className="text-sm font-black tabular-nums"
            style={{ color: i === values.length - 1 ? color : `${color}60` }}>
            {typeof v === 'number' ? v.toFixed(1) : v}
            <span className="text-[9px] font-normal" style={{ color: '#4B5563' }}>{unit}</span>
          </span>
          {i < values.length - 1 && <span className="text-xs mb-1 pb-0.5" style={{ color: '#1E3A5F' }}>→</span>}
        </React.Fragment>
      ))}
    </div>
  </div>
);

const FaultSimulation = () => {
  const navigate           = useNavigate();
  const injectFault        = useEngineStore(s => s.injectFault);
  const resetFault         = useEngineStore(s => s.resetFault);
  const activeFault        = useEngineStore(s => s.activeFault);
  const faultPropagationLog = useEngineStore(s => s.faultPropagationLog);
  const faultPropagating   = useEngineStore(s => s.faultPropagating);
  const telemetry          = useEngineStore(s => s.telemetry);
  const soh                = useEngineStore(s => s.soh);
  const engineRunning      = useEngineStore(s => s.engineRunning);
  const armUav             = useEngineStore(s => s.armUav);

  const logRef = useRef(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [faultPropagationLog]);

  const activeColor = activeFault ? (FAULTS.find(f => f.key === activeFault)?.color ?? '#FF6B35') : '#4B5563';

  return (
    <div className="h-screen flex flex-col" style={{ background: '#050B14', color: '#E2E8F0' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ borderBottom: '1px solid #1E2D3D', background: '#080E18' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black tracking-widest">FAULT SIMULATION</span>
          {activeFault && activeFault !== 'nominal' && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded animate-pulse"
              style={{ background: `${activeColor}20`, border: `1px solid ${activeColor}60`, color: activeColor }}>
              ● FAULT ACTIVE: {FAULTS.find(f=>f.key===activeFault)?.label?.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px]" style={{ color: '#4B5563' }}>STEP 6 / 7</span>
          {(activeFault && activeFault !== 'nominal') && (
            <button onClick={resetFault}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: '#22C55E20', border: '1px solid #22C55E60', color: '#22C55E' }}>
              <RotateCcw size={11} /> Reset to Normal
            </button>
          )}
          <button onClick={() => navigate('/maintenance')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: '#FF6B3520', border: '1px solid #FF6B3540', color: '#FF6B35' }}>
            Maintenance Report <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — fault buttons */}
        <div className="w-72 shrink-0 p-4 flex flex-col gap-4 overflow-y-auto" style={{ borderRight: '1px solid #1E2D3D', background: '#080E18' }}>
          <p className="text-[9px] font-black tracking-widest" style={{ color: '#FF6B35' }}>SELECT FAULT SCENARIO</p>

          {!engineRunning && (
            <div className="rounded-xl p-3" style={{ background: '#1A0A00', border: '1px solid #3A1A00' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#F59E0B' }}>
                ⚠ Engine not running
              </p>
              <button onClick={armUav}
                className="w-full py-2 rounded-lg text-xs font-bold"
                style={{ background: '#22C55E20', border: '1px solid #22C55E60', color: '#22C55E' }}>
                ▶ Start Engine First
              </button>
            </div>
          )}

          <div className="space-y-2">
            {FAULTS.map(f => {
              const isActive = activeFault === f.key || (f.key === 'nominal' && !activeFault);
              return (
                <button
                  key={f.key}
                  onClick={() => f.key === 'nominal' ? resetFault() : injectFault(f.key)}
                  disabled={!engineRunning && f.key !== 'nominal'}
                  className="w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-200"
                  style={{
                    background: isActive ? `${f.color}18` : '#0D1117',
                    border: `1px solid ${isActive ? f.color : '#1E2D3D'}`,
                    boxShadow: isActive ? `0 0 12px ${f.color}33` : 'none',
                    opacity: (!engineRunning && f.key !== 'nominal') ? 0.4 : 1,
                    cursor: (!engineRunning && f.key !== 'nominal') ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span className="text-xl">{f.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: isActive ? f.color : '#E2E8F0' }}>
                      {f.label}
                    </p>
                    <p className="text-[9px] mt-0.5" style={{ color: '#4B5563' }}>{f.desc}</p>
                  </div>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full mt-1 shrink-0 animate-pulse" style={{ background: f.color }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center — Propagation chain */}
        <div className="flex-1 flex flex-col" style={{ borderRight: '1px solid #1E2D3D' }}>
          <div className="px-5 py-3 shrink-0" style={{ borderBottom: '1px solid #1E2D3D', background: '#080E18' }}>
            <div className="flex items-center gap-2">
              {faultPropagating && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
              {!faultPropagating && faultPropagationLog.length > 0 && <span className="w-2 h-2 rounded-full bg-green-500" />}
              <span className="text-xs font-black tracking-wider"
                style={{ color: faultPropagating ? '#EF4444' : faultPropagationLog.length > 0 ? '#22C55E' : '#4B5563' }}>
                {faultPropagating ? 'FAULT PROPAGATION — ACTIVE' : faultPropagationLog.length > 0 ? 'PROPAGATION COMPLETE' : 'PROPAGATION CHAIN'}
              </span>
            </div>
          </div>

          <div ref={logRef}
            className="flex-1 overflow-y-auto p-5 font-mono space-y-2"
            style={{ background: '#040810' }}>
            {faultPropagationLog.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs" style={{ color: '#1E2D3D' }}>
                  {engineRunning
                    ? '← Select a fault scenario to begin simulation'
                    : 'Start the engine to enable fault injection'}
                </p>
              </div>
            )}
            {faultPropagationLog.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="text-xs leading-relaxed"
                style={{ color: line.includes('CRITICAL') || line.includes('🚨') ? '#EF4444' :
                  line.includes('✓') || line.includes('🟢') ? '#22C55E' :
                  line.includes('⚠') || line.includes('⚡') ? '#F59E0B' : '#22C55E' }}
              >
                <span style={{ color: '#1E3A5F' }}>[{new Date().toLocaleTimeString()}]</span>{' '}{line}
              </motion.div>
            ))}
            {faultPropagating && (
              <div className="flex items-center gap-2 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" />
                <span className="text-xs font-mono" style={{ color: '#F59E0B' }}>Processing fault chain...</span>
              </div>
            )}
          </div>

          {/* Cause → Effect diagram */}
          {!activeFault || activeFault === 'nominal' ? (
            <div className="p-5 shrink-0" style={{ borderTop: '1px solid #1E2D3D' }}>
              <p className="text-[9px] font-bold mb-3" style={{ color: '#4B5563' }}>HOW FAULT PROPAGATION WORKS</p>
              <div className="flex items-center gap-2 text-[9px] flex-wrap" style={{ color: '#2D4A6A' }}>
                {['FAULT INJECTED','SENSOR DETECTS','TELEMETRY CHANGES','DIGITAL TWIN DEVIATION','AI ANOMALY SCORE ↑','SOH ↓','MAINTENANCE ADVISORY'].map((s,i,arr) => (
                  <React.Fragment key={s}>
                    <span className="px-2 py-1 rounded" style={{ background:'#0D1117', border:'1px solid #1E2D3D', color:'#4B5563' }}>{s}</span>
                    {i < arr.length-1 && <span style={{ color:'#1E3A5F' }}>→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right — Live metric cascade */}
        <div className="w-64 shrink-0 flex flex-col overflow-hidden" style={{ background: '#080E18' }}>
          <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid #1E2D3D' }}>
            <p className="text-xs font-black tracking-wider" style={{ color: '#FF6B35' }}>LIVE METRICS</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* SOH */}
            <div className="rounded-xl p-3 text-center"
              style={{ background: '#0D1117', border: `1px solid ${(soh?.overall ?? 100) < 70 ? '#EF4444' : '#1E2D3D'}` }}>
              <p className="text-[9px] font-bold mb-1" style={{ color: '#64748B' }}>SOH</p>
              <motion.p className="text-3xl font-black" key={soh?.overall}
                style={{ color: (soh?.overall ?? 100) >= 85 ? '#22C55E' : (soh?.overall ?? 100) >= 65 ? '#F59E0B' : '#EF4444' }}>
                {soh?.overall ?? 87}%
              </motion.p>
            </div>

            {/* Anomaly */}
            <div className="rounded-xl p-3" style={{ background: '#0D1117', border: '1px solid #1E2D3D' }}>
              <p className="text-[9px] font-bold mb-1" style={{ color: '#64748B' }}>ANOMALY SCORE</p>
              <motion.p className="text-2xl font-black" key={soh?.anomalyScore}
                style={{ color: (soh?.anomalyScore ?? 0) > 60 ? '#EF4444' : (soh?.anomalyScore ?? 0) > 30 ? '#F59E0B' : '#22C55E' }}>
                {soh?.anomalyScore ?? 0}<span className="text-xs font-normal">/100</span>
              </motion.p>
              <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: '#1E2D3D' }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: (soh?.anomalyScore ?? 0) > 60 ? '#EF4444' : '#F59E0B' }}
                  animate={{ width: `${soh?.anomalyScore ?? 0}%` }} transition={{ duration: 0.8 }} />
              </div>
            </div>

            {/* Key sensor values */}
            {[
              { label:'Oil Pressure', key:'oil_pressure', unit:'kPa', critLow:200 },
              { label:'CHT',          key:'cht',          unit:'°C',  critHigh:145 },
              { label:'Vibration',    key:'vibration',    unit:'g',   critHigh:3.0 },
              { label:'RPM',          key:'rpm',          unit:'RPM', critHigh:5500 },
            ].map(m => {
              const v = telemetry[m.key] ?? 0;
              const crit = (m.critHigh && v > m.critHigh) || (m.critLow && v < m.critLow);
              return (
                <div key={m.key} className="flex items-center justify-between px-3 py-2 rounded-xl"
                  style={{ background: crit ? '#1A0808' : '#0D1117', border: `1px solid ${crit ? '#EF444440' : '#1E2D3D'}` }}>
                  <span className="text-[10px] font-semibold" style={{ color: '#64748B' }}>{m.label}</span>
                  <motion.span className="text-sm font-black tabular-nums" key={Math.round(v)}
                    style={{ color: crit ? '#EF4444' : '#E2E8F0' }}>
                    {typeof v === 'number' ? (m.key==='rpm' ? Math.round(v).toLocaleString() : v.toFixed(1)) : '—'}
                    <span className="text-[9px] font-normal ml-0.5" style={{ color: '#4B5563' }}>{m.unit}</span>
                  </motion.span>
                </div>
              );
            })}
          </div>

          {/* Navigate */}
          <div className="p-4 shrink-0" style={{ borderTop: '1px solid #1E2D3D' }}>
            <button onClick={() => navigate('/maintenance')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3D00)', color: 'white', boxShadow: '0 0 16px rgba(255,107,53,0.3)' }}>
              View Advisory <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaultSimulation;
