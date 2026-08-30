import { create } from 'zustand';
import { diagnose, getWsUrl, localDiagnose } from '../lib/api';

// ─── Nominal reference values ────────────────────────────────────────────────
export const NOMINAL = {
  rpm: 4800, cht: 110, egt: 810, oil_pressure: 380,
  oil_temp: 92, fuel_flow: 18.5, map: 101, vibration: 1.1,
  voltage: 14.2, altitude: 2500, ambient_temp: 15, afr: 14.7
};

// ─── Fault preset target parameters ─────────────────────────────────────────
const PRESETS = {
  nominal:        { ...NOMINAL },
  overheating:    { ...NOMINAL, rpm: 5200, cht: 138, egt: 895, oil_temp: 114, fuel_flow: 21 },
  oil_starvation: { ...NOMINAL, rpm: 4700, cht: 122, oil_pressure: 175, oil_temp: 126, vibration: 1.8 },
  bearing_wear:   { ...NOMINAL, rpm: 4600, cht: 115, oil_temp: 108, vibration: 3.2 },
  lean_misfire:   { ...NOMINAL, rpm: 4400, fuel_flow: 13.2, egt: 865, vibration: 1.6, afr: 16.8 },
  random:         null  // generated dynamically
};

function generateRandom() {
  const keys = Object.keys(NOMINAL);
  const result = { ...NOMINAL };
  // randomly perturb 3-4 keys
  const toPerturb = keys.sort(() => Math.random() - 0.5).slice(0, 4);
  toPerturb.forEach(k => {
    result[k] = NOMINAL[k] * (0.75 + Math.random() * 0.6);
  });
  return result;
}

// ─── Seed mock history (for TrendCharts on first render without WS) ──────────
function seedHistory(telemetry, count = 20) {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const noise = () => (Math.random() - 0.5) * 0.04;
    return {
      time: new Date(now - (count - i) * 2000).toLocaleTimeString(),
      rpm:          telemetry.rpm          * (1 + noise()),
      cht:          telemetry.cht          * (1 + noise()),
      egt:          telemetry.egt          * (1 + noise()),
      oil_pressure: telemetry.oil_pressure * (1 + noise()),
      oil_temp:     telemetry.oil_temp     * (1 + noise()),
      vibration:    telemetry.vibration    * (1 + noise())
    };
  });
}

// ─── Store ───────────────────────────────────────────────────────────────────
export const useEngineStore = create((set, get) => {
  let ws = null;
  let mockInterval = null;

  // ── Simulated telemetry stream (when no WebSocket backend is available) ──
  function startMockStream() {
    if (mockInterval) return;
    mockInterval = setInterval(() => {
      const base = get().telemetry;
      const noise = (v, pct = 0.015) => v * (1 + (Math.random() - 0.5) * 2 * pct);
      const next = {
        rpm:          noise(base.rpm),
        cht:          noise(base.cht, 0.01),
        egt:          noise(base.egt, 0.012),
        oil_pressure: noise(base.oil_pressure, 0.018),
        oil_temp:     noise(base.oil_temp, 0.01),
        fuel_flow:    noise(base.fuel_flow, 0.02),
        map:          noise(base.map, 0.01),
        vibration:    noise(base.vibration, 0.04),
        voltage:      noise(base.voltage, 0.005),
        altitude:     noise(base.altitude, 0.003),
        ambient_temp: base.ambient_temp,
        afr:          noise(base.afr, 0.015)
      };
      set(state => {
        const newHist = [
          ...state.history,
          { time: new Date().toLocaleTimeString(), ...next }
        ].slice(-30);
        return { telemetry: next, history: newHist };
      });
      // Re-diagnose silently every mock tick
      diagnose(next).then(d => set({ diagnosis: d })).catch(() => {
        set({ diagnosis: localDiagnose(next) });
      });
    }, 1800);
  }

  function stopMockStream() {
    if (mockInterval) { clearInterval(mockInterval); mockInterval = null; }
  }

  const initialTelemetry = { ...NOMINAL };
  const initialDiag = localDiagnose(initialTelemetry);

  return {
    telemetry: initialTelemetry,
    preset: 'nominal',
    selectedPart: 'cylinders',
    history: seedHistory(initialTelemetry),
    wsConnected: false,
    diagnosis: { ...initialDiag, mission_reliability_score: 100 },

    // ── Preset loader ─────────────────────────────────────────────────────
    setPreset: (presetName) => {
      const target = presetName === 'random'
        ? generateRandom()
        : (PRESETS[presetName] || NOMINAL);

      set({ preset: presetName, telemetry: target, history: seedHistory(target) });

      // Push over WS if connected
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ preset: presetName }));
      }

      // Always run diagnosis immediately
      diagnose(target).then(d => set({ diagnosis: d })).catch(() => {
        set({ diagnosis: localDiagnose(target) });
      });
    },

    setSelectedPart: (part) => set({ selectedPart: part }),

    // ── Manual slider adjustment ──────────────────────────────────────────
    setTelemetryValue: (key, val) => {
      set(state => {
        const next = { ...state.telemetry, [key]: parseFloat(val) };
        diagnose(next).then(d => set({ diagnosis: d })).catch(() => {
          set({ diagnosis: localDiagnose(next) });
        });
        return { telemetry: next };
      });
    },

    // ── WebSocket connection ──────────────────────────────────────────────
    connectWebSocket: () => {
      const wsUrl = getWsUrl();
      if (!wsUrl) {
        // No backend — start mock stream
        startMockStream();
        return;
      }
      if (ws) return;

      const connect = () => {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          set({ wsConnected: true });
          stopMockStream();
          ws.send(JSON.stringify({ preset: get().preset }));
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.telemetry) {
            set({ telemetry: data.telemetry });
            diagnose(data.telemetry).then(d => set({ diagnosis: d })).catch(() => {
              set({ diagnosis: localDiagnose(data.telemetry) });
            });
            set(state => {
              const newHist = [
                ...state.history,
                { time: new Date().toLocaleTimeString(), ...data.telemetry }
              ].slice(-30);
              return { history: newHist };
            });
          }
        };

        ws.onclose = () => {
          set({ wsConnected: false });
          ws = null;
          startMockStream();       // fallback to mock on disconnect
          setTimeout(connect, 5000);
        };

        ws.onerror = () => { if (ws) ws.close(); };
      };

      connect();
    }
  };
});
