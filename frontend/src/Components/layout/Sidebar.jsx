import React from 'react';
import { NavLink } from 'react-router-dom';
import { Radio, Home, Activity, Database, ClipboardList, Settings, Bell, User, Lock } from 'lucide-react';
import { useEngineStore } from '../../store/useEngineStore';

// Navigation order rearranged:
// 1. Live Data Ingestion Gateway (first to establish stream)
// 2. Health Monitoring Dashboard (next to connection)
// 3. Sensor Overview
// 4. Digital Twin Model
// 5. Diagnostics & Faults
// 6. Maintenance & Config
const NAV = [
  { to: '/connection',  icon: Radio,         label: 'Live Data Ingestion Gateway',  alwaysActive: true },
  { to: '/',            icon: Home,          label: 'Health Monitoring Dashboard',  alwaysActive: false },
  { to: '/sensors',     icon: Activity,      label: 'Sensor Overview',              alwaysActive: false },
  { to: '/twin',        icon: Database,      label: 'Digital Twin Model',           alwaysActive: false },
  { to: '/faults',      icon: ClipboardList, label: 'Diagnostics & Faults',         alwaysActive: false },
  { to: '/maintenance', icon: Settings,      label: 'Maintenance & Config',        alwaysActive: false },
];

const Sidebar = () => {
  const alerts = useEngineStore(s => s.alerts);
  const streamConnected = useEngineStore(s => s.streamConnected);
  const activeAlertsCount = alerts.filter(a => a.sev === 'critical' || a.sev === 'warning').length || 0;

  return (
    <nav
      className="flex flex-col items-center justify-between py-5 h-full w-[68px] shrink-0 select-none z-40 bg-white border-r border-gray-200"
    >
      {/* Top Logo Mark */}
      <div className="flex flex-col items-center gap-6 w-full">
        <NavLink to="/connection" title="DRDO · AeroTwin UAV Engine Analytics" className="group flex flex-col items-center gap-1">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105 relative overflow-hidden border-2"
            style={{ borderColor: '#003087', background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,48,135,0.18)' }}
          >
            <img
              src="/drdo_logo.png"
              alt="DRDO"
              className="w-full h-full p-0.5 object-contain block"
              draggable={false}
            />
            {/* Connection status dot */}
            <span
              className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                streamConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
          </div>
          {/* DRDO label under logo */}
          <span
            className="text-[8px] font-black tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ color: '#003087', letterSpacing: '0.18em' }}
          >
            DRDO
          </span>
        </NavLink>


        {/* Navigation items matching required order */}
        <div className="flex flex-col items-center gap-3 w-full px-3">
          {NAV.map(({ to, icon: Icon, label, alwaysActive }) => {
            const isInactive = !alwaysActive && !streamConnected;

            return (
              <NavLink
                key={to}
                to={to}
                title={label}
                className="group relative w-full flex justify-center"
              >
                {({ isActive }) => (
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${
                      isInactive ? 'opacity-40 hover:opacity-80' : 'opacity-100'
                    }`}
                    style={{
                      background: isActive ? 'rgba(255,107,53,0.12)' : 'transparent',
                      color: isActive ? '#FF6B35' : (isInactive ? '#94A3B8' : '#64748B'),
                    }}
                  >
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.4 : 1.8}
                      className={`transition-colors duration-200 ${
                        isActive ? 'text-[#FF6B35]' : 'group-hover:text-[#FF6B35]'
                      }`}
                    />

                    {/* Dimmed Lock indicator if inactive */}
                    {isInactive && (
                      <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="w-1 h-1 rounded-full bg-gray-400" />
                      </span>
                    )}

                    {/* Sleek Tooltip */}
                    <span
                      className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 text-xs font-medium text-white shadow-xl flex items-center gap-1.5"
                      style={{ background: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(51, 65, 85, 0.3)' }}
                    >
                      {label}
                      {isInactive && (
                        <span className="text-[10px] text-amber-400 font-bold">(Connect First)</span>
                      )}
                    </span>
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Bottom Icons: Notification Bell with Badge + User Profile */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Bell with Badge */}
        <div className="relative group cursor-pointer" title="Active Alerts">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors text-gray-500 hover:text-[#FF6B35] hover:bg-orange-50">
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
          className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 border border-orange-200 bg-orange-50 text-orange-600"
          title="User Account"
        >
          <User size={18} strokeWidth={1.8} />
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
