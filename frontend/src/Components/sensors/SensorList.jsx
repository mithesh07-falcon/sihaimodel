import React from 'react';
import { Thermometer, Gauge, Droplet, Activity, Zap, Wind, Flame } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { useEngineStore } from '../../store/useEngineStore';

// All sensors per SIH spec
const SENSORS = [
  { key:'rpm',          label:'RPM',           unit:'RPM',   icon:Gauge,       warnHigh:5200,  critHigh:5500,  normalRange:'2500–5500', decimals:0 },
  { key:'cht',          label:'CHT',            unit:'°C',    icon:Thermometer, warnHigh:125,   critHigh:135,   normalRange:'90–180',    decimals:1 },
  { key:'egt',          label:'EGT',            unit:'°C',    icon:Flame,       warnHigh:870,   critHigh:910,   normalRange:'600–850',   decimals:0 },
  { key:'oil_temp',     label:'Oil Temp',       unit:'°C',    icon:Thermometer, warnHigh:110,   critHigh:120,   normalRange:'80–120',    decimals:1 },
  { key:'oil_pressure', label:'Oil Pressure',   unit:'kPa',   icon:Droplet,     warnLow:280,    critLow:200,    normalRange:'3–6 bar',   decimals:0 },
  { key:'fuel_flow',    label:'Fuel Flow',      unit:'L/h',   icon:Wind,        warnLow:10,     critLow:6,      normalRange:'—',         decimals:1 },
  { key:'vibration',    label:'Vibration',      unit:'mm/s',  icon:Activity,    warnHigh:2.0,   critHigh:3.0,   normalRange:'0.5–3',     decimals:2 },
  { key:'map',          label:'MAP',            unit:'kPa',   icon:Gauge,       warnLow:60,     critLow:40,     normalRange:'—',         decimals:0 },
  { key:'afr',          label:'AFR',            unit:':1',    icon:Zap,         warnHigh:15.5,  critHigh:16.5,  normalRange:'14–15',     decimals:1 },
];

function getSensorStatus(val, cfg) {
  const { warnHigh, critHigh, warnLow, critLow } = cfg;
  if ((critHigh != null && val > critHigh) || (critLow != null && val < critLow)) return 'critical';
  if ((warnHigh != null && val > warnHigh) || (warnLow != null && val < warnLow)) return 'warning';
  return 'healthy';
}

const dotCls  = { healthy:'dot-healthy', warning:'dot-warning', critical:'dot-critical' };
const valCls  = { healthy:'text-gray-800', warning:'text-amber-600 font-bold', critical:'text-red-600 font-bold animate-pulse' };

const SensorList = () => {
  const telemetry    = useEngineStore(s => s.telemetry);
  const history      = useEngineStore(s => s.history);
  const engineRunning = useEngineStore(s => s.engineRunning);

  return (
    <div className="space-y-0.5">
      {SENSORS.map(cfg => {
        const { key, label, unit, icon: Icon, decimals = 1, normalRange } = cfg;
        const val    = telemetry[key] ?? 0;
        const status = engineRunning ? getSensorStatus(val, cfg) : 'healthy';
        const sparkData = history.map(h => ({ v: h[key] ?? 0 }));
        const stroke = status === 'critical' ? '#EF4444' : status === 'warning' ? '#F59E0B' : '#22C55E';
        const displayVal = typeof val === 'number'
          ? (val < 10 ? val.toFixed(decimals) : decimals === 0 ? Math.round(val) : val.toFixed(decimals))
          : '—';

        return (
          <div key={key}
            className={`flex items-center gap-2 px-2 py-2 rounded-xl transition-all duration-300
              ${status === 'critical' ? 'bg-red-50' : status === 'warning' ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0
              ${status === 'critical' ? 'bg-red-100' : status === 'warning' ? 'bg-amber-100' : 'bg-gray-100'}`}>
              <Icon size={11} className={
                status === 'critical' ? 'text-red-500' : status === 'warning' ? 'text-amber-500' : 'text-gray-500'
              } strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-600 leading-none">{label}</p>
              <p className={`text-sm mt-0.5 leading-none tabular-nums ${valCls[status]}`}>
                {engineRunning ? displayVal : '—'}
                <span className="text-[9px] text-gray-400 font-normal ml-0.5">{unit}</span>
              </p>
            </div>
            <div className="w-12 h-6 shrink-0">
              {sparkData.length > 1 && engineRunning && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkData}>
                    <Line type="monotone" dataKey="v" stroke={stroke}
                      strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <span className={dotCls[status]} />
          </div>
        );
      })}
      <div className="mt-2 px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-[9px] text-gray-400 text-center">⚡ SIMULATED SENSOR DATA · 50 Hz virtual sampling</p>
      </div>
    </div>
  );
};

export default SensorList;
