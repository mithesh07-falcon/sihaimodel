import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Cpu, Radio, BarChart3, ClipboardList, Settings, Bell, User } from 'lucide-react';
import { useEngineStore } from '../../store/useEngineStore';
import NotificationsDropdown from './NotificationsDropdown';
import ProfileMenu from './ProfileMenu';

const NAV_LINKS = [
  { to: '/',           icon: Cpu,           label: 'Dashboard',     end: true },
  { to: '/telemetry',  icon: Radio,         label: 'Live Telemetry' },
  { to: '/analytics',  icon: BarChart3,     label: 'Analytics'      },
  { to: '/tasks',      icon: ClipboardList, label: 'Maintenance'    },
  { to: '/settings',   icon: Settings,      label: 'Settings'       },
];

const NavIcon = ({ to, icon: Icon, label, end }) => (
  <NavLink
    to={to}
    end={end}
    title={label}
    className={({ isActive }) =>
      `group relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200
       ${isActive ? 'bg-orange-500 text-white shadow-md' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`
    }
  >
    {({ isActive }) => (
      <>
        <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} />
        <span className="absolute left-full ml-2.5 px-2.5 py-1 bg-neutral-800 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
          {label}
        </span>
      </>
    )}
  </NavLink>
);

const Sidebar = () => {
  const unreadCount = useEngineStore(s => s.unreadCount);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav className="flex flex-col items-center justify-between py-4 px-2 bg-neutral-900 rounded-3xl h-full w-14 shrink-0 shadow-card-lg relative">
      {/* Logo → Dashboard */}
      <div className="flex flex-col items-center gap-4">
        <NavLink to="/" title="AeroTwin Dashboard">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-md hover:bg-orange-600 transition-colors">
            <span className="text-white font-black text-xs leading-none">AT</span>
          </div>
        </NavLink>

        {/* Nav icons */}
        <div className="flex flex-col items-center gap-1 mt-2">
          {NAV_LINKS.map(link => <NavIcon key={link.to} {...link} />)}
        </div>
      </div>

      {/* Bottom: Bell + Avatar */}
      <div className="flex flex-col items-center gap-2">
        {/* Bell with dropdown */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setShowNotif(v => !v); setShowProfile(false); }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all relative"
            title="Notifications"
          >
            <Bell size={17} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-3.5 bg-red-500 rounded-full text-[8px] font-black text-white flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotif && <NotificationsDropdown onClose={() => setShowNotif(false)} />}
        </div>

        {/* Avatar with profile menu */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setShowProfile(v => !v); setShowNotif(false); }}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center hover:ring-2 hover:ring-orange-400 transition-all"
            title="Profile"
          >
            <User size={14} className="text-white" strokeWidth={2} />
          </button>
          {showProfile && <ProfileMenu onClose={() => setShowProfile(false)} />}
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
