import React from 'react';
import { useEngineStore } from '../../store/useEngineStore';
import { motion } from 'framer-motion';

const STATUS = {
  healthy:  { dot: 'bg-green-500', text: 'text-green-700', border: 'border-green-200', bg: 'bg-green-50', label: 'Normal' },
  warning:  { dot: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50', label: 'Warning' },
  critical: { dot: 'bg-red-500 animate-pulse', text: 'text-red-700', border: 'border-red-200', bg: 'bg-red-50', label: 'Critical' },
};

function getStatus(val, warnHigh, critHigh, warnLow, critLow) {
  if ((critHigh && val > critHigh) || (critLow && val < critLow)) return 'critical';
  if ((warnHigh && val > warnHigh) || (warnLow && val < warnLow)) return 'warning';
  return 'healthy';
}

const Callout = ({ label, value, status, style }) => {
  const s = STATUS[status] || STATUS.healthy;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`absolute pointer-events-none ${s.bg} ${s.border} border rounded-xl px-3 py-2 shadow-card-md backdrop-blur-sm`}
      style={{ minWidth: 110, ...style }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <p className="text-sm font-black text-gray-900 leading-none">{value}</p>
      <p className={`text-[9px] font-bold mt-0.5 uppercase ${s.text}`}>{s.label}</p>
      {/* connector dot */}
      <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white ${s.dot.replace('animate-pulse','')}`} />
    </motion.div>
  );
};

const EngineModel3D = () => {
  const telemetry = useEngineStore(s => s.telemetry);
  const diagnosis  = useEngineStore(s => s.diagnosis);

  const oilSt  = getStatus(telemetry.oil_pressure, null, null, 280, 200);
  const egtSt  = getStatus(telemetry.egt, 870, 910);
  const vibSt  = getStatus(telemetry.vibration, 2.0, 3.0);
  const rpmSt  = getStatus(telemetry.rpm, 5200, 5600);

  // Override if diagnosis says fault
  const faultLower = (diagnosis.fault_component || '').toLowerCase();
  const effectiveOil = faultLower.includes('oil') ? diagnosis.status.toLowerCase() : oilSt;
  const effectiveCyl = (faultLower.includes('cylinder') || faultLower.includes('cool')) ? diagnosis.status.toLowerCase() : egtSt;

  const borderColor = {
    Healthy: 'border-green-200', Warning: 'border-amber-200', Critical: 'border-red-200'
  }[diagnosis.status] || 'border-gray-200';

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden border-2 ${borderColor} bg-gradient-to-b from-orange-50/60 via-cream to-amber-50/40 transition-all duration-700`}>
      {/* Radial orange glow behind engine */}
      <div className="absolute inset-0 engine-glow pointer-events-none z-0" />

      {/* Hero engine image */}
      <img
        src="/engine_hero.jpg"
        alt="Aero piston engine cross-section"
        className="absolute inset-0 w-full h-full object-contain z-10 select-none"
        draggable={false}
        style={{ filter: diagnosis.status === 'Critical' ? 'drop-shadow(0 0 18px rgba(239,68,68,0.35))' : diagnosis.status === 'Warning' ? 'drop-shadow(0 0 12px rgba(245,158,11,0.3))' : 'none' }}
      />

      {/* Floating callout cards — positioned over engine anatomy */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {/* Oil sump — bottom center */}
        <Callout
          label="Oil Pressure" value={`${((telemetry.oil_pressure||380)*0.145).toFixed(1)} PSI`}
          status={effectiveOil}
          style={{ bottom: '12%', left: '42%' }}
        />
        {/* Exhaust — top right */}
        <Callout
          label="EGT" value={`${(telemetry.egt||810).toFixed(0)} °C`}
          status={effectiveCyl}
          style={{ top: '8%', right: '10%' }}
        />
        {/* Crankshaft — left mid */}
        <Callout
          label="Vibration" value={`${(telemetry.vibration||1.1).toFixed(2)} g`}
          status={vibSt}
          style={{ top: '42%', left: '5%' }}
        />
        {/* RPM — top left */}
        <Callout
          label="Engine RPM" value={`${Math.round(telemetry.rpm||4800)}`}
          status={rpmSt}
          style={{ top: '8%', left: '8%' }}
        />
      </div>

      {/* Status badge */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-card border
          ${diagnosis.status === 'Healthy'   ? 'bg-green-50 border-green-200 text-green-700' :
            diagnosis.status === 'Warning'   ? 'bg-amber-50 border-amber-200 text-amber-700' :
            'bg-red-50 border-red-200 text-red-700'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${diagnosis.status === 'Healthy' ? 'bg-green-500' : diagnosis.status === 'Warning' ? 'bg-amber-500 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
          {diagnosis.fault_type || 'Healthy'} · {diagnosis.fault_component}
        </div>
      </div>

      {/* Bottom badge */}
      <div className="absolute bottom-2 right-3 z-30 bg-white/80 backdrop-blur text-[9px] text-gray-400 font-medium px-2 py-0.5 rounded-lg border border-gray-200">
        AI-GENERATED VISUALIZATION · ROTAX-MALE-009
      </div>
    </div>
  );
};

export default EngineModel3D;
