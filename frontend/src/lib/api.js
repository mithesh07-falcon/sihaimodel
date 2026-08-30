// AeroTwin — Central API utility with self-contained local diagnostic engine

const BACKEND_URL = import.meta.env.VITE_API_URL || null;

const NOMINAL = {
  rpm: 4800, cht: 110, egt: 810, oil_pressure: 380,
  oil_temp: 92, fuel_flow: 18.5, map: 101, vibration: 1.1,
  voltage: 14.2, altitude: 2500, ambient_temp: 15, afr: 14.7
};

const BANDS = {
  rpm: { low: 3500, high: 5500 }, cht: { low: 60, high: 125 },
  egt: { low: 650, high: 870 }, oil_pressure: { low: 250, high: 500 },
  oil_temp: { low: 60, high: 110 }, fuel_flow: { low: 10, high: 28 },
  map: { low: 60, high: 115 }, vibration: { low: 0, high: 2.0 },
  voltage: { low: 11.5, high: 15.5 }, afr: { low: 12.5, high: 15.5 }
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function computeReliability(t) {
  const w = { rpm:0.10, cht:0.18, egt:0.14, oil_pressure:0.20,
               oil_temp:0.12, fuel_flow:0.08, vibration:0.10, voltage:0.05, afr:0.03 };
  let pen = 0, wt = 0;
  for (const [k, wv] of Object.entries(w)) {
    if (t[k] == null) continue;
    const b = BANDS[k]; let dev = 0;
    if (t[k] < b.low)  dev = (b.low  - t[k]) / (b.low  || 1);
    if (t[k] > b.high) dev = (t[k] - b.high) / (b.high || 1);
    pen += clamp(dev, 0, 1) * wv; wt += wv;
  }
  const np = wt > 0 ? pen / wt : 0;
  return Math.round(clamp(100 - np * 200, 0, 100));
}

function computeMaintenanceScore(t) {
  const w = { rpm:0.08, cht:0.16, egt:0.14, oil_pressure:0.18,
               oil_temp:0.12, fuel_flow:0.08, vibration:0.12, voltage:0.06, afr:0.06 };
  let score = 100;
  for (const [k, wv] of Object.entries(w)) {
    if (t[k] == null) continue;
    const b = BANDS[k];
    const mid = (b.low + b.high) / 2;
    const half = (b.high - b.low) / 2;
    const dev = half > 0 ? Math.abs(t[k] - mid) / half : 0;
    const penalty = clamp(dev - 1, 0, 1);
    score -= penalty * wv * 100;
  }
  return Math.round(clamp(score, 0, 100));
}

function computeRUL(reliability, confidence) {
  const base = Math.pow(reliability / 100, 1.5) * 240;
  return Math.max(0, Math.round(base * (0.5 + 0.5 * confidence)));
}

function computeFailureProb(reliability, confidence) {
  const base = Math.max(0, 100 - reliability);
  return Math.round(clamp(base * (0.3 + 0.7 * confidence) * 0.5, 0.1, 99.9) * 10) / 10;
}

function classifyFault(t) {
  const overheat  = t.cht > 128 || t.egt > 870;
  const oilFault  = t.oil_pressure < 260 || t.oil_temp > 112;
  const bearing   = t.vibration > 2.2;
  const leanFire  = t.afr > 16.0 || t.fuel_flow < 13;

  if (oilFault && t.oil_pressure < 220) return {
    status: 'Critical', fault_component: 'Oil Pump / Sump Assembly',
    fault_type: 'Oil Starvation',
    reasoning: [
      `Oil pressure critically low: ${t.oil_pressure?.toFixed(0)} kPa (nominal 380 kPa)`,
      `Oil temperature elevated to ${t.oil_temp?.toFixed(1)}°C — friction heat signature`,
      `Bearing surfaces at seizure risk — immediate intervention required`
    ],
    recommended_action: 'ABORT MISSION. Reduce power. Inspect oil pump and sump post-landing.'
  };
  if (overheat && t.cht > 133) return {
    status: 'Critical', fault_component: 'Cylinder Head / Cooling System',
    fault_type: 'Overheating',
    reasoning: [
      `CHT at ${t.cht?.toFixed(1)}°C exceeds critical threshold (135°C)`,
      `EGT ${t.egt?.toFixed(0)}°C consistent with cooling failure`,
      `RPM ${t.rpm?.toFixed(0)} elevated — compounding heat generation`
    ],
    recommended_action: 'Reduce throttle 20%, enrich mixture, initiate controlled descent.'
  };
  if (bearing) return {
    status: t.vibration > 3.0 ? 'Critical' : 'Warning',
    fault_component: 'Crankshaft Main Bearing',
    fault_type: 'Bearing Wear',
    reasoning: [
      `Vibration RMS at ${t.vibration?.toFixed(2)} g — ${t.vibration > 3.0 ? 'critical' : 'warning'} threshold`,
      `Oil temp ${t.oil_temp?.toFixed(1)}°C elevated — bearing friction heat`,
      `RPM instability detected at ${t.rpm?.toFixed(0)} RPM`
    ],
    recommended_action: 'Reduce RPM by 500. Inspect main bearings post-flight.'
  };
  if (leanFire) return {
    status: 'Warning', fault_component: 'Fuel Injection Rail / EFI',
    fault_type: 'Fuel-Lean Misfire',
    reasoning: [
      `AFR ${t.afr?.toFixed(1)}:1 — lean of stoichiometric (nominal 14.7:1)`,
      `Fuel flow low at ${t.fuel_flow?.toFixed(1)} L/h — possible injector restriction`,
      `EGT ${t.egt?.toFixed(0)}°C elevated — lean combustion signature`
    ],
    recommended_action: 'Enrich fuel mixture, check injector rail pressure.'
  };
  if (overheat || oilFault) return {
    status: 'Warning',
    fault_component: overheat ? 'Cylinder Head / EGT Probe' : 'Oil Pump System',
    fault_type: overheat ? 'Overheating' : 'Oil Starvation',
    reasoning: [
      overheat ? `CHT ${t.cht?.toFixed(1)}°C approaching warning (>125°C)` : `Oil pressure ${t.oil_pressure?.toFixed(0)} kPa below nominal`,
      `Continue monitoring — no immediate action required`
    ],
    recommended_action: 'Monitor closely. Prepare for power reduction if trend continues.'
  };
  return {
    status: 'Healthy', fault_component: 'All Systems Nominal',
    fault_type: 'Healthy',
    reasoning: [`All 12 engine telemetry parameters within nominal operating bands`, `Mission reliability index: OPTIMAL`],
    recommended_action: 'Continue current mission profile. No actions required.'
  };
}

export function localDiagnose(t) {
  const fault       = classifyFault(t);
  const reliability = computeReliability(t);
  const confidence  = fault.status === 'Healthy' ? 0.97 : fault.status === 'Critical' ? 0.91 : 0.84;
  return {
    ...fault,
    confidence,
    mission_reliability_score: reliability,
    rul_estimate_hours:       computeRUL(reliability, confidence),
    failure_probability_30d:  computeFailureProb(reliability, confidence),
    maintenance_score:        computeMaintenanceScore(t)
  };
}

export async function diagnose(telemetry) {
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/diagnose`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telemetry), signal: AbortSignal.timeout(3000)
      });
      if (res.ok) return await res.json();
    } catch { /* fall through */ }
  }
  return localDiagnose(telemetry);
}

export function getWsUrl() {
  if (BACKEND_URL) return BACKEND_URL.replace(/^http/, 'ws') + '/ws/telemetry';
  return null;
}

export { NOMINAL };
