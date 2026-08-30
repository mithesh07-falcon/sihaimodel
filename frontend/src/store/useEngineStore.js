import { create } from 'zustand';
import { diagnose, getWsUrl, localDiagnose, NOMINAL } from '../lib/api';

const PRESETS = {
  nominal:        { ...NOMINAL },
  overheating:    { ...NOMINAL, rpm:5200, cht:138, egt:895, oil_temp:114, fuel_flow:21 },
  oil_starvation: { ...NOMINAL, rpm:4700, cht:122, oil_pressure:175, oil_temp:126, vibration:1.8 },
  bearing_wear:   { ...NOMINAL, rpm:4600, cht:115, oil_temp:108, vibration:3.2 },
  lean_misfire:   { ...NOMINAL, rpm:4400, fuel_flow:13.2, egt:865, vibration:1.6, afr:16.8 },
};

const DEFAULT_THRESHOLDS = {
  cht_warn: 125, cht_crit: 135,
  oil_pressure_warn: 280, oil_pressure_crit: 200,
  vibration_warn: 2.0, vibration_crit: 3.0,
  egt_warn: 870, egt_crit: 910,
  afr_warn: 15.5, afr_crit: 16.5,
};

function generateRandom() {
  const r = { ...NOMINAL };
  const keys = Object.keys(NOMINAL).sort(() => Math.random() - 0.5).slice(0, 4);
  keys.forEach(k => { r[k] = NOMINAL[k] * (0.72 + Math.random() * 0.65); });
  return r;
}

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

function seedHistory(t, n = 30) {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const nz = () => (Math.random() - 0.5) * 0.04;
    const d = localDiagnose(t);
    return {
      time: new Date(now - (n - i) * 2000).toLocaleTimeString(),
      rpm:          t.rpm          * (1 + nz()),
      cht:          t.cht          * (1 + nz()),
      egt:          t.egt          * (1 + nz()),
      oil_pressure: t.oil_pressure * (1 + nz()),
      oil_temp:     t.oil_temp     * (1 + nz()),
      vibration:    t.vibration    * (1 + nz()),
      fuel_flow:    t.fuel_flow    * (1 + nz()),
      health_score: Math.max(0, Math.min(100, d.mission_reliability_score + Math.round((Math.random()-0.5)*6)))
    };
  });
}

const initT = PRESETS.nominal;
const initD = localDiagnose(initT);
const initThresholds = { ...DEFAULT_THRESHOLDS };

export const useEngineStore = create((set, get) => {
  let ws = null;
  let mockInterval = null;
  let streamPaused = false;

  function startMock() {
    if (mockInterval) return;
    mockInterval = setInterval(() => {
      if (streamPaused) return;
      const base = get().telemetry;
      const nz = (v, p = 0.015) => v * (1 + (Math.random() - 0.5) * 2 * p);
      const next = {
        rpm: nz(base.rpm), cht: nz(base.cht, 0.01), egt: nz(base.egt, 0.012),
        oil_pressure: nz(base.oil_pressure, 0.018), oil_temp: nz(base.oil_temp, 0.01),
        fuel_flow: nz(base.fuel_flow, 0.02), map: nz(base.map, 0.01),
        vibration: nz(base.vibration, 0.04), voltage: nz(base.voltage, 0.005),
        altitude: nz(base.altitude, 0.003), ambient_temp: base.ambient_temp,
        afr: nz(base.afr, 0.015)
      };
      const d = localDiagnose(next);
      const thr = get().thresholds;
      const newAlerts = buildAlerts(next, d, thr);
      set(s => {
        const prevUnread = s.alerts.filter(a => !a.read).length;
        const newUnread = newAlerts.filter(a => !a.read).length;
        return {
          telemetry: next, diagnosis: d,
          alerts: newAlerts,
          tasks: s.tasks.length ? s.tasks : buildTasks(d),
          unreadCount: newUnread,
          history: [...s.history, {
            time: new Date().toLocaleTimeString(),
            rpm: next.rpm, cht: next.cht, egt: next.egt,
            oil_pressure: next.oil_pressure, oil_temp: next.oil_temp,
            vibration: next.vibration, fuel_flow: next.fuel_flow,
            health_score: d.mission_reliability_score
          }].slice(-60)
        };
      });
    }, 1800);
  }

  function stopMock() { if (mockInterval) { clearInterval(mockInterval); mockInterval = null; } }

  return {
    telemetry:    initT,
    preset:       'nominal',
    diagnosis:    initD,
    history:      seedHistory(initT),
    alerts:       buildAlerts(initT, initD, initThresholds),
    tasks:        buildTasks(initD),
    thresholds:   initThresholds,
    unreadCount:  0,
    wsConnected:  false,
    drawerOpen:   false,
    streamPaused: false,
    selectedPart: null,
    darkMode:     false,

    setDrawerOpen:   (v) => set({ drawerOpen: v }),
    setSelectedPart: (p) => set({ selectedPart: p }),
    setDarkMode:     (v) => set({ darkMode: v }),

    pauseStream: () => { streamPaused = true; set({ streamPaused: true }); },
    resumeStream: () => { streamPaused = false; set({ streamPaused: false }); },

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
      const d = localDiagnose(t);
      const thr = get().thresholds;
      set({
        preset: name, telemetry: t, diagnosis: d,
        history: seedHistory(t), alerts: buildAlerts(t, d, thr),
        tasks: buildTasks(d),
        unreadCount: buildAlerts(t, d, thr).filter(a => !a.read).length
      });
      if (ws && ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ preset: name }));
      diagnose(t).then(d2 => {
        const newAlerts = buildAlerts(t, d2, get().thresholds);
        set({ diagnosis: d2, alerts: newAlerts, unreadCount: newAlerts.filter(a => !a.read).length });
      }).catch(() => {});
    },

    runDiagnosis: async (t) => {
      set({ telemetry: t });
      const d = await diagnose(t);
      const thr = get().thresholds;
      const newAlerts = buildAlerts(t, d, thr);
      set({ diagnosis: d, history: seedHistory(t), alerts: newAlerts, tasks: buildTasks(d), unreadCount: newAlerts.filter(a => !a.read).length });
    },

    setTelemetryValue: (key, val) => {
      set(s => {
        const next = { ...s.telemetry, [key]: parseFloat(val) };
        diagnose(next).then(d => set({ diagnosis: d })).catch(() => {});
        return { telemetry: next };
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
            const thr = get().thresholds;
            const newAlerts = buildAlerts(next, d, thr);
            set(s => ({
              telemetry: next, diagnosis: d, alerts: newAlerts,
              unreadCount: newAlerts.filter(a => !a.read).length,
              history: [...s.history, { time: new Date().toLocaleTimeString(), ...next, health_score: d.mission_reliability_score }].slice(-60)
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
