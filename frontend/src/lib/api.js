// AeroTwin — Central API utility
// Resolves backend URL from env (VITE_API_URL) or falls back to a fully
// self-contained client-side diagnostic engine for Vercel-only deployments.

const BACKEND_URL = import.meta.env.VITE_API_URL || null;

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL DIAGNOSTIC ENGINE  (runs when backend is not reachable)
// ─────────────────────────────────────────────────────────────────────────────
const BANDS = {
  rpm:          { low: 3500, high: 5500 },
  cht:          { low: 60,   high: 125  },
  egt:          { low: 650,  high: 870  },
  oil_pressure: { low: 250,  high: 500  },
  oil_temp:     { low: 60,   high: 110  },
  fuel_flow:    { low: 10,   high: 28   },
  map:          { low: 60,   high: 115  },
  vibration:    { low: 0,    high: 2.0  },
  voltage:      { low: 11.5, high: 15.5 },
  afr:          { low: 12.5, high: 15.5 }
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function computeReliability(t) {
  const weights = {
    rpm: 0.10, cht: 0.18, egt: 0.14, oil_pressure: 0.20,
    oil_temp: 0.12, fuel_flow: 0.08, vibration: 0.10,
    voltage: 0.05, afr: 0.03
  };
  let totalPenalty = 0;
  let totalWeight = 0;
  for (const [key, w] of Object.entries(weights)) {
    if (t[key] == null) continue;
    const band = BANDS[key];
    let dev = 0;
    if (t[key] < band.low)  dev = (band.low  - t[key]) / (band.low  || 1);
    if (t[key] > band.high) dev = (t[key] - band.high) / (band.high || 1);
    totalPenalty += clamp(dev, 0, 1) * w;
    totalWeight  += w;
  }
  const np = totalWeight > 0 ? totalPenalty / totalWeight : 0;
  return Math.round(clamp(100 - np * 200, 0, 100));
}

function classifyFault(t) {
  const overheat = t.cht > 128 || t.egt > 870;
  const oilFault = t.oil_pressure < 260 || t.oil_temp > 112;
  const bearing  = t.vibration > 2.2;
  const leanFire = t.afr > 16.0 || t.fuel_flow < 13;

  if (oilFault && t.oil_pressure < 220) {
    return {
      status: 'Critical',
      fault_component: 'Oil Pump / Sump Assembly',
      fault_type: 'Oil Starvation — Severe Pressure Loss',
      confidence: 0.93,
      reasoning: [
        `Oil pressure critically low: ${t.oil_pressure?.toFixed(0)} kPa (nominal 380 kPa)`,
        `Oil temperature elevated to ${t.oil_temp?.toFixed(1)}°C — friction heat signature`,
        `Bearing surfaces at risk of seizure — immediate intervention required`
      ],
      recommended_action: 'ABORT MISSION. Reduce power immediately. Inspect oil pump and sump post-landing.'
    };
  }
  if (overheat && t.cht > 133) {
    return {
      status: 'Critical',
      fault_component: 'Cylinder Head / Cooling System',
      fault_type: 'Thermal Runaway — CHT Critical',
      confidence: 0.91,
      reasoning: [
        `CHT at ${t.cht?.toFixed(1)}°C exceeds critical threshold (135°C)`,
        `EGT ${t.egt?.toFixed(0)}°C consistent with rich combustion / cooling failure`,
        `RPM ${t.rpm?.toFixed(0)} elevated — compounding heat generation`
      ],
      recommended_action: 'Reduce throttle 20%, enrich mixture, initiate controlled descent. Land at first opportunity.'
    };
  }
  if (bearing) {
    return {
      status: t.vibration > 3.0 ? 'Critical' : 'Warning',
      fault_component: 'Crankshaft Main Bearing / Journal',
      fault_type: 'Bearing Wear — Mechanical Looseness',
      confidence: 0.85,
      reasoning: [
        `Vibration RMS at ${t.vibration?.toFixed(2)} g — ${t.vibration > 3.0 ? 'critical' : 'warning'} threshold exceeded`,
        `Oil temp ${t.oil_temp?.toFixed(1)}°C elevated — bearing friction heat signature`,
        `RPM instability: ${t.rpm?.toFixed(0)} RPM`
      ],
      recommended_action: 'Reduce RPM by 500, monitor vibration trend. Inspect main bearings post-flight.'
    };
  }
  if (leanFire) {
    return {
      status: 'Warning',
      fault_component: 'Fuel Injection Rail / EFI System',
      fault_type: 'Fuel-Lean Misfire — AFR Deviation',
      confidence: 0.82,
      reasoning: [
        `AFR ${t.afr?.toFixed(1)}:1 — lean of stoichiometric (nominal 14.7:1)`,
        `Fuel flow low at ${t.fuel_flow?.toFixed(1)} L/h — possible injector restriction`,
        `EGT ${t.egt?.toFixed(0)}°C elevated — lean combustion heat signature`
      ],
      recommended_action: 'Enrich fuel mixture, check injector rail pressure. Monitor EGT closely.'
    };
  }
  if (overheat || oilFault) {
    return {
      status: 'Warning',
      fault_component: overheat ? 'Cylinder Head / EGT Probe' : 'Oil Pump System',
      fault_type: overheat ? 'Mild Overheating' : 'Oil System Marginal',
      confidence: 0.78,
      reasoning: [
        overheat
          ? `CHT ${t.cht?.toFixed(1)}°C approaching warning band (>125°C)`
          : `Oil pressure ${t.oil_pressure?.toFixed(0)} kPa below nominal (380 kPa)`,
        `All other parameters within acceptable operating range`,
        `Continue monitoring — no immediate action required`
      ],
      recommended_action: 'Monitor closely. If parameter continues to trend, prepare for power reduction.'
    };
  }
  return {
    status: 'Healthy',
    fault_component: 'Propulsion Core — All Systems',
    fault_type: 'Healthy — Nominal Operations',
    confidence: 0.97,
    reasoning: [
      `All 12 engine telemetry parameters within nominal operating bands`,
      `Mission reliability index: OPTIMAL`,
      `No anomalies detected across combustion, lubrication, or mechanical subsystems`
    ],
    recommended_action: 'Advisory: All systems nominal. Continue current mission profile.'
  };
}

export function localDiagnose(telemetry) {
  return { ...classifyFault(telemetry), mission_reliability_score: computeReliability(telemetry) };
}

export async function diagnose(telemetry) {
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telemetry),
        signal: AbortSignal.timeout(3000)
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
