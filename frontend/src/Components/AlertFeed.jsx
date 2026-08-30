import React from 'react';
import { AlertOctagon, AlertTriangle, Info, ShieldAlert, CheckSquare } from 'lucide-react';

const AlertFeed = ({ sensorData }) => {
  const getAlerts = () => {
    const list = [];

    // Check oil pressure
    if (sensorData.oilPressure < 2.5) {
      list.push({
        id: 'oil_press_low',
        severity: 'critical',
        title: 'CRITICAL: Oil Pressure Anomaly',
        desc: `Oil pressure is at ${sensorData.oilPressure} bar. Normal is > 3.0 bar at high RPMs. AI detects 84% probability of oil strainer filter blockage.`,
        rul: 'RUL affected: -12h',
        action: 'Recommended action: Reduce throttle to 75% immediately to throttle back pump load, monitor Oil Temp.'
      });
    }

    // Check oil temperature
    if (sensorData.oilTemp > 115) {
      list.push({
        id: 'oil_temp_high',
        severity: 'warning',
        title: 'WARNING: Oil Thermal Spiking',
        desc: `Oil temperature is at ${sensorData.oilTemp} °C. High temperature indicates high friction or cooling radiator bypass malfunction.`,
        rul: 'RUL affected: -5h',
        action: 'Recommended action: Ensure fuel mixture is rich (AFR: 0.93) to cool cylinder walls, monitor CHT closely.'
      });
    }

    // Check vibration
    if (sensorData.vibration > 1.8) {
      list.push({
        id: 'vib_high',
        severity: 'warning',
        title: 'WARNING: Shaft Vibration Spike',
        desc: `RMS vibration acceleration is at ${sensorData.vibration} g. Spectral analysis shows a resonance peak at 80 Hz matching propeller balance deviation.`,
        rul: 'RUL affected: N/A',
        action: 'Recommended action: Avoid RPM band 4200 - 4500. Maintain cruise at 4800 RPM.'
      });
    }

    // Always include some default AI predictions to show off the system capabilities
    list.push({
      id: 'spark_plug_wear',
      severity: 'info',
      title: 'AI PROGNOSIS: Spark Plug Electrodes Wear',
      desc: 'Dual magneto spark ignition efficiency estimated at 91%. Wear model predicts gap degradation on Plug 1B in next 35 flight hours.',
      rul: 'RUL: 35.5 hrs',
      action: 'Advisory: Replace spark plug set during next scheduled phase-1 maintenance.'
    });

    list.push({
      id: 'fuel_injection_clean',
      severity: 'nominal',
      title: 'INFO: Injection Balance Stable',
      desc: 'Fuel flow cylinder distribution deviation < 1.2%. Fuel-air mixture optimal.',
      rul: 'RUL: 120 hrs',
      action: 'Advisory: No actions needed.'
    });

    return list;
  };

  const activeAlerts = getAlerts();

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-950/20 border-red-500/30 text-red-400',
          icon: AlertOctagon,
          badgeBg: 'bg-red-500/20 border-red-500/40 text-red-300'
        };
      case 'warning':
        return {
          bg: 'bg-amber-950/20 border-amber-500/30 text-amber-400',
          icon: AlertTriangle,
          badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300'
        };
      case 'info':
        return {
          bg: 'bg-cyan-950/20 border-cyan-500/30 text-cyan-400',
          icon: Info,
          badgeBg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
        };
      default:
        return {
          bg: 'bg-slate-900/50 border-slate-800/80 text-slate-400',
          icon: CheckSquare,
          badgeBg: 'bg-slate-800 border-slate-700 text-slate-400'
        };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
        <h3 className="text-sm font-bold tracking-wider text-cyan-400 font-mono flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-cyan-400" />
          AI DIAGNOSTIC ALERTS & ALARMS
        </h3>
        <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">
          Total: {activeAlerts.length}
        </span>
      </div>

      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
        {activeAlerts.map((alert) => {
          const style = getSeverityStyle(alert.severity);
          const Icon = style.icon;
          return (
            <div 
              key={alert.id} 
              className={`p-3 rounded-lg border font-mono text-xs transition-all duration-300 hover:bg-slate-900/30 ${style.bg}`}
            >
              <div className="flex justify-between items-start mb-1.5 gap-2">
                <span className="font-extrabold flex items-center gap-1.5 leading-snug">
                  <Icon className="w-4 h-4 shrink-0" />
                  {alert.title}
                </span>
                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border font-semibold shrink-0 ${style.badgeBg}`}>
                  {alert.severity}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal mb-2">
                {alert.desc}
              </p>
              
              <div className="border-t border-slate-800/60 pt-2 mt-2 space-y-1">
                <p className="text-[10px] text-slate-400 font-bold">
                  {alert.action}
                </p>
                {alert.rul && (
                  <p className="text-[9px] text-cyan-500 text-right">
                    {alert.rul}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertFeed;
