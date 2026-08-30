import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, Pause, Play, Activity } from 'lucide-react';
import { useEngineStore } from '../store/useEngineStore';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts';

const METRICS = [
  { key:'rpm',          label:'RPM',           color:'#FF6B35', unit:'RPM' },
  { key:'cht',          label:'CHT',            color:'#EF4444', unit:'°C'  },
  { key:'egt',          label:'EGT',            color:'#F59E0B', unit:'°C'  },
  { key:'oil_pressure', label:'Oil Pressure',   color:'#8B5CF6', unit:'kPa' },
  { key:'oil_temp',     label:'Oil Temp',       color:'#EC4899', unit:'°C'  },
  { key:'vibration',    label:'Vibration',      color:'#22C55E', unit:'g'   },
];

const RAW_FIELDS = [
  { key:'rpm',          label:'Engine Speed',    unit:'RPM' },
  { key:'cht',          label:'CHT',             unit:'°C'  },
  { key:'egt',          label:'EGT',             unit:'°C'  },
  { key:'oil_pressure', label:'Oil Pressure',    unit:'kPa' },
  { key:'oil_temp',     label:'Oil Temp',        unit:'°C'  },
  { key:'fuel_flow',    label:'Fuel Flow',       unit:'L/h' },
  { key:'map',          label:'MAP',             unit:'kPa' },
  { key:'vibration',    label:'Vibration',       unit:'g'   },
  { key:'voltage',      label:'Voltage',         unit:'V'   },
  { key:'altitude',     label:'Altitude',        unit:'m'   },
  { key:'afr',          label:'Air-Fuel Ratio',  unit:':1'  },
  { key:'ambient_temp', label:'Ambient Temp',    unit:'°C'  },
];

const Telemetry = () => {
  const telemetry     = useEngineStore(s => s.telemetry);
  const history       = useEngineStore(s => s.history);
  const wsConnected   = useEngineStore(s => s.wsConnected);
  const streamPaused  = useEngineStore(s => s.streamPaused);
  const pauseStream   = useEngineStore(s => s.pauseStream);
  const resumeStream  = useEngineStore(s => s.resumeStream);
  const [active, setActive] = useState(['rpm', 'egt', 'vibration']);

  const toggle = (key) => setActive(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* Status bar */}
      <div className="card border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Activity size={18} className="text-orange-500" />
          <div>
            <p className="text-sm font-bold text-gray-800">Live Telemetry Feed</p>
            <p className="text-xs text-gray-400">WebSocket stream · ROTAX-MALE-009</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold
            ${wsConnected ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            {wsConnected ? <Wifi size={13}/> : <WifiOff size={13}/>}
            {wsConnected ? 'Connected' : 'Simulated Mock'}
          </div>
          <button
            onClick={streamPaused ? resumeStream : pauseStream}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all
              ${streamPaused ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
          >
            {streamPaused ? <><Play size={12}/> Resume</> : <><Pause size={12}/> Pause</>}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="card border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800">Multi-Parameter Chart</h3>
          <div className="flex flex-wrap gap-1.5">
            {METRICS.map(m => (
              <button key={m.key} onClick={() => toggle(m.key)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all
                  ${active.includes(m.key) ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'}`}
                style={active.includes(m.key) ? { background: m.color, borderColor: m.color } : {}}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="time" tick={{ fill:'#9CA3AF', fontSize:9 }} stroke="#F3F4F6" tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill:'#9CA3AF', fontSize:9 }} stroke="#F3F4F6" tickLine={false} />
              <Tooltip contentStyle={{ borderRadius:12, border:'1px solid #E5E7EB', fontSize:11 }} />
              <Legend wrapperStyle={{ fontSize:10 }} />
              {METRICS.filter(m => active.includes(m.key)).map(m => (
                <Line key={m.key} type="monotone" dataKey={m.key} name={m.label}
                  stroke={m.color} strokeWidth={2} dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Raw values table */}
      <div className="card border border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Current Raw Values</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {RAW_FIELDS.map(f => {
            const val = telemetry[f.key];
            return (
              <div key={f.key} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="label-xs mb-1">{f.label}</p>
                <p className="text-lg font-extrabold text-gray-900">
                  {typeof val === 'number' ? (val < 10 ? val.toFixed(2) : Math.round(val)) : '—'}
                  <span className="text-xs font-normal text-gray-400 ml-1">{f.unit}</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default Telemetry;
