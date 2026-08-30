import { create } from 'zustand';
import { diagnose, getWsUrl, localDiagnose, NOMINAL } from '../lib/api';

const PRESETS = {
  nominal:        { ...NOMINAL },
  overheating:    { ...NOMINAL, rpm:5200, cht:138, egt:895, oil_temp:114, fuel_flow:21 },
  oil_starvation: { ...NOMINAL, rpm:4700, cht:122, oil_pressure:175, oil_temp:126, vibration:1.8 },
  bearing_wear:   { ...NOMINAL, rpm:4600, cht:115, oil_temp:108, vibration:3.2 },
  lean_misfire:   { ...NOMINAL, rpm:4400, fuel_flow:13.2, egt:865, vibration:1.6, afr:16.8 },
  random:         null
};

function generateRandom() {
  const r = { ...NOMINAL };
  const keys = Object.keys(NOMINAL).sort(() => Math.random() - 0.5).slice(0, 4);
  keys.forEach(k => { r[k] = NOMINAL[k] * (0.72 + Math.random() * 0.65); });
  return r;
}

function seedHistory(t, n = 25) {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const nz = () => (Math.random() - 0.5) * 0.04;
    return {
      time: new Date(now - (n - i) * 2000).toLocaleTimeString(),
      rpm:          t.rpm          * (1 + nz()),
      cht:          t.cht          * (1 + nz()),
      egt:          t.egt          * (1 + nz()),
      oil_pressure: t.oil_pressure * (1 + nz()),
      oil_temp:     t.oil_temp     * (1 + nz()),
      vibration:    t.vibration    * (1 + nz()),
      fuel_flow:    t.fuel_flow    * (1 + nz()),
      health_score: Math.round(localDiagnose(t).mission_reliability_score * (1 + nz()))
    };
  });
}

function buildAlerts(t, diag) {
  const alerts = [];
  if (t.oil_pressure < 250)
    alerts.push({ id:'oil_p', sev:'critical', msg:'Oil pressure critically low', src:'Engine 1', ts: new Date().toLocaleTimeString() });
  if (t.cht > 125)
    alerts.push({ id:'cht_h', sev:'warning', msg:`CHT elevated — ${t.cht?.toFixed(1)}°C`, src:'Engine 1', ts: new Date().toLocaleTimeString() });
  if (t.vibration > 1.8)
    alerts.push({ id:'vib_h', sev: t.vibration > 3 ? 'critical' : 'warning', msg:`Shaft vibration spike — ${t.vibration?.toFixed(2)} g`, src:'Engine 1', ts: new Date().toLocaleTimeString() });
  if (t.afr > 16.0)
    alerts.push({ id:'afr_h', sev:'warning', msg:`Lean mixture detected — AFR ${t.afr?.toFixed(1)}`, src:'EFI System', ts: new Date().toLocaleTimeString() });
  alerts.push({ id:'spark', sev:'info', msg:'Spark plug wear prognosis — 35 hrs', src:'AI Prognosis', ts: new Date().toLocaleTimeString() });
  if (diag.status === 'Healthy')
    alerts.push({ id:'ok', sev:'info', msg:'All systems nominal', src:'Engine 1', ts: new Date().toLocaleTimeString() });
  return alerts;
}

function buildTasks(diag) {
  const tasks = [];
  if (diag.status === 'Critical')
    tasks.push({ id:'t1', name:'Oil System Inspection', due:'Immediate', priority:'high' });
  if (diag.status === 'Warning')
    tasks.push({ id:'t2', name:`Inspect ${diag.fault_component}`, due:'Next flight', priority:'medium' });
  tasks.push({ id:'t3', name:'Spark plug replacement', due:'35 flight hrs', priority:'low' });
  tasks.push({ id:'t4', name:'Oil filter change', due:'50 flight hrs', priority:'low' });
  tasks.push({ id:'t5', name:'Phase-1 maintenance check', due:'100 flight hrs', priority:'medium' });
  return tasks;
}

const init = PRESETS.nominal;
const initDiag = localDiagnose(init);

export const useEngineStore = create((set, get) => {
  let ws = null;
  let mockInterval = null;

  function startMock() {
    if (mockInterval) return;
    mockInterval = setInterval(() => {
      const base = get().telemetry;
      const nz = (v, p=0.015) => v * (1 + (Math.random()-0.5)*2*p);
      const next = { rpm:nz(base.rpm), cht:nz(base.cht,0.01), egt:nz(base.egt,0.012),
        oil_pressure:nz(base.oil_pressure,0.018), oil_temp:nz(base.oil_temp,0.01),
        fuel_flow:nz(base.fuel_flow,0.02), map:nz(base.map,0.01), vibration:nz(base.vibration,0.04),
        voltage:nz(base.voltage,0.005), altitude:nz(base.altitude,0.003),
        ambient_temp:base.ambient_temp, afr:nz(base.afr,0.015) };
      const d = localDiagnose(next);
      set(s => ({
        telemetry: next, diagnosis: d,
        alerts: buildAlerts(next, d), tasks: buildTasks(d),
        history: [...s.history, {
          time: new Date().toLocaleTimeString(), rpm:next.rpm, cht:next.cht,
          egt:next.egt, oil_pressure:next.oil_pressure, oil_temp:next.oil_temp,
          vibration:next.vibration, fuel_flow:next.fuel_flow, health_score:d.mission_reliability_score
        }].slice(-30)
      }));
    }, 1800);
  }

  function stopMock() { if (mockInterval) { clearInterval(mockInterval); mockInterval = null; } }

  return {
    telemetry:   init,
    preset:      'nominal',
    diagnosis:   initDiag,
    history:     seedHistory(init),
    alerts:      buildAlerts(init, initDiag),
    tasks:       buildTasks(initDiag),
    wsConnected: false,
    drawerOpen:  false,
    selectedPart: null,

    setDrawerOpen: (v) => set({ drawerOpen: v }),
    setSelectedPart: (p) => set({ selectedPart: p }),

    setPreset: (name) => {
      const t = name === 'random' ? generateRandom() : (PRESETS[name] || NOMINAL);
      const d = localDiagnose(t);
      set({ preset: name, telemetry: t, diagnosis: d,
            history: seedHistory(t), alerts: buildAlerts(t, d), tasks: buildTasks(d) });
      if (ws && ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ preset: name }));
      diagnose(t).then(d2 => set({ diagnosis: d2, alerts: buildAlerts(t, d2), tasks: buildTasks(d2) })).catch(() => {});
    },

    runDiagnosis: async (t) => {
      set({ telemetry: t });
      const d = await diagnose(t);
      set({ diagnosis: d, history: seedHistory(t), alerts: buildAlerts(t, d), tasks: buildTasks(d) });
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
          const data = JSON.parse(e.data);
          if (data.telemetry) {
            const next = data.telemetry;
            const d = localDiagnose(next);
            diagnose(next).then(d2 => set({ diagnosis: d2, alerts: buildAlerts(next, d2), tasks: buildTasks(d2) })).catch(() => {});
            set(s => ({
              telemetry: next, diagnosis: d,
              history: [...s.history, { time: new Date().toLocaleTimeString(), ...next, health_score: d.mission_reliability_score }].slice(-30)
            }));
          }
        };
        ws.onclose = () => { set({ wsConnected: false }); ws = null; startMock(); setTimeout(connect, 5000); };
        ws.onerror = () => { if (ws) ws.close(); };
      };
      connect();
    }
  };
});
