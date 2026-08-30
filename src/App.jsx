import React, { useState, useEffect } from 'react';
import { 
  DashboardHeader, 
  StatusPanel, 
  AlertFeed, 
  EngineSchematic, 
  MissionSimulator, 
  TelemetryGraph 
} from './Components/Components';
import { 
  LayoutDashboard, 
  Activity, 
  Brain, 
  Compass, 
  ShieldAlert, 
  Map, 
  Info, 
  AlertTriangle,
  Play,
  RotateCcw
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedSubsystem, setSelectedSubsystem] = useState('cylinders');
  
  // Envelope Controls
  const [throttle, setThrottle] = useState(80); // in %
  const [altitude, setAltitude] = useState(8500); // in ft
  const [mixture, setMixture] = useState('auto'); // lean, auto, rich

  // Simulated Faults
  const [faultState, setFaultState] = useState({
    oilLeak: false,
    airFilterClog: false,
    coolantPumpFailure: false
  });

  // Real-time sensor state
  const [sensorData, setSensorData] = useState({
    rpm: 4800,
    torque: 110,
    oilPressure: 4.2,
    oilTemp: 94,
    cht: 112,
    egt: 820,
    fuelFlow: 18.5,
    vibration: 1.1,
    map: 32.5,
    throttle: 80,
    healthScore: 98,
    rul: 120,
    missionReliability: 99
  });

  // History buffer for graphing (sliding window of 30 seconds)
  const [historyData, setHistoryData] = useState([]);

  // Setup fault injector
  const injectFault = (faultName) => {
    setFaultState(prev => ({
      ...prev,
      [faultName]: !prev[faultName]
    }));
  };

  const resetFaults = () => {
    setFaultState({
      oilLeak: false,
      airFilterClog: false,
      coolantPumpFailure: false
    });
  };

  // Run simulation engine loop
  useEffect(() => {
    const interval = setInterval(() => {
      setSensorData(prev => {
        // 1. Calculate physics based on throttle, altitude, and faults
        const targetRpm = Math.round(2000 + (throttle * 40) - (faultState.airFilterClog ? 800 : 0));
        // Add subtle sensor noise (+/- 15 RPM)
        const currentRpm = Math.max(1800, Math.round(targetRpm + (Math.random() * 30 - 15)));

        // Torque is proportional to throttle & air density (altitude)
        const densityFactor = Math.max(0.6, 1 - (altitude / 50000));
        const baseTorque = (throttle * 1.3) * densityFactor;
        const currentTorque = Math.round((baseTorque - (faultState.airFilterClog ? 15 : 0)) + (Math.random() * 2 - 1));

        // Manifold Absolute Pressure (MAP)
        const baseMap = 30 + (throttle / 10) - (altitude / 2000);
        const currentMap = parseFloat((baseMap - (faultState.airFilterClog ? 4.5 : 0)).toFixed(1));

        // Oil System
        let targetOilPress = 1.5 + (currentRpm / 1500);
        if (faultState.oilLeak) {
          targetOilPress *= 0.5; // oil leak cuts pressure
        }
        const currentOilPressure = parseFloat((targetOilPress + (Math.random() * 0.2 - 0.1)).toFixed(1));

        let baseOilTemp = 75 + (throttle / 3) + (altitude / 1000);
        if (faultState.oilLeak) {
          baseOilTemp += 25; // low oil = high heat
        }
        const currentOilTemp = Math.round(baseOilTemp + (Math.random() * 2 - 1));

        // Cooling jacket & CHT
        let baseCht = 90 + (throttle / 2.5) - (altitude / 1200);
        if (faultState.coolantPumpFailure) {
          baseCht += 30; // cooling fail = hot heads
        }
        const currentCht = Math.round(baseCht + (Math.random() * 2 - 1));

        // Exhaust Gas Temp (EGT)
        let baseEgt = 750 + (throttle * 1.2);
        if (mixture === 'lean') baseEgt += 40; // lean burning is hotter
        if (mixture === 'rich') baseEgt -= 30; // rich cooling
        const currentEgt = Math.round(baseEgt + (Math.random() * 6 - 3));

        // Fuel Flow (L/hr)
        let baseFuelFlow = (throttle / 5) * (mixture === 'rich' ? 1.2 : mixture === 'lean' ? 0.85 : 1.0);
        const currentFuelFlow = parseFloat((baseFuelFlow + (Math.random() * 0.4 - 0.2)).toFixed(1));

        // Vibration
        let baseVib = 0.5 + (currentRpm / 3500);
        if (faultState.oilLeak) baseVib += 0.6; // friction rattle
        if (faultState.airFilterClog) baseVib += 0.3; // uneven intake breathing
        const currentVibration = parseFloat((baseVib + (Math.random() * 0.15 - 0.07)).toFixed(2));

        // 2. Health index estimation
        let score = 98;
        if (faultState.oilLeak) score -= 30;
        if (faultState.coolantPumpFailure) score -= 20;
        if (faultState.airFilterClog) score -= 12;
        // High temp penalty
        if (currentOilTemp > 115) score -= 10;
        if (currentCht > 130) score -= 15;
        score = Math.max(15, score);

        // Remaining Useful Life (RUL) estimation
        const baseRul = Math.round((score / 100) * 120);

        // Mission reliability index calculation (Bayesian logic)
        let reliability = 99;
        if (score < 90) reliability -= (90 - score) * 1.5;
        if (altitude > 12000) reliability -= 5; // thin air hazard
        if (throttle > 95) reliability -= 3; // stress load
        reliability = Math.max(10, Math.round(reliability));

        return {
          rpm: currentRpm,
          torque: currentTorque,
          oilPressure: currentOilPressure,
          oilTemp: currentOilTemp,
          cht: currentCht,
          egt: currentEgt,
          fuelFlow: currentFuelFlow,
          vibration: currentVibration,
          map: currentMap,
          throttle,
          healthScore: score,
          rul: baseRul,
          missionReliability: reliability
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [throttle, altitude, mixture, faultState]);

  // Keep a buffer of historical points
  useEffect(() => {
    setHistoryData(prev => {
      const newPoint = {
        timeOffset: 0,
        rpm: sensorData.rpm,
        torque: sensorData.torque,
        cht: sensorData.cht,
        egt: sensorData.egt,
        oilPressure: sensorData.oilPressure,
        oilTemp: sensorData.oilTemp,
        vibration: sensorData.vibration
      };

      // Shift existing offsets by -1
      const updatedPrev = prev.map(pt => ({
        ...pt,
        timeOffset: pt.timeOffset + 1
      }));

      // Keep only last 30 data points
      const buffer = [newPoint, ...updatedPrev];
      return buffer.slice(0, 30);
    });
  }, [sensorData]);

  const navItems = [
    { id: 'dashboard', label: 'COCKPIT HUD', icon: LayoutDashboard },
    { id: 'twin', label: 'DIGITAL TWIN SYNOPTIC', icon: Activity },
    { id: 'prognostics', label: 'AI DIAGNOSTICS', icon: Brain },
    { id: 'simulator', label: 'ENVELOPE SIMULATOR', icon: Compass }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans scanlines flex flex-col md:flex-row hud-grid">
      
      {/* Dynamic Left Sidebar Menu */}
      <aside className="w-full md:w-64 bg-slate-900/40 border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col p-4 shrink-0 glass-panel">
        
        {/* App Logo */}
        <div className="flex items-center gap-2 mb-8 pt-2">
          <div className="relative w-8 h-8 flex items-center justify-center bg-cyan-500 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <span className="font-mono font-black text-slate-950 text-base">DT</span>
          </div>
          <div>
            <h2 className="text-sm font-black font-mono tracking-wider text-slate-100">FALCON TWIN</h2>
            <span className="text-[8px] font-mono text-cyan-400 font-semibold tracking-widest uppercase">GCS TERMINAL</span>
          </div>
        </div>

        {/* Navigation buttons */}
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTabAndCheckpoints(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono font-bold transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-cyan-500/10 text-cyan-400 border-l-4 border-cyan-400 border-t border-r border-b border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.05)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Global indicator gauges on sidebar */}
        <div className="border-t border-slate-800/60 pt-4 mt-4 space-y-3 font-mono text-[10px]">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-500">ENGINE INTEGRITY</span>
              <span className={sensorData.healthScore > 80 ? 'text-emerald-400' : 'text-amber-400'}>{sensorData.healthScore}%</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div 
                className={`h-full transition-all duration-500 ${sensorData.healthScore > 85 ? 'bg-emerald-500' : sensorData.healthScore > 70 ? 'bg-amber-500' : 'bg-red-500'}`} 
                style={{ width: `${sensorData.healthScore}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-500">MISSION RELIABILITY</span>
              <span className="text-cyan-400">{sensorData.missionReliability}%</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-cyan-500 transition-all duration-500" 
                style={{ width: `${sensorData.missionReliability}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main GCS workspace window */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header telemetry synchronizer */}
        <DashboardHeader missionReliability={sensorData.missionReliability} />

        {/* Conditional rendering of GCS Terminal tabs */}
        <div className="mt-4">
          
          {/* TAB 1: COCKPIT HUD */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Telemetry charts */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="glass-panel p-6 rounded-xl border border-slate-800/80">
                  <TelemetryGraph historyData={historyData} />
                </div>

                {/* Subsystem status overview */}
                <div className="glass-panel p-6 rounded-xl border border-slate-800/80">
                  <h3 className="text-sm font-bold tracking-wider text-cyan-400 font-mono flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                    <Compass className="w-5 h-5 text-cyan-400" />
                    INTEGRATED SYSTEM DIAGRAM
                  </h3>
                  <div className="h-64 rounded-lg overflow-hidden flex items-center justify-center relative bg-slate-950/40 border border-slate-900/60 p-4">
                    <div className="text-center font-mono space-y-3 z-10">
                      <p className="text-slate-400 text-xs leading-relaxed max-w-md mx-auto">
                        To view and query individual components on the active Rotax horizontally opposed engine diagram, switch to the full synoptic view.
                      </p>
                      <button
                        onClick={() => setTabAndCheckpoints('twin')}
                        className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs transition-all duration-200 shadow-lg shadow-cyan-500/20"
                      >
                        Launch Interactive Twin Synoptic
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status and active AI alerts column */}
              <div className="lg:col-span-1 space-y-6">
                <div className="glass-panel p-6 rounded-xl border border-slate-800/80">
                  <h3 className="text-sm font-bold tracking-wider text-cyan-400 font-mono flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    ENGINE HEALTH METRICS
                  </h3>
                  <StatusPanel sensorData={sensorData} />
                </div>

                <div className="glass-panel p-6 rounded-xl border border-slate-800/80">
                  <AlertFeed sensorData={sensorData} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE DIGITAL TWIN SYNOPTIC */}
          {activeTab === 'twin' && (
            <EngineSchematic 
              selectedSubsystem={selectedSubsystem}
              onSelectSubsystem={setSelectedSubsystem}
              sensorData={sensorData}
            />
          )}

          {/* TAB 3: AI DIAGNOSTICS & PROGNOSTICS */}
          {activeTab === 'prognostics' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* RUL curve models */}
              <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-slate-800/80">
                <h3 className="text-sm font-bold tracking-wider text-cyan-400 font-mono flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                  <Brain className="w-5 h-5 text-cyan-400" />
                  REMAINING USEFUL LIFE (RUL) PROGNOSTIC DECAY CURVE
                </h3>
                
                <div className="h-80 w-full flex items-center justify-center bg-slate-950/40 rounded-xl border border-slate-900/60 p-4 relative mb-4">
                  {/* Dynamic simulated chart area representing RUL decays */}
                  <div className="w-full h-full flex flex-col justify-between font-mono text-[10px] text-slate-500">
                    <div className="flex-1 border-b border-l border-slate-800 relative flex items-end">
                      
                      {/* Grid guidelines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        <div className="border-b border-slate-900/40 w-full h-px" />
                        <div className="border-b border-slate-900/40 w-full h-px" />
                        <div className="border-b border-slate-900/40 w-full h-px" />
                      </div>

                      {/* Exponential Decay SVG Line drawing */}
                      <svg viewBox="0 0 500 200" className="absolute inset-0 w-full h-full">
                        {/* Normal baseline curve */}
                        <path d="M 0 40 Q 250 80 500 180" fill="none" stroke="rgba(34, 211, 238, 0.2)" strokeWidth="2" strokeDasharray="4 4" />
                        {/* Selected actual decay curve */}
                        <path 
                          d={`M 0 40 Q 250 ${sensorData.healthScore < 80 ? 120 : 80} 500 ${200 - (sensorData.healthScore * 1.8)}`} 
                          fill="none" 
                          stroke={sensorData.healthScore > 85 ? '#10b981' : sensorData.healthScore > 70 ? '#fbbf24' : '#ef4444'} 
                          strokeWidth="3" 
                        />
                        {/* Horizontal threshold line */}
                        <line x1="0" y1="160" x2="500" y2="160" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1.5" strokeDasharray="5 5" />
                        
                        {/* Current operational point node */}
                        <circle 
                          cx="260" 
                          cy={100 + (100 - sensorData.healthScore)} 
                          r="6" 
                          fill={sensorData.healthScore > 85 ? '#10b981' : sensorData.healthScore > 70 ? '#fbbf24' : '#ef4444'}
                          className="animate-pulse" 
                        />
                      </svg>

                      {/* Threshold labels */}
                      <div className="absolute left-2 bottom-6 text-red-500/80 font-bold uppercase text-[8px]">
                        CRITICAL SAFETY LIMIT (15% RUL)
                      </div>
                      <div className="absolute right-4 top-2 text-cyan-500/40 text-[8px]">
                        NORMAL DECAY PROFILE
                      </div>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span>0 hrs (Start)</span>
                      <span>30 hrs</span>
                      <span>60 hrs (Current)</span>
                      <span>90 hrs</span>
                      <span>120 hrs (Phase Limit)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 text-xs font-mono space-y-2">
                  <h4 className="font-bold text-slate-300">AI Prognostic Model: Recurrent Neural Network (LSTM)</h4>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    The digital twin feeds multi-node sensor telemetry (Vibration RMS, Oil Temperature differentials, CHT drift rate) into an LSTM network. The network projects future wear trajectories. Current projections place spark plug degradation at 35 flight hours and oil quality thresholds at 52 hours.
                  </p>
                </div>
              </div>

              {/* FMEA Diagnostic Card Column */}
              <div className="lg:col-span-1 glass-panel p-6 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-cyan-400 font-mono flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                    <ShieldAlert className="w-5 h-5 text-cyan-400" />
                    FAILURE MODES INDEX (FMEA)
                  </h3>
                  
                  <div className="space-y-4 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">Estimated Wear Matrix</span>
                      <div className="space-y-2">
                        {/* Piston Rings wear */}
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Piston Rings Sealing</span>
                            <span>92%</span>
                          </div>
                          <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: '92%' }} />
                          </div>
                        </div>

                        {/* Oil pump wear */}
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Oil Strainer Filter</span>
                            <span className={faultState.oilLeak ? 'text-red-400' : 'text-amber-400'}>
                              {faultState.oilLeak ? '42%' : '84%'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${faultState.oilLeak ? 'bg-red-500' : 'bg-amber-500'}`} 
                              style={{ width: faultState.oilLeak ? '42%' : '84%' }} 
                            />
                          </div>
                        </div>

                        {/* Spark Plugs spark output */}
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Magneto Spark Core</span>
                            <span>91%</span>
                          </div>
                          <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: '91%' }} />
                          </div>
                        </div>

                        {/* Liquid Coolant Pump */}
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Coolant Pump Rotor</span>
                            <span className={faultState.coolantPumpFailure ? 'text-red-400' : 'text-emerald-400'}>
                              {faultState.coolantPumpFailure ? '58%' : '94%'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${faultState.coolantPumpFailure ? 'bg-red-500' : 'bg-emerald-500'}`} 
                              style={{ width: faultState.coolantPumpFailure ? '58%' : '94%' }} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-900 pt-4">
                      <span className="text-[10px] text-slate-500 uppercase block mb-2">Failure Likelihood Vector</span>
                      <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-lg text-[11px] leading-relaxed">
                        {faultState.oilLeak ? (
                          <span className="text-red-400 font-bold">
                            💥 CRITICAL RISK: Cylinder heat lockup or piston slap due to low oil film strength. Immediate load reduction is required to avoid thermo-mechanical failure.
                          </span>
                        ) : faultState.coolantPumpFailure ? (
                          <span className="text-amber-400 font-bold">
                            ⚠️ MODERATE RISK: Cylinder head structural distortion. Coolant temperature trending high. Limit RPM limits.
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            ✓ Engine structural mechanical metrics within allowable bounds. Failure probability in next flight sequence is &lt; 0.04%.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-cyan-950/20 border border-cyan-500/20 p-3 rounded-lg text-xs font-mono mt-4">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
                    <Info className="w-4 h-4 text-cyan-400" />
                    COGNITIVE RECOMMENDATION
                  </div>
                  <p className="text-[10px] text-slate-300 leading-normal">
                    AI prognostic engine synchronizes structural sensor logs with target mission parameters automatically to secure propulsion envelope.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ENVELOPE SIMULATOR */}
          {activeTab === 'simulator' && (
            <MissionSimulator 
              throttle={throttle}
              setThrottle={setThrottle}
              altitude={altitude}
              setAltitude={setAltitude}
              mixture={mixture}
              setMixture={setMixture}
              faultState={faultState}
              injectFault={injectFault}
              resetFaults={resetFaults}
              sensorData={sensorData}
            />
          )}

        </div>
      </main>
    </div>
  );

  // Small helper to trigger visual feedback when switching tabs
  function setTabAndCheckpoints(tabId) {
    setActiveTab(tabId);
  }
};

export default App;