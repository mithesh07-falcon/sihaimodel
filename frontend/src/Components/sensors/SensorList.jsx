import React from 'react';
import { Thermometer, Gauge, Droplet, Activity, Zap, Wind } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { useEngineStore } from '../../store/useEngineStore';

const SENSORS = [
  { key:'egt',          label:'EGT',           unit:'°C',      icon:Thermometer, warnHigh:870,  critHigh:910 },
  { key:'rpm',          label:'RPM',            unit:'RPM',     icon:Gauge,       warnHigh:5200, critHigh:5600 },
  { key:'oil_pressure', label:'Oil Pressure',   unit:'kPa',     icon:Droplet,     warnLow:280,   critLow:200 },
  { key:'oil_temp',     label:'Oil Temp',       unit:'°C',      icon:Thermometer, warnHigh:110,  critHigh:125 },
  { key:'vibration',    label:'Vibration',      unit:'g RMS',   icon:Activity,    warnHigh:2.0,  critHigh:3.0 },
  { key:'fuel_flow',    label:'Fuel Flow',      unit:'L/h',     icon:Wind,        warnLow:10,    critLow:6 },
];

function getSensorStatus(key, val, cfg) {
  const { warnHigh, critHigh, warnLow, critLow } = cfg;
  if ((critHigh != null && val > critHigh) || (critLow != null && val < critLow)) return 'critical';
  if ((warnHigh != null && val > warnHigh) || (warnLow != null && val < warnLow)) return 'warning';
  return 'healthy';
}

const dotClass = { healthy:'dot-healthy', warning:'dot-warning', critical:'dot-critical' };
const valClass  = { healthy:'text-gray-800', warning:'text-amber-600 font-bold', critical:'text-red-600 font-bold' };

const SensorList = () => {
  const telemetry = useEngineStore(s => s.telemetry);
  const history   = useEngineStore(s => s.history);

  return (
    <div className="card h-full flex flex-col border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 text-sm">Sensor Overview</h3>
        <span className="label-xs">Live</span>
      </div>

      <div className="space-y-2 flex-1">
        {SENSORS.map(cfg => {
          const { key, label, unit, icon: Icon } = cfg;
          const val    = telemetry[key] ?? 0;
          const status = getSensorStatus(key, val, cfg);
          const sparkData = history.map(h => ({ v: h[key] ?? 0 }));
          const strokeColor = status === 'critical' ? '#EF4444' : status === 'warning' ? '#F59E0B' : '#22C55E';

          return (
            <div key={key} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              {/* Icon */}
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Icon size={13} className="text-gray-500" strokeWidth={1.8} />
              </div>

              {/* Name + value */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 leading-none">{label}</p>
                <p className={`text-sm mt-0.5 leading-none ${valClass[status]}`}>
                  {typeof val === 'number' ? (val < 10 ? val.toFixed(1) : Math.round(val)) : '—'}
                  <span className="text-xs text-gray-400 font-normal ml-0.5">{unit}</span>
                </p>
              </div>

              {/* Sparkline */}
              <div className="w-16 h-7 shrink-0">
                {sparkData.length > 1 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparkData}>
                      <Line type="monotone" dataKey="v" stroke={strokeColor}
                        strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Status dot */}
              <span className={dotClass[status]} />
            </div>
          );
        })}
      </div>

      <button className="mt-4 text-xs text-orange-500 font-semibold hover:text-orange-600 transition-colors text-left">
        View all sensors →
      </button>
    </div>
  );
};

export default SensorList;
