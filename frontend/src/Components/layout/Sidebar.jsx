import React from 'react';
import { NavLink } from 'react-router-dom';
import { RadioTower, Cpu, Radio, GitCompare, HeartPulse, Zap, Wrench } from 'lucide-react';
import { useEngineStore } from '../../store/useEngineStore';

const NAV = [
  { to:'/',            icon: RadioTower,  label:'Mission Control', end:true },
  { to:'/engine',      icon: Cpu,         label:'Engine Startup'  },
  { to:'/sensors',     icon: Radio,       label:'Sensor Monitor'  },
  { to:'/twin',        icon: GitCompare,  label:'Digital Twin'    },
  { to:'/health',      icon: HeartPulse,  label:'AI Health'       },
  { to:'/faults',      icon: Zap,         label:'Fault Simulation'},
  { to:'/maintenance', icon: Wrench,      label:'Maintenance'     },
];

const Sidebar = () => {
  const uavPhase = useEngineStore(s => s.uavPhase);
  const soh      = useEngineStore(s => s.soh);
  const alerts   = useEngineStore(s => s.alerts);
  const critCount = alerts.filter(a => a.sev === 'critical' && !a.read).length;

  return (
    <nav
      className="flex flex-col items-center py-4 h-full w-[64px] shrink-0"
      style={{ background: '#0D0F14', borderRight: '1px solid #1A1D24' }}
    >
      {/* Logo mark — matches reference orange square */}
      <NavLink to="/" title="Mission Control" className="mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #E55A25 100%)' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <circle cx="12" cy="12" r="3" fill="white" />
            <path d="M12 2 L12 7 M12 17 L12 22 M2 12 L7 12 M17 12 L22 12"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M5.636 5.636 L8.464 8.464 M15.536 15.536 L18.364 18.364 M18.364 5.636 L15.536 8.464 M8.464 15.536 L5.636 18.364"
              stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>
      </NavLink>

      {/* Nav items */}
      <div className="flex flex-col items-center gap-1 flex-1 w-full px-3">
        {NAV.map(({ to, icon: Icon, label, end }, i) => (
          <NavLink
            key={to} to={to} end={end} title={label}
            className="group relative w-full"
          >
            {({ isActive }) => (
              <div
                className="w-full h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                style={{
                  background: isActive ? '#FF6B35' : 'transparent',
                  boxShadow: isActive ? '0 4px 12px rgba(255,107,53,0.35)' : 'none',
                }}
              >
                <Icon
                  size={17}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{ color: isActive ? '#ffffff' : '#4B5563' }}
                />
                {/* Tooltip */}
                <span
                  className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 text-xs font-semibold text-white"
                  style={{ background: '#1F2937', border: '1px solid #374151' }}
                >
                  <span className="text-gray-400 mr-1.5">{i+1}.</span>{label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>

      {/* Alert badge */}
      {critCount > 0 && (
        <div className="relative mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1A1D24' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#EF4444" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white bg-red-500">
            {critCount}
          </span>
        </div>
      )}

      {/* SOH indicator */}
      <div className="flex flex-col items-center gap-1 mb-3 px-2">
        <span className="text-[8px] font-semibold tracking-widest" style={{ color: '#4B5563' }}>SOH</span>
        <span
          className="text-sm font-black"
          style={{
            color: uavPhase === 'standby' ? '#4B5563' :
              (soh?.overall ?? 100) >= 85 ? '#22C55E' :
              (soh?.overall ?? 100) >= 65 ? '#F59E0B' : '#EF4444'
          }}
        >
          {uavPhase === 'standby' ? '—' : `${soh?.overall ?? 87}%`}
        </span>
      </div>

      {/* UAV phase dot */}
      <div className="mb-3 flex flex-col items-center gap-1">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background:
              uavPhase === 'running' ? '#22C55E' :
              uavPhase === 'arming'  ? '#F59E0B' :
              uavPhase === 'fault'   ? '#EF4444' : '#374151',
            boxShadow:
              uavPhase === 'running' ? '0 0 8px #22C55E' :
              uavPhase === 'arming'  ? '0 0 8px #F59E0B' :
              uavPhase === 'fault'   ? '0 0 8px #EF4444' : 'none',
          }}
        />
        <span className="text-[7px] font-bold" style={{ color: '#374151' }}>
          {uavPhase === 'running' ? 'RUN' : uavPhase === 'arming' ? 'ARM' : uavPhase === 'fault' ? 'FLT' : 'SBY'}
        </span>
      </div>
    </nav>
  );
};

export default Sidebar;
