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
  const streamConnected = useEngineStore(s => s.streamConnected);
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
      <div className="card border-slate-700/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Activity size={18} className="text-orange-500" />
          <div>
            <p className="text-sm font-bold text-slate-100">Live Telemetry Feed</p>
            <p className="text-xs text-slate-400">Stream Source: virtualengine.vercel.app</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold
            ${streamConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
            {streamConnected ? <Wifi size={13}/> : <WifiOff size={13}/>}
            {streamConnected ? 'Live Virtual Stream Connected' : 'Standby / Disconnected'}
          </div>
          <button
            onClick={streamPaused ? resumeStream : pauseStream}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all
              ${streamPaused ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
          >
            {streamPaused ? <><Play size={12}/> Resume</> : <><Pause size={12}/> Pause</>}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="card border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-100">Multi-Parameter Chart</h3>
          <div className="flex flex-wrap gap-1.5">
            {METRICS.map(m => (
              <button key={m.key} onClick={() => toggle(m.key)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all
                  ${active.includes(m.key) ? 'text-white border-transparent' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" tick={{ fill:'#64748b', fontSize:9 }} stroke="#1e293b" tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill:'#64748b', fontSize:9 }} stroke="#1e293b" tickLine={false} />
              <Tooltip contentStyle={{ borderRadius:12, backgroundColor: '#0f172a', border:'1px solid #334155', color: '#f8fafc', fontSize:11 }} />
              <Legend wrapperStyle={{ fontSize:10, color: '#94a3b8' }} />
              {METRICS.filter(m => active.includes(m.key)).map(m => (
                <Line key={m.key} type="monotone" dataKey={m.key} name={m.label}
                  stroke={m.color} strokeWidth={2} dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Raw values table */}
      <div className="card border-slate-700/50">
        <h3 className="text-sm font-bold text-slate-100 mb-4">Current Raw Values</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {RAW_FIELDS.map(f => {
            const val = telemetry[f.key];
            return (
              <div key={f.key} className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
                <p className="label-xs mb-1">{f.label}</p>
                <p className="text-lg font-extrabold text-slate-100">
                  {typeof val === 'number' ? (val < 10 ? val.toFixed(2) : Math.round(val)) : '—'}
                  <span className="text-xs font-normal text-slate-500 ml-1">{f.unit}</span>
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
