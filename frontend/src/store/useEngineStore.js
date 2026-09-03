import { create } from 'zustand';
import { diagnose, getWsUrl, localDiagnose, NOMINAL } from '../lib/api';

// ─── Fault Presets ─────────────────────────────────────────────────────────
const PRESETS = {
  nominal:             { ...NOMINAL },
  overheating:         { ...NOMINAL, rpm:5200, cht:138, egt:895, oil_temp:114, fuel_flow:21 },
  oil_starvation:      { ...NOMINAL, rpm:4700, cht:122, oil_pressure:175, oil_temp:126, vibration:1.8 },
  bearing_wear:        { ...NOMINAL, rpm:4600, cht:115, oil_temp:108, vibration:3.2 },
  lean_misfire:        { ...NOMINAL, rpm:4400, fuel_flow:13.2, egt:865, vibration:1.6, afr:16.8 },
  low_oil_pressure:    { ...NOMINAL, oil_pressure:185, oil_temp:118, vibration:1.6 },
  high_cht:            { ...NOMINAL, cht:148, egt:890, oil_temp:115 },
  fuel_pressure_drop:  { ...NOMINAL, fuel_flow:9.5, afr:17.2, egt:875 },
  cooling_problem:     { ...NOMINAL, cht:142, oil_temp:122, egt:880 },
  rpm_instability:     { ...NOMINAL, rpm:4050, vibration:2.9, egt:855 },
};

const DEFAULT_THRESHOLDS = {
  cht_warn:130, cht_crit:145,
  oil_pressure_warn:280, oil_pressure_crit:200,
  vibration_warn:2.0, vibration_crit:3.0,
  egt_warn:870, egt_crit:910,
  afr_warn:15.5, afr_crit:16.5,
};

// ─── Startup Sequence Steps ─────────────────────────────────────────────────
export const STARTUP_STEPS = [
  { id:0, label:'UAV ARMING',                icon:'🔰', duration:700 },
  { id:1, label:'Flight Controller Online',   icon:'✈️', duration:800 },
  { id:2, label:'Engine Control Enabled',     icon:'⚙️', duration:700 },
  { id:3, label:'Fuel System Ready',          icon:'⛽', duration:800 },
  { id:4, label:'Ignition ON',                icon:'🔑', duration:600 },
  { id:5, label:'Engine Cranking',            icon:'🔄', duration:1000 },
  { id:6, label:'RPM Increasing',             icon:'📈', duration:1200 },
  { id:7, label:'ENGINE RUNNING',             icon:'🟢', duration:600 },
];

// ─── Physics Model ──────────────────────────────────────────────────────────
function computePhysicsExpected(telemetry) {
  const rpm   = telemetry.rpm ?? 4800;
  const load  = telemetry.engineLoad ?? 62;
  const rpmF  = rpm / 4800;
  const loadF = load / 100;
  return {
    rpm, cht: 88 + rpmF*35 + loadF*20,
    egt: 680 + rpmF*130 + loadF*40,
    oil_pressure: 420 - rpmF*40 - loadF*15 + 20,
    oil_temp: 78 + rpmF*22 + loadF*14,
    vibration: 0.6 + rpmF*0.55 + loadF*0.3,
    fuel_flow: 10 + rpmF*9 + loadF*5,
  };
}

// ─── SOH Scoring ───────────────────────────────────────────────────────────
function computeSOH(t) {
  const oilScore = Math.round(Math.max(0, Math.min(100,
    ((t.oil_pressure/380)*0.6 + (1-Math.max(0,(t.oil_temp-92)/40))*0.4)*100)));
  const thermalScore = Math.round(Math.max(0, 100 - Math.max(0,(t.cht-110)/30)*50 - Math.max(0,(t.egt-810)/100)*30));
  const vibScore = Math.round(Math.max(0, 100 - Math.max(0,(t.vibration-1.1)/2.9)*100));
  const rpmScore = Math.round(Math.max(0, 100 - Math.abs(t.rpm-4800)/1200*60));
  const fuelScore = Math.round(Math.max(0, 100 - Math.abs(t.fuel_flow-18.5)/10*40 - Math.abs((t.afr??14.7)-14.7)/3*30));
  const overall = Math.round(oilScore*0.30 + thermalScore*0.20 + vibScore*0.20 + rpmScore*0.15 + fuelScore*0.15);
  return {
    oilScore, thermalScore, vibScore, rpmScore, fuelScore,
    overall, anomalyScore: Math.round(Math.max(0, Math.min(100, 100-overall))),
    degradation: Math.round(Math.max(0, 100-overall))
  };
}

// ─── Maintenance Recs ───────────────────────────────────────────────────────
function buildMaintenanceRecs(diag, soh) {
  const recs = [];
  if (soh.oilScore < 70) recs.push({
    id:'oil_rec', priority: soh.oilScore < 50 ? 'HIGH':'MEDIUM',
    icon: soh.oilScore < 50 ? '🔴':'⚠️',
    title:'Oil System Degradation Detected',
    detail:'Oil pressure shows persistent downward trend. Potential lubrication system degradation.',
    recommendation:'Inspect lubrication system during next maintenance interval.',
    confidence:87,
  });
  if (soh.thermalScore < 70) recs.push({
    id:'thermal_rec', priority: soh.thermalScore < 50 ? 'HIGH':'MEDIUM',
    icon: soh.thermalScore < 50 ? '🔴':'⚠️',
    title:'Thermal System Anomaly',
    detail:'CHT/EGT readings above nominal baseline.',
    recommendation: soh.thermalScore < 50 ? 'Immediate inspection required. Reduce power.' : 'Inspect cooling fins and coolant level.',
    confidence:92,
  });
  if (soh.vibScore < 65) recs.push({
    id:'vib_rec', priority:'HIGH', icon:'🔴',
    title:'Excessive Vibration Detected',
    detail:'Vibration levels exceed operating envelope. Potential bearing/propeller imbalance.',
    recommendation:'Inspect propeller balance, engine mounts, and crankshaft bearings.',
    confidence:89,
  });
  if (recs.length === 0) recs.push({
    id:'nominal_rec', priority:'LOW', icon:'✅',
    title:'All Systems Nominal',
    detail:'No degradation trends detected across all monitored subsystems.',
    recommendation:'Continue scheduled maintenance. Next inspection at 50 flight hrs.',
    confidence:97,
  });
  return recs;
}

// ─── Alert Builder ──────────────────────────────────────────────────────────
let alertIdCounter = 100;
function buildAlerts(t, diag, thresholds) {
  const alerts = []; const ts = new Date().toLocaleTimeString();
  if (t.oil_pressure < thresholds.oil_pressure_crit)
    alerts.push({ id:`oil_p_${alertIdCounter++}`, sev:'critical', msg:'Oil pressure critically low', src:'Engine 1', ts, read:false });
  else if (t.oil_pressure < thresholds.oil_pressure_warn)
    alerts.push({ id:`oil_w_${alertIdCounter++}`, sev:'warning', msg:`Oil pressure below threshold: ${t.oil_pressure?.toFixed(0)} kPa`, src:'Engine 1', ts, read:false });
  if (t.cht > thresholds.cht_crit)
    alerts.push({ id:`cht_c_${alertIdCounter++}`, sev:'critical', msg:`CHT critical: ${t.cht?.toFixed(1)}°C`, src:'Engine 1', ts, read:false });
  else if (t.cht > thresholds.cht_warn)
    alerts.push({ id:`cht_w_${alertIdCounter++}`, sev:'warning', msg:`CHT elevated: ${t.cht?.toFixed(1)}°C`, src:'Engine 1', ts, read:false });
  if (t.vibration > thresholds.vibration_crit)
    alerts.push({ id:`vib_c_${alertIdCounter++}`, sev:'critical', msg:`Vibration critical: ${t.vibration?.toFixed(2)} g`, src:'Engine 1', ts, read:false });
  else if (t.vibration > thresholds.vibration_warn)
    alerts.push({ id:`vib_w_${alertIdCounter++}`, sev:'warning', msg:`Vibration elevated: ${t.vibration?.toFixed(2)} g`, src:'Engine 1', ts, read:false });
  if (diag.status === 'Healthy')
    alerts.push({ id:`ok_${alertIdCounter++}`, sev:'info', msg:'All systems nominal', src:'Engine 1', ts, read:true });
  return alerts;
}

function buildTasks(diag) {
  const tasks = []; let id=1;
  if (diag.status === 'Critical') tasks.push({ id:id++, name:'Oil System Emergency Inspection', due:'Immediate', priority:'high', status:'open' });
  if (diag.status === 'Warning') tasks.push({ id:id++, name:`Inspect ${diag.fault_component}`, due:'Next flight', priority:'medium', status:'open' });
  tasks.push({ id:id++, name:'Spark plug replacement', due:'35 hrs', priority:'low', status:'open' });
  tasks.push({ id:id++, name:'Oil filter change', due:'50 hrs', priority:'low', status:'open' });
  tasks.push({ id:id++, name:'Phase-1 maintenance check', due:'100 hrs', priority:'medium', status:'open' });
  return tasks;
}

function seedHistory(t, n=30) {
  const now=Date.now();
  return Array.from({length:n},(_,i)=>{
    const nz=()=>(Math.random()-0.5)*0.04;
    const soh=computeSOH(t);
    return {
      time: new Date(now-(n-i)*2000).toLocaleTimeString(),
      rpm: t.rpm*(1+nz()), cht: t.cht*(1+nz()), egt: t.egt*(1+nz()),
      oil_pressure: t.oil_pressure*(1+nz()), oil_temp: t.oil_temp*(1+nz()),
      vibration: t.vibration*(1+nz()), fuel_flow: t.fuel_flow*(1+nz()),
      health_score: soh.overall, anomaly_score: soh.anomalyScore,
    };
  });
}

// ─── Fault Propagation ─────────────────────────────────────────────────────
const FAULT_PROPAGATION = {
  low_oil_pressure: [
    { step:'🔵 Oil pressure sensor detecting decreasing pressure...', delay:0 },
    { step:'📉 Telemetry: Oil pressure 4.5 → 3.8 → 3.2 bar', delay:800 },
    { step:'⚡ Data processing flags abnormal downward trend', delay:1600 },
    { step:'🔬 Digital Twin: Expected 4.8 bar | Actual 3.2 bar | Δ = -1.6 bar ⚠️', delay:2400 },
    { step:'🤖 AI Model: Anomaly score climbing 18 → 55 → 82', delay:3200 },
    { step:'📊 Health Index: 94% → 72% → 64%', delay:4000 },
    { step:'🚨 Fault Classification: Lubrication System Degradation', delay:4800 },
    { step:'⏱️ RUL updated: 185 hrs → 68 hrs → 48 hrs', delay:5600 },
    { step:'🔧 MAINTENANCE ADVISORY GENERATED — PRIORITY: HIGH', delay:6400 },
  ],
  high_cht: [
    { step:'🔵 CHT sensor detecting elevated temperature...', delay:0 },
    { step:'📉 Telemetry: CHT 110°C → 128°C → 148°C', delay:800 },
    { step:'⚡ Data processing flags thermal anomaly', delay:1600 },
    { step:'🔬 Digital Twin: Expected 112°C | Actual 148°C | Δ = +36°C ⚠️', delay:2400 },
    { step:'🤖 AI Model: Anomaly score 18 → 61 → 79', delay:3200 },
    { step:'📊 Health Index: 94% → 70% → 58%', delay:4000 },
    { step:'🚨 Fault: Cylinder Head / Cooling System Overheating', delay:4800 },
    { step:'🔧 Action: Reduce throttle 20%, enrich mixture — PRIORITY: HIGH', delay:5600 },
  ],
  overheating: [
    { step:'🔵 Multiple thermal sensors reporting critical values...', delay:0 },
    { step:'📉 CHT → 142°C, EGT → 895°C, Oil Temp → 114°C', delay:800 },
    { step:'⚡ Data processing: THERMAL EMERGENCY flagged', delay:1600 },
    { step:'🔬 Digital Twin: 3-parameter critical deviation detected', delay:2400 },
    { step:'🤖 AI Model: Anomaly score → 91 [CRITICAL]', delay:3200 },
    { step:'📊 Health Index: 94% → 52%', delay:4000 },
    { step:'🚨 CRITICAL: Overheating — Cooling system failure', delay:4800 },
    { step:'🔧 IMMEDIATE: Reduce throttle, initiate descent — CRITICAL', delay:5600 },
  ],
  bearing_wear: [
    { step:'🔵 Vibration sensor detecting anomalous oscillation...', delay:0 },
    { step:'📉 Vibration: 1.1 → 2.3 → 3.5 mm/s (3× nominal)', delay:800 },
    { step:'⚡ Multivariate correlation: RPM-Vibration pattern abnormal', delay:1600 },
    { step:'🔬 Digital Twin: Vibration expected 1.2 | actual 3.5 | Δ = +2.3 ⚠️', delay:2400 },
    { step:'🤖 AI Model: Bearing wear signature detected — score 88', delay:3200 },
    { step:'📊 SOH: 94% → 61%', delay:4000 },
    { step:'🚨 Fault: Crankshaft Main Bearing Wear', delay:4800 },
    { step:'🔧 Reduce RPM 500. Inspect bearings post-flight — HIGH', delay:5600 },
  ],
};

// ─── Init State ─────────────────────────────────────────────────────────────
const initT = { ...PRESETS.nominal, engineLoad: 62 };
const initD = localDiagnose(initT);
const initSOH = computeSOH(initT);
const initPhysics = computePhysicsExpected(initT);
const initThresholds = { ...DEFAULT_THRESHOLDS };

export const useEngineStore = create((set, get) => {
  let ws = null;
  let mockInterval = null;
  let streamPaused = false;
  let startupTimer = null;

  function startMock() {
    if (mockInterval) return;
    mockInterval = setInterval(() => {
      if (streamPaused) return;
      const st = get();
      if (!st.engineRunning) return;
      const base = st.telemetry;
      const nz = (v, p=0.015) => v*(1+(Math.random()-0.5)*2*p);
      const next = {
        rpm: nz(base.rpm), cht: nz(base.cht,0.01), egt: nz(base.egt,0.012),
        oil_pressure: nz(base.oil_pressure,0.018), oil_temp: nz(base.oil_temp,0.01),
        fuel_flow: nz(base.fuel_flow,0.02), map: nz(base.map,0.01),
        vibration: nz(base.vibration,0.04), voltage: nz(base.voltage,0.005),
        altitude: nz(base.altitude,0.003), ambient_temp: base.ambient_temp,
        afr: nz(base.afr,0.015), engineLoad: base.engineLoad,
      };
      const d = localDiagnose(next);
      const soh = computeSOH(next);
      const physics = computePhysicsExpected(next);
      const thr = get().thresholds;
      set(s => ({
        telemetry: next, diagnosis: d, soh, physicsExpected: physics,
        maintenanceRecs: buildMaintenanceRecs(d, soh),
        alerts: buildAlerts(next, d, thr),
        tasks: s.tasks.length ? s.tasks : buildTasks(d),
        history: [...s.history,{
          time: new Date().toLocaleTimeString(),
          rpm:next.rpm, cht:next.cht, egt:next.egt,
          oil_pressure:next.oil_pressure, oil_temp:next.oil_temp,
          vibration:next.vibration, fuel_flow:next.fuel_flow,
          health_score:soh.overall, anomaly_score:soh.anomalyScore,
        }].slice(-80)
      }));
    }, 1800);
  }
  function stopMock() { if (mockInterval) { clearInterval(mockInterval); mockInterval=null; } }

  return {
    // Telemetry
    telemetry:         initT,
    preset:            'nominal',
    diagnosis:         initD,
    soh:               initSOH,
    physicsExpected:   initPhysics,
    history:           seedHistory(initT),
    alerts:            buildAlerts(initT, initD, initThresholds),
    tasks:             buildTasks(initD),
    thresholds:        initThresholds,
    maintenanceRecs:   buildMaintenanceRecs(initD, initSOH),
    unreadCount:       0,
    wsConnected:       false,
    drawerOpen:        false,
    streamPaused:      false,
    selectedPart:      null,
    engineRunning:     true,

    // UAV Phase
    uavPhase:          'standby', // standby | arming | running | fault
    startupStep:       -1,        // -1 = not started, 0-7 = sequence
    throttle:          35,
    altitude:          0,
    airspeed:          0,
    heading:           0,
    rpmRamp:           0,         // 0 → 1800 during startup

    // Fault injection
    activeFault:            null,
    faultPropagationLog:    [],
    faultPropagating:       false,

    setDrawerOpen:    v => set({ drawerOpen: v }),
    setSelectedPart:  p => set({ selectedPart: p }),

    // ── UAV Controls ─────────────────────────────────────────────────────
    setThrottle: (v) => {
      const throttle = Math.round(v);
      const { engineRunning, telemetry } = get();
      if (!engineRunning) { set({ throttle }); return; }
      // Throttle affects RPM & load
      const rpmTarget = 2200 + (throttle/100)*3000;
      const next = {
        ...telemetry, engineLoad: throttle,
        rpm: rpmTarget,
        cht: NOMINAL.cht + throttle*0.35,
        egt: NOMINAL.egt + throttle*0.45,
        fuel_flow: NOMINAL.fuel_flow + (throttle/100)*6,
      };
      const d = localDiagnose(next);
      const soh = computeSOH(next);
      const physics = computePhysicsExpected(next);
      set({ throttle, telemetry: next, diagnosis: d, soh, physicsExpected: physics });
    },

    setHeading: (v) => set({ heading: v }),

    // ── Startup Sequence ─────────────────────────────────────────────────
    startEngineStartup: (onComplete) => {
      if (get().uavPhase === 'arming') return;
      if (get().engineRunning) {
        if (onComplete) onComplete();
        return;
      }
      set({ uavPhase: 'arming', startupStep: 0, rpmRamp: 0 });

      let step = 0;
      const runStep = () => {
        if (step >= STARTUP_STEPS.length) {
          const t = { ...PRESETS.nominal, engineLoad: 35 };
          const d = localDiagnose(t);
          const soh = computeSOH(t);
          const physics = computePhysicsExpected(t);
          set({
            uavPhase: 'running', startupStep: 7,
            engineRunning: true, rpmRamp: 1800,
            telemetry: t, diagnosis: d, soh, physicsExpected: physics,
            history: seedHistory(t), maintenanceRecs: buildMaintenanceRecs(d, soh),
          });
          startMock();
          if (onComplete) onComplete();
          return;
        }
        set({ startupStep: step });
        if (step >= 4) {
          set(s => ({ rpmRamp: Math.min(1800, s.rpmRamp + 450) }));
        }
        step++;
        startupTimer = setTimeout(runStep, STARTUP_STEPS[step - 1]?.duration ?? 650);
      };
      runStep();
    },

    armUav: () => {
      get().startEngineStartup();
    },

    emergencyStop: () => {
      if (startupTimer) clearTimeout(startupTimer);
      stopMock();
      const t = { ...PRESETS.nominal, engineLoad: 0 };
      set({
        uavPhase: 'standby', startupStep: -1,
        engineRunning: false, rpmRamp: 0, throttle: 0,
        telemetry: t, diagnosis: localDiagnose(t),
        soh: computeSOH(t), physicsExpected: computePhysicsExpected(t),
        activeFault: null, faultPropagationLog: [], faultPropagating: false,
        history: seedHistory(t), maintenanceRecs: buildMaintenanceRecs(localDiagnose(t), computeSOH(t)),
      });
    },

    startEngine: () => { startMock(); set({ engineRunning: true }); },
    stopEngine:  () => { stopMock(); set({ engineRunning: false }); },

    increaseRpm: () => {
      set(s => {
        const next = { ...s.telemetry, rpm: Math.min(5500, s.telemetry.rpm+200) };
        const d = localDiagnose(next); const soh = computeSOH(next);
        return { telemetry: next, diagnosis: d, soh, physicsExpected: computePhysicsExpected(next) };
      });
    },
    decreaseRpm: () => {
      set(s => {
        const next = { ...s.telemetry, rpm: Math.max(1800, s.telemetry.rpm-200) };
        const d = localDiagnose(next); const soh = computeSOH(next);
        return { telemetry: next, diagnosis: d, soh, physicsExpected: computePhysicsExpected(next) };
      });
    },

    // ── Fault Injection ───────────────────────────────────────────────────
    injectFault: (faultKey) => {
      const faultTelemetry = PRESETS[faultKey] || PRESETS.nominal;
      const steps = FAULT_PROPAGATION[faultKey] || [];
      set({ activeFault: faultKey, faultPropagationLog: [], faultPropagating: true, uavPhase: 'fault' });

      steps.forEach(({ step, delay }) => {
        setTimeout(() => {
          set(s => ({ faultPropagationLog: [...s.faultPropagationLog, step] }));
          if (delay >= (steps[steps.length-1]?.delay ?? 0)) set({ faultPropagating: false });
        }, delay);
      });

      setTimeout(() => {
        const t = { ...faultTelemetry, engineLoad: get().telemetry.engineLoad ?? 62 };
        const d = localDiagnose(t); const soh = computeSOH(t);
        const thr = get().thresholds;
        set({
          preset: faultKey, telemetry: t, diagnosis: d, soh, physicsExpected: computePhysicsExpected(t),
          alerts: buildAlerts(t, d, thr), maintenanceRecs: buildMaintenanceRecs(d, soh),
          tasks: buildTasks(d), history: seedHistory(t),
        });
      }, 1400);
    },

    resetFault: () => {
      const t = { ...PRESETS.nominal, engineLoad: 62 };
      const d = localDiagnose(t); const soh = computeSOH(t);
      const thr = get().thresholds;
      set({
        activeFault: null, faultPropagationLog: [], faultPropagating: false,
        uavPhase: get().engineRunning ? 'running' : 'standby',
        preset: 'nominal', telemetry: t, diagnosis: d, soh,
        physicsExpected: computePhysicsExpected(t),
        alerts: buildAlerts(t, d, thr), maintenanceRecs: buildMaintenanceRecs(d, soh),
        tasks: buildTasks(d), history: seedHistory(t),
      });
    },

    // ── Misc ──────────────────────────────────────────────────────────────
    pauseStream:  () => { streamPaused=true; set({ streamPaused:true }); },
    resumeStream: () => { streamPaused=false; set({ streamPaused:false }); },
    markAllRead:  () => set(s => ({ alerts: s.alerts.map(a=>({...a,read:true})), unreadCount:0 })),
    markAlertRead: (id) => set(s => {
      const alerts=s.alerts.map(a=>a.id===id?{...a,read:true}:a);
      return { alerts, unreadCount: alerts.filter(a=>!a.read).length };
    }),
    setTaskStatus: (id,status) => set(s => ({ tasks: s.tasks.map(t=>t.id===id?{...t,status}:t) })),
    setThreshold: (key,val) => set(s => ({ thresholds:{...s.thresholds,[key]:parseFloat(val)} })),

    setPreset: (name) => {
      const t = PRESETS[name] || PRESETS.nominal;
      const tl = { ...t, engineLoad:62 };
      const d=localDiagnose(tl); const soh=computeSOH(tl); const thr=get().thresholds;
      set({ preset:name, telemetry:tl, diagnosis:d, soh, physicsExpected:computePhysicsExpected(tl),
        history:seedHistory(tl), alerts:buildAlerts(tl,d,thr), maintenanceRecs:buildMaintenanceRecs(d,soh),
        tasks:buildTasks(d), unreadCount:buildAlerts(tl,d,thr).filter(a=>!a.read).length });
      diagnose(tl).then(d2=>{
        const na=buildAlerts(tl,d2,get().thresholds);
        set({ diagnosis:d2, alerts:na, unreadCount:na.filter(a=>!a.read).length });
      }).catch(()=>{});
    },

    runDiagnosis: async (t) => {
      set({ telemetry:t });
      const d=await diagnose(t); const soh=computeSOH(t); const thr=get().thresholds;
      const na=buildAlerts(t,d,thr);
      set({ diagnosis:d, soh, physicsExpected:computePhysicsExpected(t),
        history:seedHistory(t), alerts:na, tasks:buildTasks(d),
        maintenanceRecs:buildMaintenanceRecs(d,soh), unreadCount:na.filter(a=>!a.read).length });
    },

    setTelemetryValue: (key,val) => {
      set(s => {
        const next={...s.telemetry,[key]:parseFloat(val)};
        const d=localDiagnose(next); const soh=computeSOH(next);
        diagnose(next).then(d2=>set({diagnosis:d2})).catch(()=>{});
        return { telemetry:next, diagnosis:d, soh, physicsExpected:computePhysicsExpected(next) };
      });
    },

    connectWebSocket: () => {
      const url=getWsUrl();
      if (!url) { startMock(); return; }
      if (ws) return;
      const connect=()=>{
        ws=new WebSocket(url);
        ws.onopen=()=>{ set({wsConnected:true}); stopMock(); ws.send(JSON.stringify({preset:get().preset})); };
        ws.onmessage=(e)=>{
          if (streamPaused) return;
          const data=JSON.parse(e.data);
          if (data.telemetry) {
            const next=data.telemetry; const d=localDiagnose(next); const soh=computeSOH(next);
            const thr=get().thresholds; const na=buildAlerts(next,d,thr);
            set(s=>({ telemetry:next, diagnosis:d, soh, physicsExpected:computePhysicsExpected(next),
              alerts:na, unreadCount:na.filter(a=>!a.read).length,
              history:[...s.history,{time:new Date().toLocaleTimeString(),...next,health_score:soh.overall,anomaly_score:soh.anomalyScore}].slice(-80) }));
            diagnose(next).then(d2=>set({diagnosis:d2})).catch(()=>{});
          }
        };
        ws.onclose=()=>{ set({wsConnected:false}); ws=null; startMock(); setTimeout(connect,5000); };
        ws.onerror=()=>{ if(ws) ws.close(); };
      };
      connect();
    },
  };
});
