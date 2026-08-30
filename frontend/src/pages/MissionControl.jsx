import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, AlertTriangle } from 'lucide-react';
import { useEngineStore, STARTUP_STEPS } from '../store/useEngineStore';

/* ── UAV Top-down SVG ───────────────────────────────────────────────── */
const UAVModel = ({ running, throttle }) => {
  const propSpeed = running ? Math.max(0.06, 0.95 - (throttle / 100) * 0.88) : 999;
  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 240 300" width="220" height="280">
        {/* Outer glow ring */}
        {running && (
          <ellipse cx="120" cy="150" rx="105" ry="115" fill="none" stroke="#FF6B35" strokeWidth="0.8" opacity="0.2">
            <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
          </ellipse>
        )}
        {/* Wings */}
        <path d="M38 128 Q82 116 120 118 Q158 116 202 128 L192 144 Q154 132 120 134 Q86 132 48 144 Z"
          fill="#1F2937" stroke="#374151" strokeWidth="1.5" />
        {/* Wing detail */}
        <path d="M60 136 Q120 130 180 136" fill="none" stroke="#FF6B35" strokeWidth="0.8" opacity="0.5" />
        {/* Fuselage */}
        <path d="M109 48 Q106 72 105 122 L105 192 Q105 212 120 222 Q135 212 135 192 L135 122 Q134 72 131 48 Z"
          fill="#111827" stroke="#1F2937" strokeWidth="2" />
        {/* Nose pod */}
        <ellipse cx="120" cy="46" rx="10" ry="13" fill="#FF6B35" />
        <ellipse cx="120" cy="46" rx="5.5" ry="7" fill="white" opacity="0.3" />
        {/* Propeller hub */}
        <circle cx="120" cy="35" r="7" fill="#374151" />
        {/* Propeller (rotating) */}
        <g transform="translate(120,35)">
          <animateTransform attributeName="transform" type="rotate"
            from="0 0 0" to="360 0 0" dur={`${propSpeed}s`} repeatCount="indefinite" additive="sum" />
          <rect x="-24" y="-3.5" width="48" height="7" rx="3.5" fill="#FF6B35" opacity="0.95" />
          <rect x="-3.5" y="-24" width="7" height="48" rx="3.5" fill="#FF6B35" opacity="0.95" />
          <circle r="5.5" fill="#FFB347" />
        </g>
        {/* Engine cowling */}
        <ellipse cx="120" cy="70" rx="15" ry="11" fill="#1F2937" stroke="#374151" strokeWidth="1" />
        {/* Tail assembly */}
        <path d="M76 194 Q100 188 120 190 Q140 188 164 194 L160 202 Q138 198 120 199 Q102 198 80 202 Z"
          fill="#1F2937" stroke="#374151" strokeWidth="1" />
        <rect x="117.5" y="188" width="5" height="26" rx="2" fill="#374151" />
        {/* Wingtip lights */}
        <circle cx="38" cy="136" r="5" fill={running ? "#EF4444" : "#374151"}>
          {running && <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite" />}
        </circle>
        <circle cx="202" cy="136" r="5" fill={running ? "#22C55E" : "#374151"}>
          {running && <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite" />}
        </circle>
        {/* Fuselage stripe */}
        <rect x="117" y="82" width="6" height="88" rx="2" fill="#FF6B35" opacity="0.2" />
        {/* Status belly light */}
        <circle cx="120" cy="214" r="4.5" fill={running ? "#22C55E" : "#374151"}>
          {running && <animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite" />}
        </circle>
      </svg>
    </div>
  );
};

/* ── Startup Overlay ────────────────────────────────────────────────── */
const StartupOverlay = ({ currentStep }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    className="absolute inset-0 z-50 flex items-center justify-center"
    style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(6px)' }}
  >
    <div className="w-full max-w-sm px-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        <p className="text-sm font-black tracking-widest text-orange-500">INITIATING STARTUP SEQUENCE</p>
      </div>
      <div className="space-y-3">
        {STARTUP_STEPS.map((step, i) => {
          const done = i < currentStep; const active = i === currentStep;
          return (
            <div key={step.id} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                style={{
                  background: done ? '#22C55E' : active ? '#FF6B35' : '#F3F4F6',
                  color: done || active ? 'white' : '#9CA3AF',
                  boxShadow: active ? '0 0 12px rgba(255,107,53,0.4)' : 'none',
                }}>
                {done ? '✓' : active ? <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" /> : i + 1}
              </div>
              <span className="text-sm font-semibold"
                style={{ color: done ? '#22C55E' : active ? '#FF6B35' : '#9CA3AF' }}>
                {step.icon} {step.label}
              </span>
              {active && <div className="ml-auto flex gap-1">{[0,1,2].map(d => (
                <motion.span key={d} className="w-1.5 h-1.5 rounded-full bg-orange-400"
                  animate={{ opacity: [1,0.2,1] }} transition={{ duration: 0.7, delay: d*0.2, repeat: Infinity }} />
              ))}</div>}
            </div>
          );
        })}
      </div>
    </div>
  </motion.div>
);

/* ── Data Row ───────────────────────────────────────────────────────── */
const DataRow = ({ label, value, unit, orange = false }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-100">
    <span className="text-xs font-medium text-gray-500">{label}</span>
    <span className={`font-bold text-sm tabular-nums ${orange ? 'text-orange-500' : 'text-gray-800'}`}>
      {value}<span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span>
    </span>
  </div>
);

/* ── Main ───────────────────────────────────────────────────────────── */
const MissionControl = () => {
  const navigate   = useNavigate();
  const armUav     = useEngineStore(s => s.armUav);
  const emergencyStop = useEngineStore(s => s.emergencyStop);
  const uavPhase   = useEngineStore(s => s.uavPhase);
  const startupStep = useEngineStore(s => s.startupStep);
  const throttle   = useEngineStore(s => s.throttle);
  const setThrottle = useEngineStore(s => s.setThrottle);
  const telemetry  = useEngineStore(s => s.telemetry);
  const rpmRamp    = useEngineStore(s => s.rpmRamp);

  const isRunning = uavPhase === 'running';
  const isArming  = uavPhase === 'arming';

  useEffect(() => {
    if (isRunning) { const t = setTimeout(() => navigate('/engine'), 1600); return () => clearTimeout(t); }
  }, [isRunning, navigate]);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Step 1 / 7</span>
            <span className="badge-orange">SIH 2026</span>
            <span className="badge-sim">⚠ SIMULATION</span>
          </div>
          <h1 className="text-xl font-black text-gray-900">UAV Ground Control Station</h1>
          <p className="text-xs text-gray-400 mt-0.5">Virtual UAV · Flight controller · Engine ignition sequence</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
            <span className="w-2 h-2 rounded-full"
              style={{ background: isRunning ? '#22C55E' : isArming ? '#F59E0B' : '#EF4444',
                boxShadow: isRunning ? '0 0 6px #22C55E' : isArming ? '0 0 6px #F59E0B' : 'none' }} />
            <span className="text-xs font-bold text-gray-700">
              {isRunning ? 'ENGINE RUNNING' : isArming ? 'ARMING...' : 'STANDBY'}
            </span>
          </div>
          <span className="text-xs text-gray-400 tabular-nums">ROTAX-MALE-009</span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 flex overflow-hidden relative" style={{ background: '#F8FAFC' }}>
        {/* Startup overlay */}
        <AnimatePresence>
          {isArming && <StartupOverlay currentStep={startupStep} />}
          {isRunning && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="absolute inset-0 z-40 flex items-center justify-center"
              style={{ background:'rgba(255,255,255,0.92)', backdropFilter:'blur(4px)' }}>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background:'#DCFCE7', border:'2px solid #22C55E' }}>
                  <span className="text-2xl">✅</span>
                </div>
                <p className="text-lg font-black text-green-600">ENGINE RUNNING</p>
                <p className="text-sm text-gray-400 mt-1">Navigating to Engine view...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left — Flight Controller */}
        <div className="w-64 shrink-0 p-4 space-y-4 bg-white border-r border-gray-200 overflow-y-auto">
          <p className="section-title text-orange-500">Flight Controller</p>

          {/* Throttle */}
          <div className="card p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-600">THROTTLE</span>
              <span className="text-lg font-black text-orange-500">{throttle}%</span>
            </div>
            <input type="range" min={0} max={100} value={throttle}
              onChange={e => setThrottle(Number(e.target.value))}
              disabled={!isRunning} className="w-full"
              style={{ opacity: isRunning ? 1 : 0.4 }} />
            <div className="progress-orange mt-2">
              <div className="progress-orange-fill" style={{ width:`${throttle}%` }} />
            </div>
          </div>

          {/* Flight data */}
          <div className="card p-4 space-y-0">
            <p className="section-title mb-3">Flight Data</p>
            <DataRow label="Altitude"   value="0"      unit=" m" />
            <DataRow label="Airspeed"   value="0"      unit=" km/h" />
            <DataRow label="Heading"    value="000"    unit="°" />
            <DataRow label="Latitude"   value="28.614" unit="°N" />
            <DataRow label="Longitude"  value="77.209" unit="°E" />
            <DataRow label="Battery"    value={isRunning ? "91" : "100"} unit="%" orange />
            <DataRow label="GPS Fix"    value="Good"   unit="" />
            <DataRow label="Satellites" value="12"     unit="" />
          </div>

          {/* Compass */}
          <div className="card p-4 flex justify-center">
            <svg viewBox="0 0 80 80" width="72" height="72">
              <circle cx="40" cy="40" r="37" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1.5" />
              <circle cx="40" cy="40" r="27" fill="none" stroke="#F3F4F6" strokeWidth="0.5" strokeDasharray="2 4" />
              {['N','E','S','W'].map((d,i) => (
                <text key={d} x={40+32*Math.sin(i*Math.PI/2)} y={40-32*Math.cos(i*Math.PI/2)+3}
                  textAnchor="middle" fontSize="8" fontWeight="bold"
                  fill={d==='N'?'#FF6B35':'#9CA3AF'}>{d}</text>
              ))}
              <line x1="40" y1="40" x2="40" y2="15" stroke="#FF6B35" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="40" y1="40" x2="40" y2="58" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="40" cy="40" r="3.5" fill="#FF6B35" />
            </svg>
          </div>
        </div>

        {/* Center — UAV */}
        <div className="flex-1 flex flex-col items-center justify-center relative page-grid-bg">
          <UAVModel running={isRunning} throttle={throttle} />

          {/* Status label */}
          <div className="mt-4 px-6 py-2.5 rounded-full font-black text-sm tracking-wider border"
            style={{
              background: isRunning ? '#DCFCE7' : isArming ? '#FFF7ED' : '#F9FAFB',
              borderColor: isRunning ? '#86EFAC' : isArming ? '#FED7AA' : '#E5E7EB',
              color: isRunning ? '#166534' : isArming ? '#C2410C' : '#6B7280',
            }}>
            {isRunning ? '● ENGINE RUNNING' : isArming ? '● ARMING...' : '○ UAV STANDBY'}
          </div>

          <p className="mt-2 text-xs text-gray-300">28.614°N  77.209°E · ALT 0 m · HDG 000°</p>
        </div>

        {/* Right — Engine Control */}
        <div className="w-64 shrink-0 p-4 space-y-4 bg-white border-l border-gray-200 overflow-y-auto">
          <p className="section-title text-orange-500">Engine Control</p>

          {/* Engine status card */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-600">ENGINE STATUS</span>
              <span className="text-xs font-black"
                style={{ color: isRunning ? '#22C55E' : '#EF4444' }}>
                {isRunning ? '● ONLINE' : '● OFFLINE'}
              </span>
            </div>
            <DataRow label="Model"    value="Rotax 912 ULS" unit="" />
            <DataRow label="RPM"      value={isRunning ? Math.round(telemetry.rpm??4800).toLocaleString() : '0'} unit=" RPM" orange={isRunning} />
            <DataRow label="Oil T"    value={isRunning ? (telemetry.oil_temp??96).toFixed(1) : '—'} unit="°C" />
            <DataRow label="Oil P"    value={isRunning ? (telemetry.oil_pressure??380).toFixed(0) : '—'} unit=" kPa" />
            <DataRow label="CHT"      value={isRunning ? (telemetry.cht??110).toFixed(1) : '—'} unit="°C" />
            <DataRow label="Load"     value={isRunning ? `${telemetry.engineLoad??62}` : '—'} unit="%" />
          </div>

          {/* RPM ramp during arming */}
          {isArming && (
            <div className="card p-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500 font-semibold">ENGINE RPM</span>
                <span className="text-orange-500 font-black">{Math.round(rpmRamp??0)} / 1800</span>
              </div>
              <div className="progress-orange">
                <div className="progress-orange-fill" style={{ width:`${((rpmRamp??0)/1800)*100}%` }} />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <button onClick={armUav} disabled={isArming || isRunning}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all"
            style={{
              background: isArming || isRunning ? '#F3F4F6' : '#FF6B35',
              color: isArming || isRunning ? '#9CA3AF' : 'white',
              boxShadow: isArming || isRunning ? 'none' : '0 4px 14px rgba(255,107,53,0.35)',
              cursor: isArming || isRunning ? 'not-allowed' : 'pointer',
            }}>
            <Power size={16} />
            {isArming ? 'ARMING...' : isRunning ? 'ENGINE RUNNING' : '▶ START UAV'}
          </button>

          <button onClick={emergencyStop} disabled={!isArming && !isRunning}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs border transition-all"
            style={{
              borderColor: (isArming||isRunning) ? '#FCA5A5' : '#E5E7EB',
              background: (isArming||isRunning) ? '#FEF2F2' : '#F9FAFB',
              color: (isArming||isRunning) ? '#EF4444' : '#9CA3AF',
              cursor: (!isArming&&!isRunning) ? 'not-allowed' : 'pointer',
            }}>
            <AlertTriangle size={13} />⚠ EMERGENCY STOP
          </button>

          {/* Note */}
          <div className="card p-3" style={{ background:'#FFF5F0', borderColor:'#FFE8DC' }}>
            <p className="text-[10px] text-orange-600 leading-relaxed">
              Click <strong>▶ START UAV</strong> to begin the SIH 2026 engine health monitoring demonstration.
            </p>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-5 px-6 py-2 bg-white border-t border-gray-100 shrink-0">
        {[
          {l:'GCS',      v:'Connected',  c:'#22C55E'},
          {l:'GPS',      v:'12 Sat',     c:'#22C55E'},
          {l:'Datalink', v:'Active',     c:'#22C55E'},
          {l:'Comms',    v:'Clear',      c:'#22C55E'},
          {l:'Sim',      v:'Active',     c:'#FF6B35'},
        ].map(item => (
          <div key={item.l} className="flex items-center gap-1.5">
            <span className="text-[9px] text-gray-400">{item.l}:</span>
            <span className="text-[9px] font-bold" style={{ color: item.c }}>{item.v}</span>
          </div>
        ))}
        <span className="ml-auto text-[9px] text-gray-300">{new Date().toLocaleString()}</span>
      </div>
    </div>
  );
};

export default MissionControl;
