import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Gauge, Activity, Database, ClipboardList, Settings, Bell, User } from 'lucide-react';
import { useEngineStore } from '../../store/useEngineStore';

const NAV = [
  { to: '/dashboard',   icon: Home,          label: 'Health Monitoring' },
  { to: '/startup',     icon: Gauge,         label: 'Engine Startup'    },
  { to: '/sensors',     icon: Activity,      label: 'Sensor Overview'   },
  { to: '/twin',        icon: Database,      label: 'Digital Twin Model'},
  { to: '/faults',      icon: ClipboardList, label: 'Diagnostics & Faults' },
  { to: '/maintenance', icon: Settings,      label: 'Maintenance & Config' },
];

const Sidebar = () => {
  const alerts = useEngineStore(s => s.alerts);
  const activeAlertsCount = alerts.filter(a => a.sev === 'critical' || a.sev === 'warning').length || 2;

  return (
    <nav
      className="flex flex-col items-center justify-between py-5 h-full w-[68px] shrink-0 select-none z-40"
      style={{ background: '#0D0F14', borderRight: '1px solid #1A1D24' }}
    >
      {/* Top Logo Mark */}
      <div className="flex flex-col items-center gap-6 w-full">
        <NavLink to="/dashboard" title="Engine Health Monitoring" className="group">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #EA580C 100%)' }}
          >
            {/* Turbine flower icon matching reference logo */}
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M12 2.5a4 4 0 0 1 4 4c0 2-2 3.5-4 5.5" />
              <path d="M21.5 12a4 4 0 0 1-4 4c-2 0-3.5-2-5.5-4" />
              <path d="M12 21.5a4 4 0 0 1-4-4c0-2 2-3.5 4-5.5" />
              <path d="M2.5 12a4 4 0 0 1 4-4c2 0 3.5 2 5.5 4" />
            </svg>
          </div>
        </NavLink>

        {/* Navigation items matching reference list */}
        <div className="flex flex-col items-center gap-3 w-full px-3">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className="group relative w-full flex justify-center"
            >
              {({ isActive }) => (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{
                    background: isActive ? 'rgba(255,107,53,0.14)' : 'transparent',
                    color: isActive ? '#FF6B35' : '#64748B',
                  }}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.4 : 1.8}
                    className="transition-colors duration-200 group-hover:text-white"
                  />

                  {/* Sleek Tooltip */}
                  <span
                    className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 text-xs font-medium text-white shadow-xl"
                    style={{ background: '#1E2430', border: '1px solid #334155' }}
                  >
                    {label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Bottom Icons: Notification Bell with Badge + User Profile */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Bell with Badge */}
        <div className="relative group cursor-pointer" title="Active Alerts">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors text-gray-400 group-hover:text-white">
            <Bell size={20} strokeWidth={1.8} />
          </div>
          {activeAlertsCount > 0 && (
            <span
              className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow"
              style={{ background: '#FF6B35' }}
            >
              {activeAlertsCount}
            </span>
          )}
        </div>

        {/* Profile Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 border border-gray-700/60"
          style={{ background: '#1A202C', color: '#CBD5E1' }}
          title="User Account"
        >
          <User size={18} strokeWidth={1.8} />
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
