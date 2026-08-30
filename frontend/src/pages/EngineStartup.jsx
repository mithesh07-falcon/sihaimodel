import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useEngineStore } from '../store/useEngineStore';
import EngineModel3D from '../Components/twin/EngineModel3D';

const STARTUP_CHECKS = [
  { label:'Fuel System',        icon:'⛽', delay:400  },
  { label:'Ignition Circuit',   icon:'🔑', delay:1100 },
  { label:'Crankshaft Engaged', icon:'⚙️', delay:2100 },
  { label:'Combustion Started', icon:'🔥', delay:3200 },
  { label:'Oil Circulation',    icon:'🛢️', delay:4300 },
  { label:'Idle Stabilized',    icon:'✅', delay:5600 },
];

const RPM_RAMP = [0, 160, 400, 760, 1100, 1400, 1650, 1800];

const DataRow = ({ label, value, unit, orange }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-100">
    <span className="text-xs font-medium text-gray-500">{label}</span>
    <span className={`font-bold text-sm tabular-nums ${orange ? 'text-orange-500' : 'text-gray-800'}`}>
      {value}<span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span>
    </span>
  </div>
);

const EngineStartup = () => {
  const navigate      = useNavigate();
  const engineRunning = useEngineStore(s => s.engineRunning);
  const uavPhase      = useEngineStore(s => s.uavPhase);
  const telemetry     = useEngineStore(s => s.telemetry);
  const rpmRamp       = useEngineStore(s => s.rpmRamp);

  const [checks, setChecks]     = useState([]);
  const [rpmDisplay, setRpmDisplay] = useState(0);
  const [rampDone, setRampDone] = useState(false);
  const rampRef = useRef(null);

  useEffect(() => { if (uavPhase === 'standby') navigate('/'); }, [uavPhase, navigate]);

  useEffect(() => {
    if (uavPhase !== 'running' && uavPhase !== 'arming') return;
    STARTUP_CHECKS.forEach(c => {
      setTimeout(() => {
        setChecks(prev => prev.find(p=>p.label===c.label) ? prev : [...prev, c]);
      }, c.delay);
    });
  }, [uavPhase]);

  useEffect(() => {
    if (!engineRunning) return;
    let idx = 0;
    const tick = () => {
      if (idx >= RPM_RAMP.length) { setRampDone(true); return; }
      setRpmDisplay(RPM_RAMP[idx++]);
      rampRef.current = setTimeout(tick, 700);
    };
    tick();
    return () => clearTimeout(rampRef.current);
  }, [engineRunning]);

  const displayRpm = engineRunning ? (rampDone ? Math.round(telemetry.rpm ?? 1800) : rpmDisplay) : Math.round(rpmRamp ?? 0);
  const progress   = Math.min(100, (displayRpm / 1800) * 100);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Step 2 / 7</span>
            <span className="badge-orange">Rotax 912 ULS</span>
          </div>
          <h1 className="text-xl font-black text-gray-900">Engine Startup</h1>
          <p className="text-xs text-gray-400 mt-0.5">Virtual 4-cylinder horizontally opposed engine · RPM ramp sequence</p>
        </div>
        <button onClick={() => navigate('/sensors')} disabled={!rampDone}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
          style={{ background: rampDone ? '#FF6B35' : '#F3F4F6', color: rampDone ? 'white' : '#9CA3AF',
            boxShadow: rampDone ? '0 4px 14px rgba(255,107,53,0.3)' : 'none' }}>
          Sensor Monitoring <ChevronRight size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden" style={{ background: '#F8FAFC' }}>
        {/* Left — 3D engine */}
        <div className="flex-1 flex flex-col border-r border-gray-200">
          <div className="flex-1 relative engine-glow bg-white flex items-center justify-center">
            {/* RPM overlay */}
            <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10 pointer-events-none">
              <div className="card flex items-center gap-4 p-4">
                <div>
                  <p className="label-xs mb-0.5">ENGINE SPEED</p>
                  <p className="text-3xl font-black text-orange-500 tabular-nums">
                    {displayRpm.toLocaleString()}
                    <span className="text-sm font-normal text-gray-400 ml-1">RPM</span>
                  </p>
                  <div className="progress-orange mt-2 w-32">
                    <div className="progress-orange-fill" style={{ width:`${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                    <span>0</span><span>Idle 1800</span><span>5500</span>
                  </div>
                </div>
              </div>

              {rampDone && (
                <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
                  className="card px-4 py-3" style={{ background:'#DCFCE7', borderColor:'#86EFAC' }}>
                  <span className="text-sm font-black text-green-700">✓ ENGINE IDLE STABLE</span>
                </motion.div>
              )}
            </div>
            <div className="w-full h-full">
              <EngineModel3D />
            </div>
          </div>

          {/* Telemetry strip */}
          {engineRunning && (
            <div className="flex items-center gap-6 px-6 py-3 bg-white border-t border-gray-200">
              {[
                { l:'CHT',   v:(telemetry.cht??30).toFixed(1),   u:'°C'  },
                { l:'EGT',   v:(telemetry.egt??300).toFixed(0),  u:'°C'  },
                { l:'OIL T', v:(telemetry.oil_temp??25).toFixed(1), u:'°C'  },
                { l:'OIL P', v:(telemetry.oil_pressure??0).toFixed(0), u:'kPa' },
                { l:'VIB',   v:(telemetry.vibration??0).toFixed(2), u:'g'   },
              ].map(item => (
                <div key={item.l}>
                  <p className="label-xs mb-0.5">{item.l}</p>
                  <p className="text-base font-black text-orange-500 tabular-nums">
                    {item.v}<span className="text-xs font-normal text-gray-400 ml-0.5">{item.u}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — checklist + data */}
        <div className="w-72 shrink-0 p-5 flex flex-col gap-5 overflow-y-auto bg-white">
          {/* Startup checklist */}
          <div>
            <p className="section-title text-orange-500 mb-4">Startup Sequence</p>
            <div className="space-y-2.5">
              {STARTUP_CHECKS.map((c, i) => {
                const done   = checks.some(ch => ch.label === c.label);
                const active = !done && checks.length === i;
                return (
                  <div key={c.label} className="flex items-center gap-3 py-2 px-3 rounded-xl"
                    style={{ background: done ? '#F0FDF4' : active ? '#FFF5F0' : '#F9FAFB',
                      border: `1px solid ${done ? '#BBF7D0' : active ? '#FED7AA' : '#F3F4F6'}` }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                      style={{
                        background: done ? '#22C55E' : active ? '#FF6B35' : '#E5E7EB',
                        color: done || active ? 'white' : '#9CA3AF',
                      }}>
                      {done ? '✓' : c.icon}
                    </div>
                    <span className="text-xs font-semibold"
                      style={{ color: done ? '#166534' : active ? '#C2410C' : '#6B7280' }}>
                      {c.label}
                    </span>
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />}
                    {done && <span className="ml-auto text-[9px] font-bold text-green-600">OK</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engine data */}
          <div className="card p-4">
            <p className="section-title text-orange-500 mb-3">Engine State</p>
            <DataRow label="RPM"       value={displayRpm.toLocaleString()} unit=" RPM"  orange={displayRpm>0} />
            <DataRow label="Oil Pres"  value={engineRunning?(telemetry.oil_pressure??380).toFixed(0):'—'} unit=" kPa" orange={engineRunning} />
            <DataRow label="Oil Temp"  value={engineRunning?(telemetry.oil_temp??25).toFixed(1):'—'} unit="°C" />
            <DataRow label="CHT"       value={engineRunning?(telemetry.cht??30).toFixed(1):'—'} unit="°C" />
            <DataRow label="Fuel Flow" value={engineRunning?(telemetry.fuel_flow??0).toFixed(1):'—'} unit=" L/h" />
          </div>

          {/* Next step */}
          {rampDone ? (
            <motion.button initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              onClick={() => navigate('/sensors')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white"
              style={{ background:'#FF6B35', boxShadow:'0 4px 14px rgba(255,107,53,0.3)' }}>
              Sensor Monitoring <ChevronRight size={16} />
            </motion.button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-400">
              <div className="w-4 h-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
              {uavPhase==='standby' ? 'Start engine from Mission Control' : 'Engine cranking...'}
            </div>
          )}

          {uavPhase==='standby' && (
            <button onClick={() => navigate('/')}
              className="w-full py-2 rounded-xl text-xs font-bold btn-ghost justify-center">
              ← Go to Mission Control
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EngineStartup;
