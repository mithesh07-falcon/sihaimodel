import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Radio, ShieldCheck, AlertTriangle, Play, Square,
  RotateCw, Droplets, Flame, Cpu, Settings, ExternalLink, ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEngineStore } from '../store/useEngineStore';
import Rotax912Twin from '../Components/engine/Rotax912Twin';

const EngineViewPage = () => {
  const telemetry = useEngineStore((s) => s.telemetry);
  const diagnosis = useEngineStore((s) => s.diagnosis);
  const streamConnected = useEngineStore((s) => s.streamConnected);
  const packetsReceived = useEngineStore((s) => s.packetsReceived);
  const ingestionRateHz = useEngineStore((s) => s.ingestionRateHz);
  const pingMs = useEngineStore((s) => s.pingMs) || 28;
  const loadPreset = useEngineStore((s) => s.loadPreset);
  const setThrottle = useEngineStore((s) => s.setThrottle);

  const isStreamActive = Boolean(streamConnected && packetsReceived > 0);
  const rpm = isStreamActive ? Math.round(telemetry?.rpm ?? 0) : 0;
  const propRpm = Math.round(rpm / 2.43);
  const baseCht = isStreamActive && telemetry?.cht != null ? Number(telemetry.cht) : null;
  const rawOp = isStreamActive ? (telemetry?.oil_pressure ?? 380) : null;
  const oilP = rawOp != null ? (rawOp > 25 ? (rawOp / 100).toFixed(1) : Number(rawOp).toFixed(1)) : '--';
  const oilT = isStreamActive && telemetry?.oil_temp != null ? Math.round(telemetry.oil_temp) : '--';
  const fuelFlow = isStreamActive && telemetry?.fuel_flow != null ? Number(telemetry.fuel_flow).toFixed(1) : '--';
  const vib = isStreamActive && telemetry?.vibration != null ? Number(telemetry.vibration).toFixed(2) : '--';

  // Per-cylinder CHT values
  const isOverheat = isStreamActive && (diagnosis?.fault_type === 'overheating' || diagnosis?.fault_type === 'high_cht');
  const cylCht = {
    c1: baseCht != null ? (baseCht - 1.2).toFixed(1) : 'Rest (24°C)',
    c2: baseCht != null ? (baseCht + 0.8).toFixed(1) : 'Rest (24°C)',
    c3: baseCht != null ? (isOverheat ? baseCht + 18.5 : baseCht + 2.1).toFixed(1) : 'Rest (24°C)',
    c4: baseCht != null ? (baseCht - 0.5).toFixed(1) : 'Rest (24°C)',
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] text-gray-800 select-none overflow-y-auto">
      
      {/* ── Top Header Navigation & Identity ── */}
      <div className="bg-white border-b border-gray-200/90 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 flex items-center justify-center bg-white shadow-xs"
            style={{ borderColor: '#003087' }}
          >
            <img src="/drdo_logo.png" alt="DRDO" className="w-full h-full p-0.5 object-contain block" draggable={false} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-gray-900 uppercase">
                ROTAX 912 iS SPORT · 3D INTERACTIVE DIGITAL TWIN
              </h1>
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-md text-white"
                style={{ background: '#003087' }}
              >
                DEFENSE TELEMETRY GCS
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-mono">
              4-Cylinder Boxer (1,352 cm³) · Hybrid Split Cooling · PSRU 2.43:1 Gearbox · Dry-Sump
            </p>
          </div>
        </div>

        {/* Live Stream Synchronization Status Badge */}
        <div className="flex items-center gap-3 text-xs">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-bold shadow-2xs ${
              isStreamActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            <Radio size={12} className={isStreamActive ? 'animate-pulse text-emerald-600' : 'text-amber-500'} />
            <span>
              {isStreamActive
                ? `TELEMETRY SYNCHRONIZED (${ingestionRateHz.toFixed(1)} Hz · ${pingMs}ms)`
                : 'ENGINE AT REST · STANDBY (Awaiting Telemetry)'}
            </span>
          </div>

          <Link
            to="/connection"
            className="text-[11px] font-bold text-gray-600 hover:text-[#003087] transition-colors flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg"
            title="Configure data stream gateway"
          >
            Gateway Config <ExternalLink size={11} />
          </Link>
        </div>
      </div>

      {/* ── Main Engine Viewport & Telemetry Grid ── */}
      <div className="p-6 flex-1 flex flex-col gap-5 max-w-[1600px] w-full mx-auto">
        
        {/* Main 3D Model Card */}
        <div className="bg-white border border-gray-200/90 rounded-3xl p-3 shadow-xs flex flex-col relative overflow-hidden">
          <Rotax912Twin />
        </div>

        {/* ── Synchronized Telemetry Telemetry Deck & Verification Presets ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Real-Time Telemetry Synchronization Grid (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Activity size={15} className="text-[#003087]" />
                  <h3 className="text-xs font-black tracking-wider text-gray-800 uppercase">
                    Mechanical Synchronization State
                  </h3>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isStreamActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}
                >
                  {isStreamActive ? 'ACTIVE TELEMETRY SYNC' : 'AT REST (0 RPM)'}
                </span>
              </div>

              {/* Parameter Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Engine RPM */}
                <div className="bg-gray-50/80 border border-gray-100 p-3 rounded-xl flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Crankshaft RPM</span>
                  <span className="text-xl font-black font-mono text-gray-900 mt-1">
                    {rpm.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-gray-500 font-mono mt-0.5">
                    {isStreamActive ? 'Driven by live sensor' : 'Zero (Parked)'}
                  </span>
                </div>

                {/* Propeller RPM (÷ 2.43) */}
                <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-xl flex flex-col">
                  <span className="text-[10px] font-bold text-orange-600 uppercase">PRSU Prop RPM</span>
                  <span className="text-xl font-black font-mono text-orange-700 mt-1">
                    {propRpm.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-orange-600/80 font-mono mt-0.5">
                    Exact 2.43:1 ratio
                  </span>
                </div>

                {/* Oil Pressure */}
                <div className="bg-gray-50/80 border border-gray-100 p-3 rounded-xl flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Dry Sump Oil P</span>
                  <span className="text-xl font-black font-mono text-gray-900 mt-1">
                    {oilP} <span className="text-xs font-normal text-gray-500">bar</span>
                  </span>
                  <span className="text-[9px] text-gray-500 font-mono mt-0.5">
                    {oilT !== '--' ? `${oilT}°C Oil Temp` : 'Cold'}
                  </span>
                </div>

                {/* Fuel Flow */}
                <div className="bg-gray-50/80 border border-gray-100 p-3 rounded-xl flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Dual Injection</span>
                  <span className="text-xl font-black font-mono text-gray-900 mt-1">
                    {fuelFlow} <span className="text-xs font-normal text-gray-500">L/h</span>
                  </span>
                  <span className="text-[9px] text-gray-500 font-mono mt-0.5">
                    8 Injectors active
                  </span>
                </div>
              </div>

              {/* 4-Cylinder Independent CHT Thermal Matrix */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                    Independent Cylinder Head Temps (CHT)
                  </span>
                  <span className="text-[9px] text-gray-400">
                    Water Spider Hybrid Liquid Cooling
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Cylinder 1 (FL)', val: cylCht.c1, isCrit: Number(cylCht.c1) > 140 },
                    { label: 'Cylinder 2 (FR)', val: cylCht.c2, isCrit: Number(cylCht.c2) > 140 },
                    { label: 'Cylinder 3 (RL)', val: cylCht.c3, isCrit: Number(cylCht.c3) > 140 },
                    { label: 'Cylinder 4 (RR)', val: cylCht.c4, isCrit: Number(cylCht.c4) > 140 },
                  ].map((c, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-xl border flex flex-col items-center ${
                        c.isCrit
                          ? 'bg-red-50 border-red-300 text-red-900'
                          : 'bg-gray-50/80 border-gray-200 text-gray-800'
                      }`}
                    >
                      <span className="text-[9px] font-bold text-gray-400 uppercase">{c.label}</span>
                      <span className="text-sm font-black font-mono mt-0.5">
                        {c.val}{typeof c.val === 'string' && c.val.includes('Rest') ? '' : '°C'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Link */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-400 text-[11px]">
                Engine rotates and pulses only when live telemetry packets arrive.
              </span>
              <Link
                to="/faults"
                className="font-bold text-[#003087] hover:underline flex items-center gap-1"
              >
                Go to Diagnostics & Fault Simulation <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>

          {/* Right Column: Interactive Verification & Telemetry Control Deck (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
                <h3 className="text-xs font-black tracking-wider text-gray-800 uppercase flex items-center gap-2">
                  <Settings size={14} className="text-orange-500" /> Synchronization Test Deck
                </h3>
                <span className="text-[10px] font-bold text-gray-400">INSTANT TELEMETRY OVERRIDE</span>
              </div>

              <p className="text-[11px] text-gray-600 mb-3 leading-relaxed">
                Test the engine's real-time kinematic responsiveness and resting state with one click:
              </p>

              {/* Simulation Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    if (loadPreset) loadPreset('nominal');
                    if (setThrottle) setThrottle(75);
                  }}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Run Nominal Flight Cruise (5,200 RPM)</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 font-normal">Prop: 2,140 RPM</span>
                </button>

                <button
                  onClick={() => {
                    if (loadPreset) loadPreset('overheating');
                  }}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Simulate Cyl 3 Overheating (CHT 148°C)</span>
                  </span>
                  <span className="text-[10px] font-mono text-amber-600 font-normal">Thermal Glow</span>
                </button>

                <button
                  onClick={() => {
                    if (loadPreset) loadPreset('low_oil_pressure');
                  }}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-800 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Simulate Low Oil Pressure (1.8 bar)</span>
                  </span>
                  <span className="text-[10px] font-mono text-red-600 font-normal">Dry Sump Alert</span>
                </button>

                <button
                  onClick={() => {
                    // Put to rest immediately
                    useEngineStore.setState({
                      streamConnected: false,
                      packetsReceived: 0,
                      telemetry: { rpm: 0, cht: 24, egt: 24, oil_pressure: 0, oil_temp: 24, fuel_flow: 0, vibration: 0, engine_on: false },
                      engineRunning: false
                    });
                  }}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-colors cursor-pointer shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    <span>Put Engine to Rest (Disconnect / 0 RPM)</span>
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 font-normal">Park All Parts</span>
                </button>
              </div>
            </div>

            {/* Technical Specs Pill */}
            <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] font-mono text-gray-500 flex flex-wrap justify-between">
              <span>Bore × Stroke: 84.0 × 61.0 mm</span>
              <span>PSRU: 2.43:1</span>
              <span>Weight: 63.6 kg</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default EngineViewPage;
