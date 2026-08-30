import { create } from 'zustand';

const nominalValues = {
  rpm: 4800,
  cht: 110,
  egt: 810,
  oil_pressure: 380,
  oil_temp: 92,
  fuel_flow: 18.5,
  map: 101,
  vibration: 1.1,
  voltage: 14.2,
  altitude: 2500,
  ambient_temp: 15,
  afr: 14.7
};

export const useEngineStore = create((set, get) => {
  let ws = null;

  return {
    // Current variables state
    telemetry: { ...nominalValues },
    
    // UI active states
    preset: 'nominal', // nominal, overheating, oil_starvation, bearing_wear, lean_misfire
    selectedPart: 'cylinders', // cylinders, oil_system, fuel_system, cooling, ignition, crankshaft
    
    // History log for scrolling Recharts graphs
    history: [],
    
    // Connection and diagnosis states
    wsConnected: false,
    diagnosis: {
      status: 'Healthy',
      fault_component: 'Propulsion Core',
      fault_type: 'Healthy',
      confidence: 1.0,
      mission_reliability_score: 100,
      reasoning: ['All core sensor telemetry reporting in nominal operating bands.'],
      recommended_action: 'Advisory: Cruise nominal. No actions required.'
    },

    // Handlers
    setPreset: (presetName) => {
      set({ preset: presetName });
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ preset: presetName }));
      } else {
        // If websocket is offline, mock the values immediately
        const mockTargets = {
          nominal: nominalValues,
          overheating: { ...nominalValues, rpm: 5200, cht: 138, egt: 895, oil_temp: 114, fuel_flow: 21 },
          oil_starvation: { ...nominalValues, rpm: 4700, cht: 122, oil_pressure: 175, oil_temp: 126, vibration: 1.8 },
          bearing_wear: { ...nominalValues, rpm: 4600, cht: 115, oil_temp: 108, vibration: 3.2 },
          lean_misfire: { ...nominalValues, rpm: 4400, fuel_flow: 13.2, egt: 865, vibration: 1.6, afr: 16.8 }
        };
        const target = mockTargets[presetName] || nominalValues;
        set({ telemetry: target });
        get().triggerDiagnosis(target);
      }
    },

    setSelectedPart: (part) => set({ selectedPart: part }),

    setTelemetryValue: (key, val) => {
      set(state => {
        const nextTelemetry = { ...state.telemetry, [key]: parseFloat(val) };
        
        // Push manual changes over WS if connected
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ manual_adjust: { [key]: parseFloat(val) } }));
        }
        
        // Trigger diagnostic re-evaluation
        get().triggerDiagnosis(nextTelemetry);
        
        return { telemetry: nextTelemetry };
      });
    },

    triggerDiagnosis: async (telemetryData) => {
      try {
        const res = await fetch('http://localhost:3000/api/diagnose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(telemetryData)
        });
        if (res.ok) {
          const diagResult = await res.json();
          set({ diagnosis: diagResult });
        }
      } catch (err) {
        console.warn("Unable to reach FastAPI diagnostics endpoint. Running fallback calculations.");
        // Simple local fallback calculations so UI never crashes if backend is warming up
        const score = telemetryData.cht > 130 || telemetryData.oil_pressure < 200 ? 45 : 98;
        set({
          diagnosis: {
            status: score < 50 ? 'Critical' : 'Healthy',
            fault_component: telemetryData.oil_pressure < 200 ? 'Oil Pump System' : 'Propulsion Core',
            fault_type: telemetryData.oil_pressure < 200 ? 'Oil Starvation' : 'Healthy',
            confidence: 0.9,
            mission_reliability_score: score,
            reasoning: ['FastAPI connection offline. Using local heuristics.'],
            recommended_action: 'Ensure backend server is running on port 3000.'
          }
        });
      }
    },

    connectWebSocket: () => {
      if (ws) return;
      
      const connect = () => {
        ws = new WebSocket('ws://localhost:3000/ws/telemetry');
        
        ws.onopen = () => {
          set({ wsConnected: true });
          // Send current preset on connect
          ws.send(JSON.stringify({ preset: get().preset }));
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.telemetry) {
            set({ telemetry: data.telemetry });
            get().triggerDiagnosis(data.telemetry);
            
            // Manage Recharts sliding history window
            set(state => {
              const newHist = [...state.history, { 
                time: new Date().toLocaleTimeString().slice(-8), 
                ...data.telemetry 
              }];
              if (newHist.length > 30) newHist.shift();
              return { history: newHist };
            });
          }
        };

        ws.onclose = () => {
          set({ wsConnected: false });
          ws = null;
          // Reconnect attempt in 4 seconds
          setTimeout(connect, 4000);
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      };
      
      connect();
    }
  };
});
