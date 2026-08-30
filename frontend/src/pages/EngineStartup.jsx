import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useEngineStore } from '../store/useEngineStore';
import EngineModel3D from '../Components/twin/EngineModel3D';

const STARTUP_CHECKS = [
  { label: 'Fuel System',          icon: '⛽', delay: 400 },
  { label: 'Ignition Circuit',     icon: '🔑', delay: 1000 },
  { label: 'Crankshaft Engaged',   icon: '⚙️', delay: 2000 },
  { label: 'Combustion Started',   icon: '🔥', delay: 3200 },
  { label: 'Oil Circulation',      icon: '🛢️', delay: 4200 },
  { label: 'Idle Stabilized',      icon: '✅', delay: 5500 },
];

const RPM_RAMP = [0, 150, 380, 720, 1050, 1350, 1620, 1800];

const DataRow = ({ label, value, unit, ok = true }) => (
  <div className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid #1E2D3D' }}>
    <span className="text-xs font-semibold" style={{ color: '#64748B' }}>{label}</span>
    <span className="font-bold text-sm tabular-nums" style={{ color: ok ? '#22C55E' : '#EF4444' }}>
      {value}<span className="text-xs font-normal ml-0.5" style={{ color: '#4B5563' }}>{unit}</span>
    </span>
  </div>
);

const EngineStartup = () => {
  const navigate      = useNavigate();
  const engineRunning = useEngineStore(s => s.engineRunning);
  const uavPhase      = useEngineStore(s => s.uavPhase);
  const telemetry     = useEngineStore(s => s.telemetry);
  const rpmRamp       = useEngineStore(s => s.rpmRamp);
  const armUav        = useEngineStore(s => s.armUav);

  const [checks, setChecks]     = useState([]);
  const [rpmDisplay, setRpmDisplay] = useState(0);
  const [rampDone, setRampDone] = useState(false);
  const rampRef = useRef(null);

  // Redirect if engine not started
  useEffect(() => {
    if (uavPhase === 'standby') {
      navigate('/');
    }
  }, [uavPhase, navigate]);

  // Mark checks as completed
  useEffect(() => {
    if (uavPhase !== 'running' && uavPhase !== 'arming') return;
    STARTUP_CHECKS.forEach((c, i) => {
      setTimeout(() => {
        setChecks(prev => {
          if (!prev.find(p => p.label === c.label)) return [...prev, c];
          return prev;
        });
      }, c.delay);
    });
  }, [uavPhase]);

  // Animate RPM ramp
  useEffect(() => {
    if (!engineRunning) return;
    let idx = 0;
    const tick = () => {
      if (idx >= RPM_RAMP.length) { setRampDone(true); return; }
      setRpmDisplay(RPM_RAMP[idx]);
      idx++;
      rampRef.current = setTimeout(tick, 700);
    };
    tick();
    return () => clearTimeout(rampRef.current);
  }, [engineRunning]);

  const displayRpm = engineRunning ? (rampDone ? Math.round(telemetry.rpm ?? 1800) : rpmDisplay) : Math.round(rpmRamp ?? 0);
  const progress   = Math.min(100, (displayRpm / 1800) * 100);

  return (
    <div className="h-screen flex flex-col" style={{ background: '#050B14', color: '#E2E8F0' }}>
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ borderBottom: '1px solid #1E2D3D', background: '#080E18' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black tracking-widest" style={{ color: '#E2E8F0' }}>ENGINE STARTUP</span>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: '#FF6B3520', border: '1px solid #FF6B3540', color: '#FF6B35' }}>
            Rotax 912 ULS — Digital Engine
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px]" style={{ color: '#4B5563' }}>STEP 2 / 7</span>
          <button onClick={() => navigate('/sensors')} disabled={!rampDone}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
            style={{ background: rampDone ? '#22C55E20' : '#1E2D3D', border: `1px solid ${rampDone ? '#22C55E80' : '#1E2D3D'}`, color: rampDone ? '#22C55E' : '#4B5563' }}>
            Sensor Monitoring <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Engine 3D */}
        <div className="flex-1 flex flex-col" style={{ borderRight: '1px solid #1E2D3D' }}>
          <div className="flex items-center justify-center flex-1 bg-black/40 relative">
            {/* RPM overlay */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl px-4 py-2" style={{ background: 'rgba(8,14,24,0.85)', border: '1px solid #1E2D3D' }}>
                  <p className="text-[9px] font-bold mb-0.5" style={{ color: '#64748B' }}>ENGINE SPEED</p>
                  <motion.p className="text-2xl font-black tabular-nums"
                    style={{ color: displayRpm > 0 ? '#FF6B35' : '#4B5563' }}
                    key={displayRpm}>
                    {displayRpm.toLocaleString()}
                    <span className="text-xs font-normal ml-1" style={{ color: '#4B5563' }}>RPM</span>
                  </motion.p>
                </div>
                {/* RPM bar */}
                <div className="h-12 w-2 rounded-full overflow-hidden" style={{ background: '#1E2D3D' }}>
                  <motion.div
                    className="w-full rounded-full"
                    style={{ background: 'linear-gradient(to top, #FF6B35, #FFD700)', height: `${progress}%`, marginTop: `${100-progress}%` }}
                    animate={{ height: `${progress}%`, marginTop: `${100-progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="text-xs" style={{ color: '#4B5563' }}>
                  <div>5500</div>
                  <div className="my-6">Idle</div>
                  <div>0</div>
                </div>
              </div>
              {rampDone && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-4 py-2 rounded-xl font-black text-sm"
                  style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.5)', color: '#22C55E' }}>
                  ✓ ENGINE IDLE STABLE
                </motion.div>
              )}
            </div>
            <div className="w-full h-full">
              <EngineModel3D />
            </div>
          </div>

          {/* Bottom telemetry strip */}
          {engineRunning && (
            <div className="flex items-center gap-6 px-6 py-3 shrink-0" style={{ borderTop: '1px solid #1E2D3D', background: '#080E18' }}>
              {[
                { label: 'CHT', value: (telemetry.cht ?? 30).toFixed(1), unit: '°C' },
                { label: 'EGT', value: (telemetry.egt ?? 300).toFixed(0), unit: '°C' },
                { label: 'OIL T', value: (telemetry.oil_temp ?? 25).toFixed(1), unit: '°C' },
                { label: 'OIL P', value: (telemetry.oil_pressure ?? 0).toFixed(0), unit: ' kPa' },
                { label: 'VIB', value: (telemetry.vibration ?? 0).toFixed(2), unit: ' g' },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <p className="text-[9px] font-bold" style={{ color: '#4B5563' }}>{item.label}</p>
                  <p className="text-sm font-black tabular-nums" style={{ color: '#22C55E' }}>
                    {item.value}<span className="text-[9px] font-normal">{item.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Startup checklist + data */}
        <div className="w-72 shrink-0 p-5 flex flex-col gap-5 overflow-y-auto" style={{ background: '#080E18' }}>
          {/* Startup checklist */}
          <div>
            <p className="text-[9px] font-black tracking-widest mb-4" style={{ color: '#FF6B35' }}>STARTUP SEQUENCE</p>
            <div className="space-y-3">
              {STARTUP_CHECKS.map((c, i) => {
                const done = checks.some(ch => ch.label === c.label);
                const active = !done && checks.length === i;
                return (
                  <motion.div key={c.label}
                    initial={{ opacity: 0.3 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm"
                      style={{
                        background: done ? 'rgba(34,197,94,0.2)' : active ? 'rgba(255,107,53,0.2)' : '#1E2D3D',
                        border: `1px solid ${done ? 'rgba(34,197,94,0.6)' : active ? 'rgba(255,107,53,0.6)' : '#2D4A6A'}`,
                      }}>
                      {done ? '✓' : c.icon}
                    </div>
                    <span className="text-xs font-semibold" style={{
                      color: done ? '#22C55E' : active ? '#FF6B35' : '#4B5563'
                    }}>{c.label}</span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse ml-auto" />}
                    {done && <span className="text-[9px] ml-auto font-bold" style={{ color: '#22C55E' }}>OK</span>}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Engine state */}
          <div style={{ borderTop: '1px solid #1E2D3D', paddingTop: 16 }}>
            <p className="text-[9px] font-black tracking-widest mb-3" style={{ color: '#FF6B35' }}>ENGINE STATE</p>
            <DataRow label="RPM"       value={displayRpm.toLocaleString()} unit=" RPM"  ok={displayRpm > 0} />
            <DataRow label="Oil Pres"  value={engineRunning ? (telemetry.oil_pressure ?? 380).toFixed(0) : '—'} unit=" kPa"  ok={engineRunning} />
            <DataRow label="Oil Temp"  value={engineRunning ? (telemetry.oil_temp ?? 25).toFixed(1) : '—'} unit="°C" ok={engineRunning} />
            <DataRow label="CHT"       value={engineRunning ? (telemetry.cht ?? 30).toFixed(1) : '—'} unit="°C" ok={engineRunning} />
            <DataRow label="Fuel Flow" value={engineRunning ? (telemetry.fuel_flow ?? 0).toFixed(1) : '—'} unit=" L/h" ok={engineRunning} />
          </div>

          {/* Navigate button */}
          {rampDone && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-auto"
            >
              <p className="text-xs mb-3 text-center" style={{ color: '#22C55E' }}>
                ✓ Engine at stable idle. Sensors activating...
              </p>
              <button
                onClick={() => navigate('/sensors')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3D00)', color: 'white', boxShadow: '0 0 20px rgba(255,107,53,0.3)' }}>
                Sensor Monitoring <ChevronRight size={16} />
              </button>
            </motion.div>
          )}

          {!engineRunning && uavPhase === 'arming' && (
            <div className="mt-auto flex flex-col items-center gap-2">
              <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
              <p className="text-xs" style={{ color: '#F59E0B' }}>Engine cranking...</p>
            </div>
          )}

          {uavPhase === 'standby' && (
            <div className="mt-auto">
              <p className="text-xs text-center mb-3" style={{ color: '#4B5563' }}>Start the UAV from Mission Control first</p>
              <button onClick={() => navigate('/')}
                className="w-full py-2 rounded-xl text-xs font-bold"
                style={{ background: '#1E2D3D', color: '#64748B', border: '1px solid #2D4A6A' }}>
                ← Go to Mission Control
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EngineStartup;
