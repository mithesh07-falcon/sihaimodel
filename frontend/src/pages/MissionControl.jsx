import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, AlertTriangle, Navigation, Gauge, Wind, Compass } from 'lucide-react';
import { useEngineStore, STARTUP_STEPS } from '../store/useEngineStore';

/* ─── UAV Top-Down SVG ─────────────────────────────────────────────────── */
const UAVModel = ({ running, throttle }) => {
  const propSpeed = running ? Math.max(0.08, 1 - (throttle / 100) * 0.85) : 999;
  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 240 300" width="260" height="330" style={{ filter: 'drop-shadow(0 0 20px rgba(255,107,53,0.3))' }}>
        {/* Glow ring */}
        <ellipse cx="120" cy="150" rx="100" ry="110" fill="none" stroke="#FF6B35" strokeWidth="0.5" opacity="0.3" />

        {/* Main wings */}
        <path d="M40 130 Q80 118 120 120 Q160 118 200 130 L190 145 Q155 135 120 136 Q85 135 50 145 Z"
          fill="#0F2A44" stroke="#1E4A6A" strokeWidth="1.2" />

        {/* Fuselage */}
        <path d="M108 50 Q105 70 104 120 L104 190 Q104 210 120 220 Q136 210 136 190 L136 120 Q135 70 132 50 Z"
          fill="#0D2035" stroke="#1E4A6A" strokeWidth="1.5" />
        <path d="M110 50 Q120 40 130 50" fill="#FF6B35" opacity="0.6" />

        {/* Nose sensor pod */}
        <ellipse cx="120" cy="48" rx="9" ry="12" fill="#FF6B35" opacity="0.9" />
        <ellipse cx="120" cy="48" rx="5" ry="7" fill="#FFD700" opacity="0.7" />

        {/* Horizontal tail */}
        <path d="M78 192 Q100 188 120 190 Q140 188 162 192 L158 200 Q138 196 120 197 Q102 196 82 200 Z"
          fill="#0F2A44" stroke="#1E4A6A" strokeWidth="1" />
        {/* Vertical tail */}
        <path d="M118 188 L118 215 L122 215 L122 188 Z" fill="#1E4A6A" />

        {/* Propeller (front, rotates) */}
        <g transform="translate(120, 36)">
          <animateTransform
            attributeName="transform" type="rotate"
            from="0 0 0" to="360 0 0"
            dur={`${propSpeed}s`}
            repeatCount="indefinite"
            additive="sum"
          />
          <rect x="-22" y="-3" width="44" height="6" rx="3" fill="#FF6B35" opacity="0.9" />
          <rect x="-3" y="-22" width="6" height="44" rx="3" fill="#FF6B35" opacity="0.9" />
          <circle r="5" fill="#FFB347" />
        </g>

        {/* Engine cowling */}
        <ellipse cx="120" cy="72" rx="14" ry="10" fill="#1E3A5F" stroke="#2D5A8A" strokeWidth="1" />

        {/* Wing tips */}
        <ellipse cx="40" cy="137" rx="8" ry="4" fill="#FF6B35" opacity={running ? "0.9" : "0.4"}>
          {running && <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.2s" repeatCount="indefinite" />}
        </ellipse>
        <ellipse cx="200" cy="137" rx="8" ry="4" fill="#22C55E" opacity={running ? "0.9" : "0.4"}>
          {running && <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.2s" repeatCount="indefinite" />}
        </ellipse>

        {/* Fuselage stripe */}
        <rect x="117" y="80" width="6" height="90" rx="2" fill="#FF6B35" opacity="0.25" />

        {/* Status light */}
        <circle cx="120" cy="215" r="4" fill={running ? "#22C55E" : "#374151"}>
          {running && <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite" />}
        </circle>
      </svg>

      {/* Altitude ring (decorative) */}
      {running && (
        <motion.div
          className="absolute inset-0 rounded-full border pointer-events-none"
          style={{ borderColor: 'rgba(255,107,53,0.15)' }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
    </div>
  );
};

/* ─── Startup Sequence Overlay ────────────────────────────────────────── */
const StartupOverlay = ({ currentStep }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="absolute inset-0 z-50 flex items-center justify-center"
    style={{ background: 'rgba(5,11,20,0.92)', backdropFilter: 'blur(6px)' }}
  >
    <div className="w-full max-w-md px-6">
      <p className="text-xs font-bold tracking-widest mb-6 text-center" style={{ color: '#FF6B35' }}>
        ▶ INITIATING STARTUP SEQUENCE
      </p>
      <div className="space-y-3">
        {STARTUP_STEPS.map((step, i) => {
          const done   = i < currentStep;
          const active = i === currentStep;
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: i <= currentStep ? 1 : 0.3, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs"
                style={{
                  background: done ? '#22C55E' : active ? '#FF6B35' : '#1E2D3D',
                  border: active ? '2px solid #FF6B35' : done ? 'none' : '1px solid #2D4A6A',
                  boxShadow: active ? '0 0 12px rgba(255,107,53,0.6)' : 'none'
                }}>
                {done ? '✓' : active ? (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                ) : i + 1}
              </div>
              <span className="text-sm font-semibold" style={{
                color: done ? '#22C55E' : active ? '#FF6B35' : '#4B5563'
              }}>
                {step.icon} {step.label}
              </span>
              {active && (
                <motion.span
                  className="text-xs ml-1"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  style={{ color: '#FF6B35' }}
                >
                  ●
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  </motion.div>
);

/* ─── Flight Data Gauge ───────────────────────────────────────────────── */
const DataRow = ({ label, value, unit, color = '#E2E8F0' }) => (
  <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: '#1E2D3D' }}>
    <span className="text-xs font-semibold" style={{ color: '#64748B' }}>{label}</span>
    <span className="font-bold tabular-nums text-sm" style={{ color }}>
      {value}<span className="text-xs font-normal ml-0.5" style={{ color: '#4B5563' }}>{unit}</span>
    </span>
  </div>
);

/* ─── Main Component ──────────────────────────────────────────────────── */
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

  const isRunning  = uavPhase === 'running';
  const isArming   = uavPhase === 'arming';

  // Auto-navigate when engine is running
  useEffect(() => {
    if (isRunning) {
      const t = setTimeout(() => navigate('/engine'), 1800);
      return () => clearTimeout(t);
    }
  }, [isRunning, navigate]);

  const heading = Math.round(Math.random() * 10 + 355) % 360;

  return (
    <div className="relative h-full min-h-screen flex flex-col" style={{ background: '#050B14', color: '#E2E8F0' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ borderBottom: '1px solid #1E2D3D', background: '#080E18' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: isRunning ? '#22C55E' : isArming ? '#F59E0B' : '#EF4444',
              boxShadow: isRunning ? '0 0 8px #22C55E' : isArming ? '0 0 8px #F59E0B' : 'none' }} />
            <span className="text-xs font-black tracking-widest" style={{ color: '#E2E8F0' }}>UAV GROUND CONTROL STATION</span>
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: '#FF6B3520', border: '1px solid #FF6B3540', color: '#FF6B35' }}>
            ROTAX-MALE-009
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold px-2 py-1 rounded" style={{ background: '#F59E0B20', border: '1px solid #F59E0B40', color: '#F59E0B' }}>
            ⚠ ALL DATA SIMULATED
          </span>
          <span className="text-[9px] font-bold px-2 py-1 rounded" style={{ background: '#1E2D3D', color: '#64748B' }}>
            SIH 2026
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-0 overflow-hidden relative">
        {/* Startup Overlay */}
        <AnimatePresence>
          {isArming && <StartupOverlay currentStep={startupStep} />}
          {isRunning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center"
              style={{ background: 'rgba(5,11,20,0.85)', backdropFilter: 'blur(4px)' }}
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >
                  <div className="text-4xl mb-3">🟢</div>
                  <p className="text-xl font-black" style={{ color: '#22C55E' }}>ENGINE RUNNING</p>
                  <p className="text-sm mt-1" style={{ color: '#64748B' }}>Redirecting to Engine Startup view...</p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left — Flight Controller */}
        <div className="w-64 shrink-0 p-4 flex flex-col gap-4" style={{ borderRight: '1px solid #1E2D3D', background: '#080E18' }}>
          <div>
            <p className="text-[9px] font-black tracking-widest mb-3" style={{ color: '#FF6B35' }}>FLIGHT CONTROLLER</p>

            {/* Throttle */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold" style={{ color: '#64748B' }}>THROTTLE</span>
                <span className="text-sm font-black tabular-nums" style={{ color: '#FF6B35' }}>{throttle}%</span>
              </div>
              <input
                type="range" min={0} max={100} value={throttle}
                onChange={e => setThrottle(Number(e.target.value))}
                className="w-full" disabled={!isRunning}
                style={{ accentColor: '#FF6B35', opacity: isRunning ? 1 : 0.4 }}
              />
              <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: '#1E2D3D' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #22C55E, #F59E0B, #EF4444)', width: `${throttle}%` }}
                  animate={{ width: `${throttle}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <DataRow label="ALTITUDE"     value={isRunning ? '0'    : '0'}     unit=" m" />
            <DataRow label="AIRSPEED"     value={isRunning ? '0'    : '0'}     unit=" km/h" />
            <DataRow label="HEADING"      value={isRunning ? '000'  : '000'}   unit="°" />
            <DataRow label="LATITUDE"     value="28.6139"                       unit="°N" />
            <DataRow label="LONGITUDE"    value="77.2090"                       unit="°E" />
            <DataRow label="BATTERY"      value={isRunning ? '91'   : '100'}   unit="%" color={isRunning ? '#22C55E' : '#4B5563'} />
            <DataRow label="GPS FIX"      value="GOOD"                          unit="" color="#22C55E" />
            <DataRow label="SATELLITES"   value="12"                            unit="" color="#22C55E" />
          </div>

          {/* Compass indicator */}
          <div className="flex items-center justify-center py-4" style={{ borderTop: '1px solid #1E2D3D' }}>
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 80 80" className="w-full h-full">
                <circle cx="40" cy="40" r="38" fill="none" stroke="#1E2D3D" strokeWidth="1.5" />
                <circle cx="40" cy="40" r="30" fill="none" stroke="#1E2D3D" strokeWidth="0.5" strokeDasharray="2 4" />
                {['N','E','S','W'].map((dir,i) => (
                  <text key={dir} x={40 + 33*Math.sin(i*Math.PI/2)} y={40 - 33*Math.cos(i*Math.PI/2)+3}
                    textAnchor="middle" fontSize="8" fontWeight="bold"
                    fill={dir==='N' ? '#FF6B35' : '#4B5563'}>{dir}</text>
                ))}
                <line x1="40" y1="40" x2="40" y2="14" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" />
                <line x1="40" y1="40" x2="40" y2="60" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="40" cy="40" r="4" fill="#FF6B35" />
              </svg>
            </div>
          </div>
        </div>

        {/* Center — UAV visualization */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 relative">
          {/* Grid background */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'linear-gradient(#22C55E 1px, transparent 1px), linear-gradient(90deg, #22C55E 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          {/* Radar rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[200, 150, 100, 60].map((r, i) => (
              <div key={i} className="absolute rounded-full border"
                style={{ width: r*2, height: r*2, borderColor: 'rgba(34,197,94,0.08)' }} />
            ))}
            <motion.div
              className="absolute rounded-full border"
              style={{ width: 300, height: 300, borderColor: 'rgba(255,107,53,0.12)' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          {/* UAV */}
          <UAVModel running={isRunning} throttle={throttle} />

          {/* Status badge */}
          <div className="px-5 py-2 rounded-full" style={{
            background: isRunning ? 'rgba(34,197,94,0.15)' : 'rgba(75,85,99,0.3)',
            border: `1px solid ${isRunning ? 'rgba(34,197,94,0.5)' : '#1E2D3D'}`,
          }}>
            <span className="text-sm font-black tracking-widest" style={{ color: isRunning ? '#22C55E' : '#64748B' }}>
              {isRunning ? '● ENGINE RUNNING' : isArming ? '● ARMING...' : '○ UAV STANDBY'}
            </span>
          </div>

          {/* Coordinate display */}
          <div className="text-xs tabular-nums" style={{ color: '#1E3A5F' }}>
            28.6139°N 77.2090°E  ·  ALT 0m  ·  HDG 000°
          </div>
        </div>

        {/* Right — Engine Controls */}
        <div className="w-64 shrink-0 p-4 flex flex-col gap-4" style={{ borderLeft: '1px solid #1E2D3D', background: '#080E18' }}>
          <div>
            <p className="text-[9px] font-black tracking-widest mb-3" style={{ color: '#FF6B35' }}>ENGINE CONTROL</p>

            {/* Engine status */}
            <div className="rounded-xl p-3 mb-3" style={{ background: '#0D1117', border: '1px solid #1E2D3D' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: '#64748B' }}>ENGINE</span>
                <span className="text-[10px] font-black" style={{
                  color: isRunning ? '#22C55E' : '#EF4444',
                  textShadow: isRunning ? '0 0 8px #22C55E' : 'none'
                }}>
                  {isRunning ? '● ONLINE' : '● OFFLINE'}
                </span>
              </div>
              <DataRow label="MODEL"    value="Rotax 912 ULS" unit="" />
              <DataRow label="RPM"      value={isRunning ? Math.round(telemetry.rpm ?? 4800).toLocaleString() : '0'} unit=" RPM"
                color={isRunning ? '#FF6B35' : '#4B5563'} />
              <DataRow label="OIL T"    value={isRunning ? (telemetry.oil_temp ?? 96).toFixed(1) : '—'} unit="°C" />
              <DataRow label="OIL P"    value={isRunning ? (telemetry.oil_pressure ?? 380).toFixed(0) : '—'} unit=" kPa" />
              <DataRow label="CHT"      value={isRunning ? (telemetry.cht ?? 110).toFixed(1) : '—'} unit="°C" />
              <DataRow label="LOAD"     value={isRunning ? `${telemetry.engineLoad ?? 62}` : '—'} unit="%" />
            </div>

            {/* RPM ramp visual during startup */}
            {isArming && (
              <div className="mb-3">
                <div className="flex justify-between text-[9px] mb-1" style={{ color: '#64748B' }}>
                  <span>ENGINE RPM</span>
                  <span style={{ color: '#FF6B35' }}>{Math.round(rpmRamp)} / 1800</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1E2D3D' }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: '#FF6B35', width: `${(rpmRamp/1800)*100}%` }}
                    animate={{ width: `${(rpmRamp/1800)*100}%` }}
                    transition={{ duration: 0.3 }} />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={armUav}
                disabled={isArming || isRunning}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all"
                style={{
                  background: isArming || isRunning ? '#1E2D3D' : 'linear-gradient(135deg, #22C55E, #16A34A)',
                  color: isArming || isRunning ? '#4B5563' : 'white',
                  cursor: isArming || isRunning ? 'not-allowed' : 'pointer',
                  boxShadow: isArming || isRunning ? 'none' : '0 0 20px rgba(34,197,94,0.3)',
                }}
              >
                <Power size={16} />
                {isArming ? 'ARMING...' : isRunning ? 'ENGINE RUNNING' : '▶ START UAV'}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={emergencyStop}
                disabled={!isArming && !isRunning}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs transition-all"
                style={{
                  background: (isArming || isRunning) ? 'rgba(239,68,68,0.15)' : '#1E2D3D',
                  color: (isArming || isRunning) ? '#EF4444' : '#4B5563',
                  border: `1px solid ${(isArming || isRunning) ? 'rgba(239,68,68,0.5)' : '#1E2D3D'}`,
                  cursor: (!isArming && !isRunning) ? 'not-allowed' : 'pointer',
                }}
              >
                <AlertTriangle size={13} />⚠ EMERGENCY STOP
              </motion.button>
            </div>
          </div>

          {/* Mission notes */}
          <div className="rounded-xl p-3" style={{ background: '#0D1117', border: '1px solid #1E2D3D' }}>
            <p className="text-[9px] font-black tracking-widest mb-2" style={{ color: '#64748B' }}>MISSION NOTE</p>
            <p className="text-[10px] leading-relaxed" style={{ color: '#4B5563' }}>
              This is an SIH 2026 demonstration of a UAV engine health monitoring system.
              Click <span style={{ color: '#22C55E' }}>▶ START UAV</span> to begin the diagnostic journey.
            </p>
            <div className="mt-2 pt-2" style={{ borderTop: '1px solid #1E2D3D' }}>
              <p className="text-[9px]" style={{ color: '#2D4A6A' }}>SIMULATION MODE — All sensor data is synthetic</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center gap-6 px-6 py-2 shrink-0" style={{ borderTop: '1px solid #1E2D3D', background: '#080E18' }}>
        {[
          { label: 'WS', value: 'MOCK', color: '#F59E0B' },
          { label: 'GCS', value: 'CONNECTED', color: '#22C55E' },
          { label: 'GPS', value: '12 SAT', color: '#22C55E' },
          { label: 'DATALINK', value: 'ACTIVE', color: '#22C55E' },
          { label: 'COMMS', value: 'CLEAR', color: '#22C55E' },
          { label: 'SIM', value: 'ACTIVE', color: '#FF6B35' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="text-[9px] font-semibold" style={{ color: '#4B5563' }}>{item.label}:</span>
            <span className="text-[9px] font-bold" style={{ color: item.color }}>{item.value}</span>
          </div>
        ))}
        <span className="ml-auto text-[9px]" style={{ color: '#1E2D3D' }}>
          {new Date().toLocaleString()} IST
        </span>
      </div>
    </div>
  );
};

export default MissionControl;
