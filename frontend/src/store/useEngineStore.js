import { create } from 'zustand';
import { diagnose, getWsUrl, localDiagnose, NOMINAL } from '../lib/api';

// ─── Fault Presets ────────────────────────────────────────────────────────────
const PRESETS = {
  nominal:           { ...NOMINAL },
  overheating:       { ...NOMINAL, rpm:5200, cht:138, egt:895, oil_temp:114, fuel_flow:21 },
  oil_starvation:    { ...NOMINAL, rpm:4700, cht:122, oil_pressure:175, oil_temp:126, vibration:1.8 },
  bearing_wear:      { ...NOMINAL, rpm:4600, cht:115, oil_temp:108, vibration:3.2 },
  lean_misfire:      { ...NOMINAL, rpm:4400, fuel_flow:13.2, egt:865, vibration:1.6, afr:16.8 },
  low_oil_pressure:  { ...NOMINAL, oil_pressure:185, oil_temp:118, vibration:1.6 },
  high_cht:          { ...NOMINAL, cht:148, egt:890, oil_temp:115 },
  fuel_pressure_drop:{ ...NOMINAL, fuel_flow:9.5, afr:17.2, egt:875 },
  cooling_problem:   { ...NOMINAL, cht:142, oil_temp:122, egt:880 },
  rpm_instability:   { ...NOMINAL, rpm:4050, vibration:2.9, egt:855 },
};

// ─── Thresholds ───────────────────────────────────────────────────────────────
const DEFAULT_THRESHOLDS = {
  cht_warn: 125, cht_crit: 135,
  oil_pressure_warn: 280, oil_pressure_crit: 200,
  vibration_warn: 2.0, vibration_crit: 3.0,
  egt_warn: 870, egt_crit: 910,
  afr_warn: 15.5, afr_crit: 16.5,
};

// ─── Physics Model: expected values from RPM + load ──────────────────────────
function computePhysicsExpected(telemetry) {
  const rpm  = telemetry.rpm       ?? 4800;
  const load = telemetry.engineLoad ?? 62;
  const rpmF = rpm / 4800;
  const loadF= (load ?? 62) / 100;

  return {
    rpm:          rpm,
    cht:          88 + rpmF * 35 + loadF * 20,
    egt:          680 + rpmF * 130 + loadF * 40,
    oil_pressure: 420 - rpmF * 40 - loadF * 15 + 20,
    oil_temp:     78 + rpmF * 22 + loadF * 14,
    vibration:    0.6 + rpmF * 0.55 + loadF * 0.3,
    fuel_flow:    10 + rpmF * 9 + loadF * 5,
  };
}

// ─── SOH Subsystem Scoring ────────────────────────────────────────────────────
function computeSOH(t, diagnosis) {
  const oilScore = (() => {
    const opNorm = t.oil_pressure / 380;
    const otNorm = 1 - Math.max(0, (t.oil_temp - 92) / 40);
    return Math.round(Math.max(0, Math.min(100, (opNorm * 0.6 + otNorm * 0.4) * 100)));
  })();

  const thermalScore = (() => {
    const chtPen = Math.max(0, (t.cht - 110) / 30);
    const egtPen = Math.max(0, (t.egt - 810) / 100);
    return Math.round(Math.max(0, 100 - chtPen * 50 - egtPen * 30));
  })();

  const vibScore = Math.round(Math.max(0, 100 - Math.max(0, (t.vibration - 1.1) / 2.9) * 100));

  const rpmScore = (() => {
    const dev = Math.abs(t.rpm - 4800) / 1200;
    return Math.round(Math.max(0, 100 - dev * 60));
  })();

  const fuelScore = (() => {
    const ffDev = Math.abs(t.fuel_flow - 18.5) / 10;
    const afrDev = Math.abs((t.afr ?? 14.7) - 14.7) / 3;
    return Math.round(Math.max(0, 100 - ffDev * 40 - afrDev * 30));
  })();

  const overall = Math.round(
    oilScore   * 0.30 +
    thermalScore * 0.20 +
    vibScore   * 0.20 +
    rpmScore   * 0.15 +
    fuelScore  * 0.15
  );

  const anomalyScore = Math.round(Math.max(0, Math.min(100, 100 - overall)));
  const degradation  = Math.round(Math.max(0, 100 - overall));

  return { oilScore, thermalScore, vibScore, rpmScore, fuelScore, overall, anomalyScore, degradation };
}

// ─── Alert Builder ────────────────────────────────────────────────────────────
let alertIdCounter = 100;
function buildAlerts(t, diag, thresholds) {
  const alerts = [];
  const ts = new Date().toLocaleTimeString();
  if (t.oil_pressure < thresholds.oil_pressure_crit)
    alerts.push({ id: `oil_p_${alertIdCounter++}`, sev:'critical', msg:'Oil pressure critically low', src:'Engine 1', ts, read: false });
  else if (t.oil_pressure < thresholds.oil_pressure_warn)
    alerts.push({ id: `oil_w_${alertIdCounter++}`, sev:'warning', msg:`Oil pressure below threshold: ${t.oil_pressure?.toFixed(0)} kPa`, src:'Engine 1', ts, read: false });
  if (t.cht > thresholds.cht_crit)
    alerts.push({ id: `cht_c_${alertIdCounter++}`, sev:'critical', msg:`CHT critical: ${t.cht?.toFixed(1)}°C`, src:'Engine 1', ts, read: false });
  else if (t.cht > thresholds.cht_warn)
    alerts.push({ id: `cht_w_${alertIdCounter++}`, sev:'warning', msg:`CHT elevated: ${t.cht?.toFixed(1)}°C`, src:'Engine 1', ts, read: false });
  if (t.vibration > thresholds.vibration_crit)
    alerts.push({ id: `vib_c_${alertIdCounter++}`, sev:'critical', msg:`Vibration critical: ${t.vibration?.toFixed(2)} g`, src:'Engine 1', ts, read: false });
  else if (t.vibration > thresholds.vibration_warn)
    alerts.push({ id: `vib_w_${alertIdCounter++}`, sev:'warning', msg:`Vibration elevated: ${t.vibration?.toFixed(2)} g`, src:'Engine 1', ts, read: false });
  if (t.afr > thresholds.afr_warn)
    alerts.push({ id: `afr_w_${alertIdCounter++}`, sev:'warning', msg:`Lean mixture: AFR ${t.afr?.toFixed(1)}`, src:'EFI System', ts, read: false });
  alerts.push({ id: `spark_${alertIdCounter++}`, sev:'info', msg:'Spark plug wear prognosis — 35 hrs', src:'AI Prognosis', ts, read: false });
  if (diag.status === 'Healthy')
    alerts.push({ id: `ok_${alertIdCounter++}`, sev:'info', msg:'All systems nominal', src:'Engine 1', ts, read: true });
  return alerts;
}

// ─── Task Builder ─────────────────────────────────────────────────────────────
function buildTasks(diag) {
  const tasks = [];
  let id = 1;
  if (diag.status === 'Critical')
    tasks.push({ id: id++, name:'Oil System Emergency Inspection', due:'Immediate', priority:'high', status:'open' });
  if (diag.status === 'Warning')
    tasks.push({ id: id++, name:`Inspect ${diag.fault_component}`, due:'Next flight', priority:'medium', status:'open' });
  tasks.push({ id: id++, name:'Spark plug replacement', due:'35 flight hrs', priority:'low', status:'open' });
  tasks.push({ id: id++, name:'Oil filter change', due:'50 flight hrs', priority:'low', status:'open' });
  tasks.push({ id: id++, name:'Phase-1 maintenance check', due:'100 flight hrs', priority:'medium', status:'open' });
  tasks.push({ id: id++, name:'Propeller balance inspection', due:'120 flight hrs', priority:'low', status:'open' });
  tasks.push({ id: id++, name:'EFI injector cleaning', due:'200 flight hrs', priority:'low', status:'open' });
  return tasks;
}

// ─── History Seeder ───────────────────────────────────────────────────────────
function seedHistory(t, n = 30) {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const nz = () => (Math.random() - 0.5) * 0.04;
    const d = localDiagnose(t);
    const soh = computeSOH(t, d);
    return {
      time: new Date(now - (n - i) * 2000).toLocaleTimeString(),
      rpm:          t.rpm          * (1 + nz()),
      cht:          t.cht          * (1 + nz()),
      egt:          t.egt          * (1 + nz()),
      oil_pressure: t.oil_pressure * (1 + nz()),
      oil_temp:     t.oil_temp     * (1 + nz()),
      vibration:    t.vibration    * (1 + nz()),
      fuel_flow:    t.fuel_flow    * (1 + nz()),
      health_score: soh.overall,
      anomaly_score: soh.anomalyScore,
    };
  });
}

function generateRandom() {
  const r = { ...NOMINAL };
  const keys = Object.keys(NOMINAL).sort(() => Math.random() - 0.5).slice(0, 4);
  keys.forEach(k => { r[k] = NOMINAL[k] * (0.72 + Math.random() * 0.65); });
  return r;
}

// ─── Maintenance Recommendations ──────────────────────────────────────────────
function buildMaintenanceRecs(diag, soh) {
  const recs = [];
  if (soh.oilScore < 70) {
    recs.push({
      id: 'oil_rec', priority: soh.oilScore < 50 ? 'HIGH' : 'MEDIUM',
      icon: soh.oilScore < 50 ? '🔴' : '⚠️',
      title: 'Oil System Degradation Detected',
      detail: 'Oil pressure shows persistent downward trend. Potential lubrication system degradation.',
      recommendation: 'Inspect lubrication system during next maintenance interval.',
      confidence: 87,
    });
  }
  if (soh.thermalScore < 70) {
    recs.push({
      id: 'thermal_rec', priority: soh.thermalScore < 50 ? 'HIGH' : 'MEDIUM',
      icon: soh.thermalScore < 50 ? '🔴' : '⚠️',
      title: 'Thermal System Anomaly',
      detail: `CHT/EGT readings above nominal baseline. Potential cooling system degradation.`,
      recommendation: soh.thermalScore < 50
        ? 'Immediate inspection required. Reduce power and inspect cooling system.'
        : 'Inspect cooling fins, coolant level, and thermostat during next maintenance.',
      confidence: 92,
    });
  }
  if (soh.vibScore < 65) {
    recs.push({
      id: 'vib_rec', priority: 'HIGH',
      icon: '🔴',
      title: 'Excessive Vibration Detected',
      detail: 'Vibration levels exceed normal operating envelope. Potential bearing/propeller imbalance.',
      recommendation: 'Inspect propeller balance, engine mounts, and crankshaft bearings.',
      confidence: 89,
    });
  }
  if (recs.length === 0) {
    recs.push({
      id: 'nominal_rec', priority: 'LOW',
      icon: '✅',
      title: 'All Systems Nominal',
      detail: 'No degradation trends detected across all monitored subsystems.',
      recommendation: 'Continue scheduled maintenance intervals. Next inspection at 50 flight hrs.',
      confidence: 97,
    });
  }
  return recs;
}

// ─── Fault Propagation Steps ──────────────────────────────────────────────────
const FAULT_PROPAGATION = {
  low_oil_pressure: [
    '🔵 Oil pressure sensor detecting decreasing pressure...',
    '📉 Telemetry: Oil pressure 4.5 → 3.8 → 3.2 bar',
    '⚡ Data processing flags abnormal downward trend',
    '🔬 Digital Twin: Expected 4.8 bar | Actual 3.2 bar | Δ = -1.6 bar ⚠️',
    '🤖 AI Model: Anomaly score climbing... 18 → 55 → 82',
    '📊 Health Index decreasing: 87% → 72% → 64%',
    '🚨 Fault classification: Possible Lubrication System Degradation',
    '⏱️ RUL updated: 126 hrs → 68 hrs → 48 hrs',
    '🔧 Maintenance recommendation generated — PRIORITY: HIGH',
  ],
  high_cht: [
    '🔵 CHT sensor detecting elevated temperature...',
    '📉 Telemetry: CHT 110 → 128 → 148°C',
    '⚡ Data processing flags thermal anomaly',
    '🔬 Digital Twin: Expected 112°C | Actual 148°C | Δ = +36°C ⚠️',
    '🤖 AI Model: Anomaly score: 18 → 61 → 79',
    '📊 Health Index: 87% → 70% → 58%',
    '🚨 Fault: Cylinder Head / Cooling System Overheating',
    '⏱️ RUL updated: 126 hrs → 55 hrs',
    '🔧 Action: Reduce throttle 20%, enrich mixture — PRIORITY: HIGH',
  ],
  excessive_vibration: [
    '🔵 Vibration sensor detecting anomalous oscillation...',
    '📉 Telemetry: Vibration 1.1 → 2.3 → 3.5 mm/s',
    '⚡ Data processing flags vibration beyond normal envelope',
    '🔬 Digital Twin: Expected 1.2 mm/s | Actual 3.5 mm/s | Δ = +2.3 ⚠️',
    '🤖 AI Model: Anomaly score: 18 → 67 → 88',
    '📊 Health Index: 87% → 63% → 51%',
    '🚨 Fault: Crankshaft Main Bearing Wear',
    '⏱️ RUL updated: 126 hrs → 38 hrs',
    '🔧 Action: Reduce RPM 500. Inspect bearings post-flight — PRIORITY: HIGH',
  ],
};

// ─── Store ────────────────────────────────────────────────────────────────────
const initT = { ...PRESETS.nominal, engineLoad: 62 };
const initD = localDiagnose(initT);
const initSOH = computeSOH(initT, initD);
const initPhysics = computePhysicsExpected(initT);
const initThresholds = { ...DEFAULT_THRESHOLDS };

export const useEngineStore = create((set, get) => {
  let ws = null;
  let mockInterval = null;
  let streamPaused = false;

  function startMock() {
    if (mockInterval) return;
    mockInterval = setInterval(() => {
      if (streamPaused) return;
      const st = get();
      if (!st.engineRunning) return;
      const base = st.telemetry;
      const nz = (v, p = 0.015) => v * (1 + (Math.random() - 0.5) * 2 * p);
      const next = {
        rpm: nz(base.rpm), cht: nz(base.cht, 0.01), egt: nz(base.egt, 0.012),
        oil_pressure: nz(base.oil_pressure, 0.018), oil_temp: nz(base.oil_temp, 0.01),
        fuel_flow: nz(base.fuel_flow, 0.02), map: nz(base.map, 0.01),
        vibration: nz(base.vibration, 0.04), voltage: nz(base.voltage, 0.005),
        altitude: nz(base.altitude, 0.003), ambient_temp: base.ambient_temp,
        afr: nz(base.afr, 0.015),
        engineLoad: base.engineLoad,
      };
      const d = localDiagnose(next);
      const soh = computeSOH(next, d);
      const physics = computePhysicsExpected(next);
      const thr = get().thresholds;
      const newAlerts = buildAlerts(next, d, thr);
      const newRecs = buildMaintenanceRecs(d, soh);
      set(s => ({
        telemetry: next, diagnosis: d,
        soh, physicsExpected: physics,
        maintenanceRecs: newRecs,
        alerts: newAlerts,
        tasks: s.tasks.length ? s.tasks : buildTasks(d),
        unreadCount: newAlerts.filter(a => !a.read).length,
        history: [...s.history, {
          time: new Date().toLocaleTimeString(),
          rpm: next.rpm, cht: next.cht, egt: next.egt,
          oil_pressure: next.oil_pressure, oil_temp: next.oil_temp,
          vibration: next.vibration, fuel_flow: next.fuel_flow,
          health_score: soh.overall,
          anomaly_score: soh.anomalyScore,
        }].slice(-80)
      }));
    }, 1800);
  }

  function stopMock() { if (mockInterval) { clearInterval(mockInterval); mockInterval = null; } }

  return {
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
    darkMode:          false,
    engineRunning:     false,

    // Fault injection state
    activeFault:       null,
    faultPropagationLog: [],
    faultPropagating:  false,

    // Pipeline animation state
    pipelineActiveStep: -1,

    setDrawerOpen:    (v) => set({ drawerOpen: v }),
    setSelectedPart:  (p) => set({ selectedPart: p }),
    setDarkMode:      (v) => set({ darkMode: v }),

    pauseStream: () => { streamPaused = true; set({ streamPaused: true }); },
    resumeStream: () => { streamPaused = false; set({ streamPaused: false }); },

    // ── Engine Controls ────────────────────────────────────────────────────
    startEngine: () => {
      startMock();
      set({ engineRunning: true });
    },
    stopEngine: () => {
      set({ engineRunning: false });
    },

    increaseRpm: () => {
      set(s => {
        const next = { ...s.telemetry, rpm: Math.min(5500, s.telemetry.rpm + 200) };
        const d = localDiagnose(next);
        const soh = computeSOH(next, d);
        const physics = computePhysicsExpected(next);
        return { telemetry: next, diagnosis: d, soh, physicsExpected: physics };
      });
    },

    decreaseRpm: () => {
      set(s => {
        const next = { ...s.telemetry, rpm: Math.max(2000, s.telemetry.rpm - 200) };
        const d = localDiagnose(next);
        const soh = computeSOH(next, d);
        const physics = computePhysicsExpected(next);
        return { telemetry: next, diagnosis: d, soh, physicsExpected: physics };
      });
    },

    applyLoad: (loadPct) => {
      set(s => {
        const next = { ...s.telemetry, engineLoad: loadPct,
          rpm: NOMINAL.rpm * (0.8 + (loadPct / 100) * 0.4),
          cht: NOMINAL.cht + loadPct * 0.4,
          egt: NOMINAL.egt + loadPct * 0.5,
          fuel_flow: NOMINAL.fuel_flow + (loadPct / 100) * 6,
        };
        const d = localDiagnose(next);
        const soh = computeSOH(next, d);
        const physics = computePhysicsExpected(next);
        return { telemetry: next, diagnosis: d, soh, physicsExpected: physics };
      });
    },

    // ── Fault Injection ────────────────────────────────────────────────────
    injectFault: (faultKey) => {
      const faultTelemetry = PRESETS[faultKey] || PRESETS.nominal;
      const propSteps = FAULT_PROPAGATION[faultKey] || [];

      set({ activeFault: faultKey, faultPropagationLog: [], faultPropagating: true });

      // Animate propagation steps
      propSteps.forEach((step, i) => {
        setTimeout(() => {
          set(s => ({ faultPropagationLog: [...s.faultPropagationLog, step] }));
          if (i === propSteps.length - 1) {
            set({ faultPropagating: false });
          }
        }, i * 800);
      });

      // After 1s, apply fault telemetry gradually
      setTimeout(() => {
        const d = localDiagnose(faultTelemetry);
        const soh = computeSOH(faultTelemetry, d);
        const physics = computePhysicsExpected(faultTelemetry);
        const thr = get().thresholds;
        const newAlerts = buildAlerts(faultTelemetry, d, thr);
        const newRecs = buildMaintenanceRecs(d, soh);
        set({
          preset: faultKey,
          telemetry: { ...faultTelemetry, engineLoad: get().telemetry.engineLoad ?? 62 },
          diagnosis: d, soh, physicsExpected: physics,
          alerts: newAlerts, maintenanceRecs: newRecs,
          tasks: buildTasks(d),
          unreadCount: newAlerts.filter(a => !a.read).length,
          history: seedHistory(faultTelemetry),
        });
      }, 1200);
    },

    resetFault: () => {
      const t = { ...PRESETS.nominal, engineLoad: 62 };
      const d = localDiagnose(t);
      const soh = computeSOH(t, d);
      const physics = computePhysicsExpected(t);
      const thr = get().thresholds;
      const newAlerts = buildAlerts(t, d, thr);
      set({
        activeFault: null, faultPropagationLog: [], faultPropagating: false,
        preset: 'nominal', telemetry: t, diagnosis: d, soh, physicsExpected: physics,
        alerts: newAlerts, maintenanceRecs: buildMaintenanceRecs(d, soh),
        tasks: buildTasks(d), history: seedHistory(t),
        unreadCount: newAlerts.filter(a => !a.read).length,
      });
    },

    // ── Existing actions ───────────────────────────────────────────────────
    markAllRead: () => set(s => ({
      alerts: s.alerts.map(a => ({ ...a, read: true })),
      unreadCount: 0
    })),

    markAlertRead: (id) => set(s => {
      const alerts = s.alerts.map(a => a.id === id ? { ...a, read: true } : a);
      return { alerts, unreadCount: alerts.filter(a => !a.read).length };
    }),

    setTaskStatus: (id, status) => set(s => ({
      tasks: s.tasks.map(t => t.id === id ? { ...t, status } : t)
    })),

    setThreshold: (key, val) => set(s => {
      const thresholds = { ...s.thresholds, [key]: parseFloat(val) };
      return { thresholds };
    }),

    setPreset: (name) => {
      const t = name === 'random' ? generateRandom() : (PRESETS[name] || NOMINAL);
      const tWithLoad = { ...t, engineLoad: 62 };
      const d = localDiagnose(tWithLoad);
      const soh = computeSOH(tWithLoad, d);
      const physics = computePhysicsExpected(tWithLoad);
      const thr = get().thresholds;
      set({
        preset: name, telemetry: tWithLoad, diagnosis: d, soh, physicsExpected: physics,
        history: seedHistory(tWithLoad), alerts: buildAlerts(tWithLoad, d, thr),
        maintenanceRecs: buildMaintenanceRecs(d, soh),
        tasks: buildTasks(d),
        unreadCount: buildAlerts(tWithLoad, d, thr).filter(a => !a.read).length
      });
      if (ws && ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ preset: name }));
      diagnose(tWithLoad).then(d2 => {
        const newAlerts = buildAlerts(tWithLoad, d2, get().thresholds);
        set({ diagnosis: d2, alerts: newAlerts, unreadCount: newAlerts.filter(a => !a.read).length });
      }).catch(() => {});
    },

    runDiagnosis: async (t) => {
      set({ telemetry: t });
      const d = await diagnose(t);
      const soh = computeSOH(t, d);
      const physics = computePhysicsExpected(t);
      const thr = get().thresholds;
      const newAlerts = buildAlerts(t, d, thr);
      set({ diagnosis: d, soh, physicsExpected: physics,
        history: seedHistory(t), alerts: newAlerts, tasks: buildTasks(d),
        maintenanceRecs: buildMaintenanceRecs(d, soh),
        unreadCount: newAlerts.filter(a => !a.read).length });
    },

    setTelemetryValue: (key, val) => {
      set(s => {
        const next = { ...s.telemetry, [key]: parseFloat(val) };
        const d = localDiagnose(next);
        const soh = computeSOH(next, d);
        const physics = computePhysicsExpected(next);
        diagnose(next).then(d2 => set({ diagnosis: d2 })).catch(() => {});
        return { telemetry: next, diagnosis: d, soh, physicsExpected: physics };
      });
    },

    connectWebSocket: () => {
      const url = getWsUrl();
      if (!url) { startMock(); return; }
      if (ws) return;
      const connect = () => {
        ws = new WebSocket(url);
        ws.onopen = () => { set({ wsConnected: true }); stopMock(); ws.send(JSON.stringify({ preset: get().preset })); };
        ws.onmessage = (e) => {
          if (streamPaused) return;
          const data = JSON.parse(e.data);
          if (data.telemetry) {
            const next = data.telemetry;
            const d = localDiagnose(next);
            const soh = computeSOH(next, d);
            const physics = computePhysicsExpected(next);
            const thr = get().thresholds;
            const newAlerts = buildAlerts(next, d, thr);
            set(s => ({
              telemetry: next, diagnosis: d, soh, physicsExpected: physics,
              alerts: newAlerts, unreadCount: newAlerts.filter(a => !a.read).length,
              history: [...s.history, {
                time: new Date().toLocaleTimeString(), ...next,
                health_score: soh.overall, anomaly_score: soh.anomalyScore
              }].slice(-80)
            }));
            diagnose(next).then(d2 => set({ diagnosis: d2 })).catch(() => {});
          }
        };
        ws.onclose = () => { set({ wsConnected: false }); ws = null; startMock(); setTimeout(connect, 5000); };
        ws.onerror = () => { if (ws) ws.close(); };
      };
      connect();
    }
  };
});
