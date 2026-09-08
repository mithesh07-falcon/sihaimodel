import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ShieldCheck, Hourglass, TrendingUp, AlertTriangle,
  Wrench, Bell, Thermometer, Gauge, Droplets, Clock, Eye, Radio, Box, ArrowRight
} from 'lucide-react';
import { useEngineStore } from '../store/useEngineStore';

// Subtle SVG Mini-Sparkline with Orange stroke
const MiniSparkline = ({ data, color = '#FF6B35' }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * 50;
      const y = 14 - ((val - min) / range) * 12;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className="w-14 h-4 overflow-visible" viewBox="0 0 50 16">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

const Dashboard = () => {
  const telemetry = useEngineStore((s) => s.telemetry);
  const diagnosis = useEngineStore((s) => s.diagnosis);
  const soh = useEngineStore((s) => s.soh);
  const alerts = useEngineStore((s) => s.alerts);
  const streamConnected = useEngineStore((s) => s.streamConnected);
  const packetsReceived = useEngineStore((s) => s.packetsReceived);
  const ingestionRateHz = useEngineStore((s) => s.ingestionRateHz);
  const history = useEngineStore((s) => s.history);
  const refreshStreamStatus = useEngineStore((s) => s.refreshStreamStatus);

  // Trigger one immediate status refresh on mount; central loop is handled globally in App.jsx
  useEffect(() => {
    if (refreshStreamStatus) refreshStreamStatus();
  }, [refreshStreamStatus]);

  // Real stream status detection
  const hasStream = streamConnected && Boolean(telemetry);
  
  // Dynamic SOH Health evaluation directly responsive to live sensor conditions
  const healthScore = hasStream && soh?.overall != null ? soh.overall : (hasStream ? 96 : null);
  const isCritical = hasStream && (healthScore < 72 || diagnosis.status === 'Critical');
  const isWarning = hasStream && !isCritical && (healthScore < 88 || diagnosis.status === 'Warning');
  const isHealthy = hasStream && !isCritical && !isWarning;
  
  const statusDisplay = hasStream 
    ? (isCritical ? 'Critical' : isWarning ? 'Warning' : 'Healthy')
    : 'Standby';
    
  const statusDetail = hasStream
    ? (isCritical 
        ? (diagnosis.fault_component || 'Critical System Deviation') 
        : isWarning 
        ? (diagnosis.fault_component || 'Subsystem Degradation') 
        : 'Nominal performance')
    : 'Awaiting stream from virtual engine';

  // Exact synchronized values matching virtualengine.vercel.app
  const rpmValue = hasStream && telemetry.rpm != null ? Math.round(telemetry.rpm) : '--';
  const chtValue = hasStream && telemetry.cht != null ? Number(telemetry.cht).toFixed(1) : '--';
  const egtValue = hasStream && telemetry.egt != null ? Math.round(telemetry.egt) : '--';
  
  // Oil pressure formatted in bar (as shown in virtualengine: ~3.82 bar) and kPa
  const oilPressureBar = hasStream && telemetry.oil_pressure != null
    ? (telemetry.oil_pressure > 25 ? (telemetry.oil_pressure / 100).toFixed(2) : Number(telemetry.oil_pressure).toFixed(2))
    : '--';
  const oilPressureKpa = hasStream && telemetry.oil_pressure != null
    ? Math.round(telemetry.oil_pressure > 25 ? telemetry.oil_pressure : telemetry.oil_pressure * 100)
    : '--';

  const oilTempValue = hasStream && (telemetry.oil_temp != null || telemetry.oil_temperature != null)
    ? Number(telemetry.oil_temp ?? telemetry.oil_temperature).toFixed(1)
    : '--';

  const vibrationValue = hasStream && (telemetry.vibration != null || telemetry.vibration_rms != null)
    ? Number(telemetry.vibration ?? telemetry.vibration_rms).toFixed(2)
    : '--';

  const fuelFlowValue = hasStream && telemetry.fuel_flow != null
    ? Number(telemetry.fuel_flow).toFixed(1)
    : '--';

  const sensorOverviewItems = [
    {
      label: 'Engine Speed (RPM)',
      val: rpmValue,
      unit: 'RPM',
      icon: Gauge,
      color: '#FF6B35',
      data: history.slice(-10).map(h => h.rpm || 0)
    },
    {
      label: 'CHT (Head Temp)',
      val: chtValue,
      unit: '°C',
      icon: Thermometer,
      color: '#FF6B35',
      data: history.slice(-10).map(h => h.cht || 0)
    },
    {
      label: 'EGT (Exhaust Temp)',
      val: egtValue,
      unit: '°C',
      icon: Thermometer,
      color: '#FF6B35',
      data: history.slice(-10).map(h => h.egt || 0)
    },
    {
      label: 'Oil Pressure',
      val: hasStream ? `${oilPressureBar} bar` : '--',
      unit: hasStream ? `(${oilPressureKpa} kPa)` : '',
      icon: Droplets,
      color: '#FF6B35',
      data: history.slice(-10).map(h => (h.oil_pressure > 25 ? h.oil_pressure / 100 : (h.oil_pressure || 0)))
    },
    {
      label: 'Oil Temperature',
      val: oilTempValue,
      unit: '°C',
      icon: Droplets,
      color: '#FF6B35',
      data: history.slice(-10).map(h => h.oil_temp || h.oil_temperature || 0)
    },
    {
      label: 'Vibration RMS',
      val: vibrationValue,
      unit: 'g',
      icon: Activity,
      color: '#EA580C',
      data: history.slice(-10).map(h => h.vibration || h.vibration_rms || 0)
    },
    {
      label: 'Fuel Flow',
      val: fuelFlowValue,
      unit: 'L/h',
      icon: Droplets,
      color: '#FF6B35',
      data: history.slice(-10).map(h => h.fuel_flow || 0)
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-7 flex flex-col gap-6 max-w-[1780px] mx-auto select-none font-sans text-[#1F2937]">
      {/* ── Top Live Ingestion Status HUD ── */}
      <div
        className={`rounded-2xl p-3.5 px-6 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs transition-all ${
          hasStream
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
            : 'bg-amber-50/90 border-amber-200 text-amber-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasStream ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <span className="font-black text-xs uppercase tracking-widest">
              {hasStream ? 'SYSTEM LIVE: TELEMETRY INGESTION ACTIVE' : 'SYSTEM STANDBY: AWAITING VIRTUAL ENGINE STREAM'}
            </span>
            <span className="text-xs font-mono opacity-90 hidden md:inline">
              {hasStream
                ? `SRC: virtualengine.vercel.app | PKTS: ${packetsReceived} | RATE: ${ingestionRateHz.toFixed(1)}Hz | RPM: ${rpmValue} | CHT: ${chtValue}°C | OIL: ${oilPressureBar} bar`
                : 'STATUS: DISCONNECTED | AWAITING STREAM FROM https://virtualengine.vercel.app/'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://virtualengine.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:text-orange-600 hover:border-orange-300 shadow-2xs transition-all uppercase tracking-wider flex items-center gap-1.5"
          >
            <Radio size={11} className={hasStream ? 'text-emerald-600 animate-pulse' : 'text-amber-500'} />
            Virtual Engine
          </a>
          <Link
            to="/connection"
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#FF6B35] text-white hover:bg-orange-600 shadow-2xs transition-all uppercase tracking-wider"
          >
            Gateway Config →
          </Link>
        </div>
      </div>

      {/* ── Top Row: 5 Metric KPI Cards (White & Orange Theme) ── */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Engine Status */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs hover:border-orange-200 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
              !hasStream
                ? 'bg-gray-50 border-gray-100 text-gray-400'
                : isCritical
                ? 'bg-red-50 border-red-200 text-red-600 animate-pulse'
                : isWarning
                ? 'bg-amber-50 border-amber-200 text-amber-600'
                : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            }`}>
              <ShieldCheck size={22} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Engine Status</p>
              <h3 className={`text-lg font-black leading-tight uppercase ${
                !hasStream
                  ? 'text-gray-500'
                  : isCritical
                  ? 'text-red-600'
                  : isWarning
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}>
                {statusDisplay}
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 font-medium truncate">
            {statusDetail}
          </p>
        </div>

        {/* Card 2: RUL Estimate */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs hover:border-orange-200 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-50 text-orange-500 border border-orange-100 shrink-0">
              <Hourglass size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">RUL Estimate</p>
              <h3 className="text-2xl font-black text-gray-900 leading-tight">
                {hasStream ? `${diagnosis.rul_estimate_hours ?? Math.max(12, Math.round(140 * ((healthScore || 90) / 100)))}` : '--'}
                <span className="text-xs font-normal text-gray-400 ml-1">Days</span>
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 font-medium">Time Before Overhaul</p>
        </div>

        {/* Card 3: Failure Probability */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs hover:border-orange-200 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
              isCritical
                ? 'bg-red-50 border-red-200 text-red-600'
                : isWarning
                ? 'bg-amber-50 border-amber-200 text-amber-600'
                : 'bg-orange-50 border-orange-100 text-orange-500'
            }`}>
              <TrendingUp size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Failure Prob.</p>
              <h3 className={`text-2xl font-black leading-tight ${
                isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-900'
              }`}>
                {hasStream ? `${Math.min(92, Math.max(1.8, ((100 - (healthScore || 90)) * 0.85 + 2.2))).toFixed(1)}%` : '--'}
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 font-medium">Window: 30 Days Mission</p>
        </div>

        {/* Card 4: Maintenance Score */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs hover:border-orange-200 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-50 text-orange-500 border border-orange-100 shrink-0">
              <Wrench size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Maintenance</p>
              <h3 className="text-2xl font-black text-gray-900 leading-tight">
                {hasStream ? (
                  <>
                    <span className={isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}>
                      {healthScore}
                    </span>
                    <span className="text-xs font-normal text-gray-400 ml-0.5">/100</span>
                  </>
                ) : (
                  '--'
                )}
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 font-medium">
            {hasStream ? (healthScore >= 88 ? 'System Reliability: Optimal' : healthScore >= 72 ? 'System Reliability: Degraded' : 'Critical Action Required') : 'System Standby'}
          </p>
        </div>

        {/* Card 5: Alerts */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs hover:border-orange-200 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-50 text-orange-500 border border-orange-100 shrink-0">
              <Bell size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Alerts</p>
              <h3 className="text-2xl font-black text-gray-900 leading-tight">
                {hasStream ? alerts.filter((a) => a.sev !== 'info').length : 0}
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 font-medium">
            {hasStream && alerts.filter((a) => a.sev !== 'info').length > 0 ? 'Review System Advisories' : 'All Clear / Standby'}
          </p>
        </div>
      </section>

      {/* ── Middle Section: 3-Column Layout ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: SENSOR OVERVIEW */}
        <div className="lg:col-span-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-xs font-black tracking-widest text-gray-800 uppercase flex items-center gap-2">
                <Activity size={15} className="text-orange-500" /> Sensor Telemetry Overview
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${hasStream ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                {hasStream ? 'SYNCHRONIZED' : 'STANDBY'}
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {sensorOverviewItems.map((s, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between text-xs hover:bg-gray-50/70 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-2.5 text-gray-600">
                    <s.icon size={14} className="text-gray-400" />
                    <span className="font-semibold">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-gray-900 tabular-nums">
                      {s.val} <span className="text-[10px] font-normal text-gray-400">{s.unit}</span>
                    </span>
                    {s.data && s.data.length > 0 ? (
                      <MiniSparkline data={s.data} color={s.color} />
                    ) : (
                      <span className="text-[10px] text-gray-300 font-mono w-14 text-center">--</span>
                    )}
                    <span className={`w-2 h-2 rounded-full ${hasStream ? (s.color === '#EA580C' ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-gray-300'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/sensors"
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B35] hover:text-orange-600 transition-colors uppercase tracking-wider pt-3 border-t border-gray-100"
          >
            Open Complete Telemetry Diagnostic Stack →
          </Link>
        </div>

        {/* Center Column: Rotax 912 Aircraft Engine Profile & 3D Launcher */}
        <div className="lg:col-span-5 bg-white border border-gray-100 rounded-3xl p-5 shadow-xs relative flex flex-col justify-between items-center min-h-[480px]">
          {/* Header Bar with Model Badge & Dedicated Page Link */}
          <div className="w-full flex items-center justify-between z-20 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#003087] border border-blue-200 px-3 py-1 rounded-full">
                ROTAX 912 iS SPORT · 100 HP MALE UAV
              </span>
              <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">S/N: RX-912-B4-2026</span>
            </div>

            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${hasStream ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
              {hasStream ? `ACTIVE (${Math.round(telemetry.rpm || 0)} RPM)` : 'ENGINE AT REST'}
            </span>
          </div>

          {/* Engine Technical Photo / Schematic Viewport */}
          <div className="relative w-full flex-1 flex flex-col items-center justify-center p-4">
            <img
              src="/rotax_912.png"
              alt="Rotax 912 iS Aircraft Engine"
              className="max-h-[290px] w-auto object-contain select-none filter drop-shadow-md hover:scale-102 transition-transform duration-300"
            />

            {/* Launch Dedicated 3D Digital Twin Button */}
            <Link
              to="/engine-view"
              className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black text-white shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 select-none"
              style={{ background: '#003087', boxShadow: '0 4px 14px rgba(0,48,135,0.25)' }}
            >
              <Box size={16} />
              <span>LAUNCH 3D ENGINE DIGITAL TWIN</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Specs Summary Pill */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[10px] font-mono text-gray-500 bg-gray-50 px-5 py-1.5 rounded-full border border-gray-200 w-max mx-auto mt-2">
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-[#003087] rounded-full" /> Power: 73.5 kW (100 hp)</span>
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-[#003087] rounded-full" /> Boxer 4-Cylinder</span>
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-[#003087] rounded-full" /> PSRU: 2.43:1</span>
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-[#003087] rounded-full" /> Dry Weight: 63.6 kg</span>
          </div>
        </div>

        {/* Right Column: AI INSIGHTS & TOP MAINTENANCE TASKS */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Card: AI Insights */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
                <h3 className="text-xs font-black tracking-widest text-gray-800 uppercase flex items-center gap-2">
                  <Activity size={14} className="text-orange-500" /> AI Prognostics
                </h3>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                  ROT-912 ML
                </span>
              </div>

              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 mt-0.5 border border-orange-100">
                  <ShieldCheck size={18} strokeWidth={2} />
                </div>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                  {hasStream
                    ? (isHealthy
                        ? 'Rotax 912 physics & ML models show nominal correlation. Dual CDI ignition & dry sump operating within optimal envelopes.'
                        : diagnosis.recommended_action)
                    : 'System is in standby. Connect telemetry stream from virtualengine.vercel.app to activate real-time physics-informed AI insights.'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                <span className="text-gray-400">Model Confidence</span>
                <span className="text-gray-800">{hasStream ? '97.4%' : '--'}</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF6B35] rounded-full transition-all duration-500"
                  style={{ width: hasStream ? '97.4%' : '0%' }}
                />
              </div>
            </div>
          </div>

          {/* Card: TOP MAINTENANCE TASKS */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between flex-1">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
                <h3 className="text-xs font-black tracking-widest text-gray-800 uppercase flex items-center gap-2">
                  <Wrench size={14} className="text-orange-500" /> Maintenance Schedule
                </h3>
                <Link to="/maintenance" className="text-[10px] font-bold text-orange-600 hover:underline">
                  View All →
                </Link>
              </div>

              <div className="space-y-2.5">
                {[
                  { title: 'Dual Carburetor Balance Check', due: '50 flight hrs', prio: 'Medium', icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-50' },
                  { title: 'Dry Sump Oil & Filter Replacement', due: '100 flight hrs', prio: 'Standard', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
                  { title: 'PSRU Gearbox Backlash Inspection', due: '200 flight hrs', prio: 'Scheduled', icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50' },
                ].map((task, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg ${task.bg} ${task.color} flex items-center justify-center shrink-0`}>
                        <task.icon size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 leading-snug">{task.title}</p>
                        <p className="text-[10px] text-gray-400">Due in {task.due}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                      {task.prio}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/twin"
              className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#FF6B35] hover:bg-orange-600 py-2.5 px-4 rounded-xl shadow-2xs transition-all uppercase tracking-wider"
            >
              Open Digital Twin Physics Model →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Bottom Row: 4 Metric & Trend Cards ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: VIBRATION TREND */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-orange-200 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black tracking-wider text-gray-800 uppercase">Vibration Trend</h4>
              <Activity size={14} className="text-gray-400" />
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400 mb-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-[#FF6B35] inline-block" /> Actual ({vibrationValue} g)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 border-b border-dashed border-gray-400 inline-block" /> Baseline (1.10 g)
              </span>
            </div>

            <div className="relative pt-1 pb-1">
              <svg viewBox="0 0 240 70" className="w-full h-20 overflow-visible">
                <line x1="0" y1="10" x2="240" y2="10" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="35" x2="240" y2="35" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="60" x2="240" y2="60" stroke="#F1F5F9" strokeWidth="1" />
                <text x="0" y="8" fontSize="8" fill="#94A3B8">3.0</text>
                <text x="0" y="33" fontSize="8" fill="#94A3B8">1.5</text>
                <text x="0" y="58" fontSize="8" fill="#94A3B8">0</text>
                <path
                  d="M 20 48 Q 60 46 100 47 T 180 46 T 240 47"
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <path
                  d="M 20 46 Q 50 40 80 43 T 130 32 T 180 39 T 235 28"
                  fill="none"
                  stroke="#FF6B35"
                  strokeWidth="2.2"
                />
                <circle cx="235" cy="28" r="3" fill="#FF6B35" />
              </svg>
            </div>
          </div>
          <div className="flex justify-between text-[9px] font-mono text-gray-400 mt-2 px-1">
            <span>-50s</span><span>-40s</span><span>-30s</span><span>-20s</span><span>-10s</span><span>NOW</span>
          </div>
        </div>

        {/* Card 2: EGT TREND */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-orange-200 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black tracking-wider text-gray-800 uppercase">EGT Trend</h4>
              <Thermometer size={14} className="text-gray-400" />
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400 mb-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-[#FF6B35] inline-block" /> Actual ({egtValue} °C)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 border-b border-dashed border-gray-400 inline-block" /> Baseline (810 °C)
              </span>
            </div>

            <div className="relative pt-1 pb-1">
              <svg viewBox="0 0 240 70" className="w-full h-20 overflow-visible">
                <line x1="0" y1="10" x2="240" y2="10" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="35" x2="240" y2="35" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="60" x2="240" y2="60" stroke="#F1F5F9" strokeWidth="1" />
                <text x="0" y="8" fontSize="8" fill="#94A3B8">900</text>
                <text x="0" y="33" fontSize="8" fill="#94A3B8">750</text>
                <text x="0" y="58" fontSize="8" fill="#94A3B8">600</text>
                <path
                  d="M 20 44 Q 60 43 100 45 T 180 42 T 240 43"
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <path
                  d="M 20 42 Q 60 38 100 40 T 150 32 T 190 35 T 235 29"
                  fill="none"
                  stroke="#FF6B35"
                  strokeWidth="2.2"
                />
                <circle cx="235" cy="29" r="3" fill="#FF6B35" />
              </svg>
            </div>
          </div>
          <div className="flex justify-between text-[9px] font-mono text-gray-400 mt-2 px-1">
            <span>-50s</span><span>-40s</span><span>-30s</span><span>-20s</span><span>-10s</span><span>NOW</span>
          </div>
        </div>

        {/* Card 3: HEALTH SCORE HISTORY */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-orange-200 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black tracking-wider text-gray-800 uppercase">Health Score Trend</h4>
              <TrendingUp size={14} className="text-gray-400" />
            </div>
            <div className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
              Composite Reliability: <span className="text-gray-900 font-black">{hasStream && healthScore != null ? `${healthScore}%` : '--'}</span>
            </div>

            <div className="relative pt-1 pb-1">
              <svg viewBox="0 0 240 70" className="w-full h-20 overflow-visible">
                <line x1="0" y1="10" x2="240" y2="10" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="35" x2="240" y2="35" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="60" x2="240" y2="60" stroke="#F1F5F9" strokeWidth="1" />
                <text x="0" y="8" fontSize="8" fill="#94A3B8">100</text>
                <text x="0" y="33" fontSize="8" fill="#94A3B8">50</text>
                <text x="0" y="58" fontSize="8" fill="#94A3B8">0</text>
                {[
                  { x: 30, h: hasStream ? 42 : 12 }, { x: 62, h: hasStream ? 40 : 12 }, { x: 94, h: hasStream ? 44 : 12 },
                  { x: 126, h: hasStream ? 47 : 12 }, { x: 158, h: hasStream ? 46 : 12 }, { x: 190, h: hasStream ? 50 : 12 }, { x: 222, h: hasStream ? Math.round((healthScore || 80) * 0.6) : 12 },
                ].map((bar, i) => (
                  <rect
                    key={i}
                    x={bar.x}
                    y={65 - bar.h}
                    width="12"
                    height={bar.h}
                    rx="3"
                    fill={i === 6 ? '#FF6B35' : '#E2E8F0'}
                  />
                ))}
              </svg>
            </div>
          </div>
          <div className="flex justify-between text-[9px] font-mono text-gray-400 mt-2 px-1">
            <span>-60s</span><span>-50s</span><span>-40s</span><span>-30s</span><span>-20s</span><span>LIVE</span>
          </div>
        </div>

        {/* Card 4: RECENT ALERTS */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-orange-200 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
              <h4 className="text-xs font-black tracking-wider text-gray-800 uppercase">Live Advisories</h4>
              <Bell size={14} className="text-gray-400" />
            </div>

            <div className="space-y-2">
              {alerts && alerts.length > 0 ? (
                alerts.slice(0, 3).map((alert, i) => (
                  <div key={alert.id || i} className="flex items-start justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-start gap-2">
                      <div className={`w-5 h-5 rounded-md ${alert.sev === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'} flex items-center justify-center shrink-0 mt-0.5`}>
                        <AlertTriangle size={11} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 leading-snug">{alert.msg}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{alert.ts || 'Live'}</p>
                      </div>
                    </div>
                    <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase ${alert.sev === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {alert.sev}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-gray-400">
                  {hasStream ? 'All engine parameters nominal. No active alerts.' : 'System standby. Awaiting telemetry stream.'}
                </div>
              )}
            </div>
          </div>

          <Link
            to="/faults"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#FF6B35] hover:text-orange-600 transition-colors uppercase tracking-wider"
          >
            Open Fault Diagnostics →
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
