import React from 'react';
import { NavLink } from 'react-router-dom';
import { RadioTower, Cpu, Radio, GitCompare, HeartPulse, Zap, Wrench } from 'lucide-react';
import { useEngineStore } from '../../store/useEngineStore';

const NAV = [
  { to:'/',            icon: RadioTower,  label:'Mission Control', end:true },
  { to:'/engine',      icon: Cpu,         label:'Engine Startup'   },
  { to:'/sensors',     icon: Radio,       label:'Sensor Monitor'   },
  { to:'/twin',        icon: GitCompare,  label:'Digital Twin'     },
  { to:'/health',      icon: HeartPulse,  label:'AI Health'        },
  { to:'/faults',      icon: Zap,         label:'Fault Simulation' },
  { to:'/maintenance', icon: Wrench,      label:'Maintenance'      },
];

const Sidebar = () => {
  const uavPhase = useEngineStore(s => s.uavPhase);
  const soh      = useEngineStore(s => s.soh);
  const activeFault = useEngineStore(s => s.activeFault);

  const phaseColor =
    uavPhase === 'running' ? '#22C55E' :
    uavPhase === 'fault'   ? '#EF4444' :
    uavPhase === 'arming'  ? '#F59E0B' : '#4B5563';

  return (
    <nav className="flex flex-col items-center py-3 px-1.5 rounded-2xl h-full w-14 shrink-0 relative"
      style={{ background: '#0D1117', border: '1px solid #1E2D3D' }}
    >
      {/* Logo */}
      <NavLink to="/" title="UAV Mission Control">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3D00)' }}>
          <span className="text-white font-black text-[10px] leading-none">UAV</span>
        </div>
      </NavLink>

      {/* Phase indicator dot */}
      <div className="w-8 flex items-center justify-center mb-3">
        <div className="flex flex-col items-center gap-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: phaseColor, boxShadow: uavPhase !== 'standby' ? `0 0 6px ${phaseColor}` : 'none' }} />
          <span className="text-[7px] font-bold" style={{ color: phaseColor }}>
            {uavPhase === 'running' ? 'RUN' : uavPhase === 'arming' ? 'ARM' : uavPhase === 'fault' ? 'FLT' : 'SBY'}
          </span>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex flex-col items-center gap-1 flex-1">
        {NAV.map(({ to, icon: Icon, label, end }, i) => (
          <NavLink key={to} to={to} end={end} title={label}
            className={({ isActive }) =>
              `group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'text-white shadow-lg'
                  : 'hover:bg-white/5'
              }`
            }
            style={({ isActive }) => isActive ? {
              background: 'linear-gradient(135deg, #FF6B35, #FF3D00)',
              boxShadow: '0 0 12px rgba(255,107,53,0.4)',
            } : {}}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? 'text-white' : 'text-slate-500'} />
                {/* Tooltip */}
                <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 text-xs font-semibold"
                  style={{ background: '#1E2D3D', color: '#E2E8F0', border: '1px solid #2D4A6A' }}>
                  {label}
                </span>
                {/* Step number badge */}
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black"
                  style={{ background: '#1E2D3D', color: '#4B5563', border: '1px solid #2D4A6A' }}>
                  {i + 1}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* SOH badge */}
      <div className="flex flex-col items-center mb-2 mt-1">
        <span className="text-[8px] font-bold mb-0.5" style={{ color: '#4B5563' }}>SOH</span>
        <span className="text-sm font-black" style={{
          color: (soh?.overall ?? 100) >= 85 ? '#22C55E' : (soh?.overall ?? 100) >= 65 ? '#F59E0B' : '#EF4444'
        }}>
          {soh?.overall ?? '—'}
          {uavPhase !== 'standby' ? '%' : ''}
        </span>
      </div>

      {/* SIH badge */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: '#1A1A2E', border: '1px solid #2D3748' }}>
        <span className="text-[7px] font-black text-center leading-tight" style={{ color: '#FF6B35' }}>SIH{'\n'}2026</span>
      </div>
    </nav>
  );
};

export default Sidebar;
