import React, { useState } from 'react';
import { Home, Radio, BarChart3, ClipboardList, Settings, Bell, User, Cpu } from 'lucide-react';

const NAV = [
  { icon: Home,          label: 'Overview',     active: true  },
  { icon: Cpu,           label: 'Digital Twin', active: false },
  { icon: Radio,         label: 'Telemetry',    active: false },
  { icon: BarChart3,     label: 'Data Logs',    active: false },
  { icon: ClipboardList, label: 'Maintenance',  active: false },
  { icon: Settings,      label: 'Settings',     active: false },
];

const Sidebar = () => {
  const [active, setActive] = useState(0);

  return (
    <nav className="flex flex-col items-center justify-between py-4 px-2 bg-neutral-900 rounded-3xl h-full w-14 shrink-0 shadow-card-lg">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-md">
          <span className="text-white font-black text-sm">AT</span>
        </div>

        {/* Nav icons */}
        <div className="flex flex-col items-center gap-1 mt-2">
          {NAV.map((item, i) => {
            const Icon = item.icon;
            const isActive = i === active;
            return (
              <button
                key={i}
                title={item.label}
                onClick={() => setActive(i)}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`}
              >
                <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} />
                {/* Tooltip */}
                <span className="absolute left-full ml-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom: bell + avatar */}
      <div className="flex flex-col items-center gap-2">
        <button className="w-10 h-10 rounded-2xl flex items-center justify-center text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all relative">
          <Bell size={17} strokeWidth={1.8} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
          <User size={14} className="text-white" strokeWidth={2} />
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
