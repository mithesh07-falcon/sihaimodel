import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useEngineStore } from '../store/useEngineStore';

const SENSORS_ON_ENGINE = [
  { id:'rpm',          label:'RPM',    x:'50%', y:'12%', color:'#FF6B35', side:'right' },
  { id:'cht',          label:'CHT',    x:'78%', y:'28%', color:'#EF4444', side:'right' },
  { id:'egt',          label:'EGT',    x:'78%', y:'55%', color:'#F97316', side:'right' },
  { id:'oil_pressure', label:'OIL P',  x:'22%', y:'28%', color:'#8B5CF6', side:'left'  },
  { id:'oil_temp',     label:'OIL T',  x:'22%', y:'55%', color:'#6366F1', side:'left'  },
  { id:'vibration',    label:'VIB',    x:'50%', y:'80%', color:'#F59E0B', side:'right' },
  { id:'fuel_flow',    label:'FUEL',   x:'15%', y:'72%', color:'#22C55E', side:'left'  },
  { id:'map',          label:'MAP',    x:'85%', y:'72%', color:'#14B8A6', side:'right' },
];

const PIPELINE_STAGES = [
  { id:'raw',      label:'RAW DATA',       color:'#4B5563' },
  { id:'filter',   label:'FILTERING',      color:'#3B82F6' },
  { id:'sync',     label:'SYNC',           color:'#8B5CF6' },
  { id:'norm',     label:'NORMALIZE',      color:'#F59E0B' },
  { id:'validate', label:'VALIDATE',       color:'#22C55E' },
  { id:'out',      label:'TELEMETRY OUT',  color:'#FF6B35' },
];

// Animated data packet that flows through the pipeline
const Packet = ({ delay, color }) => (
  <motion.div
    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
    style={{ left: '-6px', background: color, boxShadow: `0 0 8px ${color}` }}
    animate={{ left: ['0%', '100%'] }}
    transition={{ duration: 1.8, delay, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' }}
  />
);

const SensorMonitoring = () => {
  const navigate    = useNavigate();
  const telemetry   = useEngineStore(s => s.telemetry);
  const engineRunning = useEngineStore(s => s.engineRunning);
  const uavPhase    = useEngineStore(s => s.uavPhase);
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    if (uavPhase === 'standby') navigate('/');
  }, [uavPhase, navigate]);

  // Animate pipeline stage highlight
  useEffect(() => {
    const iv = setInterval(() => {
      setActiveStage(s => (s + 1) % PIPELINE_STAGES.length);
    }, 700);
    return () => clearInterval(iv);
  }, []);

  const getSensorValue = (id) => {
    if (!engineRunning) return '—';
    const v = telemetry[id];
    if (v == null) return '—';
    if (id === 'rpm') return Math.round(v).toLocaleString();
    return typeof v === 'number' ? (v < 10 ? v.toFixed(2) : v.toFixed(1)) : '—';
  };

  const getSensorUnit = (id) => ({
    rpm:'RPM', cht:'°C', egt:'°C', oil_pressure:'kPa', oil_temp:'°C',
    vibration:'g', fuel_flow:'L/h', map:'kPa',
  }[id] ?? '');

  return (
    <div className="h-screen flex flex-col" style={{ background: '#050B14', color: '#E2E8F0' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ borderBottom: '1px solid #1E2D3D', background: '#080E18' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black tracking-widest">SENSOR MONITORING</span>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: '#22C55E20', border: '1px solid #22C55E40', color: '#22C55E' }}>
            ● {SENSORS_ON_ENGINE.length} SENSORS ACTIVE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px]" style={{ color: '#4B5563' }}>STEP 3 / 7</span>
          <button onClick={() => navigate('/twin')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: '#FF6B3520', border: '1px solid #FF6B3540', color: '#FF6B35' }}>
            Digital Twin <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Engine with sensor markers */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center" style={{ background: '#060C16' }}>
          {/* Grid */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage:'linear-gradient(#22C55E 1px,transparent 1px),linear-gradient(90deg,#22C55E 1px,transparent 1px)',
            backgroundSize:'40px 40px' }} />

          {/* Engine schematic */}
          <div className="relative" style={{ width: 480, height: 420 }}>
            {/* Engine body */}
            <svg viewBox="0 0 480 420" width="480" height="420">
              {/* Crankcase */}
              <rect x="140" y="140" width="200" height="120" rx="12" fill="#0D1A2E" stroke="#1E3A5F" strokeWidth="2" />
              {/* Cylinders */}
              {[0,1,2,3].map(i => (
                <g key={i}>
                  <rect x={155 + i*45} y="80" width="35" height="70" rx="8" fill="#0A1628" stroke="#1E3A5F" strokeWidth="1.5" />
                  <rect x={161 + i*45} y="75" width="23" height="15" rx="4" fill="#1E3A5F" />
                </g>
              ))}
              {/* Intake manifold */}
              <rect x="140" y="270" width="200" height="20" rx="6" fill="#1A2A44" stroke="#1E3A5F" strokeWidth="1" />
              {/* Oil sump */}
              <rect x="160" y="290" width="160" height="35" rx="8" fill="#0D1A2E" stroke="#1E3A5F" strokeWidth="1" />
              {/* Prop shaft */}
              <rect x="225" y="45" width="30" height="50" rx="6" fill="#FF6B35" opacity="0.4" />
              {/* Propeller */}
              <g transform="translate(240,48)">
                <rect x="-45" y="-4" width="90" height="8" rx="4" fill="#FF6B35" opacity="0.8" />
                <rect x="-4" y="-45" width="8" height="90" rx="4" fill="#FF6B35" opacity="0.8" />
                <circle r="7" fill="#FFD700" />
              </g>
              {/* Exhaust pipes */}
              {[0,1,2,3].map(i => (
                <path key={i} d={`M${165+i*45} 80 Q${165+i*45} 55 ${150+i*45} 50`}
                  fill="none" stroke="#EF4444" strokeWidth="3" opacity="0.6" />
              ))}
            </svg>

            {/* Sensor blips */}
            {SENSORS_ON_ENGINE.map((sensor, i) => (
              <div key={sensor.id}
                className="absolute flex items-center gap-1 cursor-pointer"
                style={{ left: sensor.x, top: sensor.y, transform: 'translate(-50%,-50%)' }}>
                {/* Connector line */}
                {sensor.side === 'right' && (
                  <div className="h-px w-8 mr-1" style={{ background: sensor.color, opacity: 0.5 }} />
                )}
                {/* Pulse dot */}
                <div className="relative">
                  <motion.div
                    className="w-3 h-3 rounded-full"
                    style={{ background: sensor.color, boxShadow: `0 0 6px ${sensor.color}` }}
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.5, delay: i*0.2, repeat: Infinity }}
                  />
                </div>
                {/* Label chip */}
                <div className="px-1.5 py-0.5 rounded text-[9px] font-black"
                  style={{ background: `${sensor.color}22`, border: `1px solid ${sensor.color}66`, color: sensor.color }}>
                  {sensor.label}
                </div>
                {sensor.side === 'left' && (
                  <div className="h-px w-8 ml-1" style={{ background: sensor.color, opacity: 0.5 }} />
                )}
              </div>
            ))}

            {/* Data flow arrows from engine center */}
            {engineRunning && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="absolute text-green-400 text-xs font-mono font-bold"
                  style={{ bottom: 20, left: '50%', transform: 'translateX(-50%)', letterSpacing: '0.1em' }}>
                  → DATA FLOWING →
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 shrink-0 flex flex-col overflow-hidden" style={{ background: '#080E18', borderLeft: '1px solid #1E2D3D' }}>
          {/* Live sensor values */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-[9px] font-black tracking-widest mb-3" style={{ color: '#FF6B35' }}>LIVE SENSOR DATA</p>
            <div className="space-y-2">
              {SENSORS_ON_ENGINE.map(sensor => {
                const val  = getSensorValue(sensor.id);
                const unit = getSensorUnit(sensor.id);
                return (
                  <motion.div
                    key={sensor.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg"
                    style={{ background: '#0D1117', border: '1px solid #1E2D3D' }}
                    animate={engineRunning ? { borderColor: [`${sensor.color}33`, `${sensor.color}66`, `${sensor.color}33`] } : {}}
                    transition={{ duration: 2, delay: Math.random() * 1.5, repeat: Infinity }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sensor.color, boxShadow: engineRunning ? `0 0 4px ${sensor.color}` : 'none' }} />
                      <span className="text-xs font-semibold" style={{ color: '#64748B' }}>{sensor.label}</span>
                    </div>
                    <span className="font-bold text-sm tabular-nums" style={{ color: val === '—' ? '#1E3A5F' : '#E2E8F0' }}>
                      {val}<span className="text-[9px] font-normal ml-0.5" style={{ color: '#4B5563' }}>{unit}</span>
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Data flow pipeline */}
            <div className="mt-4" style={{ borderTop: '1px solid #1E2D3D', paddingTop: 12 }}>
              <p className="text-[9px] font-black tracking-widest mb-3" style={{ color: '#FF6B35' }}>DATA PROCESSING PIPELINE</p>
              <div className="space-y-2">
                {PIPELINE_STAGES.map((stage, i) => {
                  const isActive = activeStage === i;
                  return (
                    <div key={stage.id} className="flex items-center gap-2">
                      <div className="flex-1 h-7 rounded-lg relative overflow-hidden flex items-center px-3"
                        style={{
                          background: isActive ? `${stage.color}20` : '#0D1117',
                          border: `1px solid ${isActive ? stage.color : '#1E2D3D'}`,
                          transition: 'all 0.3s',
                        }}>
                        <span className="text-[9px] font-bold z-10" style={{ color: isActive ? stage.color : '#4B5563' }}>
                          {stage.label}
                        </span>
                        {/* Packet animation */}
                        {isActive && (
                          <div className="absolute inset-0 overflow-hidden">
                            {[0, 0.4, 0.8].map((d, pi) => (
                              <Packet key={pi} delay={d} color={stage.color} />
                            ))}
                          </div>
                        )}
                      </div>
                      {i < PIPELINE_STAGES.length - 1 && (
                        <span className="text-xs" style={{ color: '#1E3A5F' }}>↓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sampling rate */}
            <div className="mt-3 p-3 rounded-lg" style={{ background: '#0D1117', border: '1px solid #1E2D3D' }}>
              <p className="text-[9px] font-bold" style={{ color: '#64748B' }}>VIRTUAL SAMPLING</p>
              <p className="text-xs mt-1" style={{ color: '#4B5563' }}>
                Sensors sampled at 50 Hz (simulated)<br />
                Data packets: ~1800ms update interval
              </p>
              <p className="text-[9px] mt-1" style={{ color: '#FF6B3560' }}>— SIMULATED DATA —</p>
            </div>
          </div>

          {/* Navigate */}
          <div className="p-4 shrink-0" style={{ borderTop: '1px solid #1E2D3D' }}>
            <button onClick={() => navigate('/twin')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3D00)', color: 'white', boxShadow: '0 0 20px rgba(255,107,53,0.25)' }}>
              Proceed to Digital Twin <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensorMonitoring;
