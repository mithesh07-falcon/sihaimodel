import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RotateCcw, Wrench, AlertTriangle, CheckCircle } from 'lucide-react';
import { useEngineStore } from '../store/useEngineStore';

const priorityConfig = {
  HIGH:   { bg:'bg-red-50',   border:'border-red-200',   badge:'bg-red-100 text-red-700',   text:'text-red-700',   dot:'bg-red-500 animate-pulse' },
  MEDIUM: { bg:'bg-amber-50', border:'border-amber-200', badge:'bg-amber-100 text-amber-700',text:'text-amber-700', dot:'bg-amber-500' },
  LOW:    { bg:'bg-green-50', border:'border-green-200', badge:'bg-green-100 text-green-700',text:'text-green-700', dot:'bg-green-500' },
};

const MaintenancePage = () => {
  const navigate       = useNavigate();
  const diagnosis      = useEngineStore(s => s.diagnosis);
  const soh            = useEngineStore(s => s.soh);
  const maintenanceRecs = useEngineStore(s => s.maintenanceRecs);
  const activeFault    = useEngineStore(s => s.activeFault);
  const resetFault     = useEngineStore(s => s.resetFault);
  const tasks          = useEngineStore(s => s.tasks);

  const overall = soh?.overall ?? 87;
  const anomaly = soh?.anomalyScore ?? 13;
  const rul     = diagnosis?.rul_estimate_hours ?? 126;
  const topRec  = maintenanceRecs?.[0];
  const pc      = priorityConfig[topRec?.priority ?? 'LOW'];

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Wrench size={15} className="text-orange-500" />
          <span className="text-xs font-black tracking-widest text-gray-800">MAINTENANCE ADVISORY</span>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700">
            STEP 7 / 7 — FINAL REPORT
          </span>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-600">
            SIMULATED PROTOTYPE — NOT FOR OPERATIONAL USE
          </span>
        </div>
        <div className="flex gap-2">
          {activeFault && activeFault !== 'nominal' && (
            <button onClick={resetFault}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 border border-green-200 text-green-700">
              <RotateCcw size={11} /> Reset Simulation
            </button>
          )}
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-50 border border-gray-200 text-gray-600">
            ← Return to Mission Control
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left — Primary advisory */}
          <div className="lg:col-span-2 space-y-4">
            {/* Main advisory card */}
            {topRec && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl shadow-sm border-2 p-6 ${pc.bg} ${pc.border}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${pc.bg} border ${pc.border}`}>
                      {topRec.icon}
                    </div>
                    <div>
                      <h2 className={`text-base font-black ${pc.text}`}>{topRec.title}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">SIH-2026 AI-Generated Advisory</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black ${pc.badge}`}>
                    {topRec.priority} PRIORITY
                  </span>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed mb-4">{topRec.detail}</p>

                {/* Metrics row */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label:'Anomaly Score', value:`${anomaly}/100`,   color: anomaly > 60 ? '#EF4444' : anomaly > 30 ? '#F59E0B' : '#22C55E' },
                    { label:'Confidence',    value:`${topRec.confidence}%`, color:'#374151' },
                    { label:'SOH',           value:`${overall}%`,      color: overall >= 85 ? '#22C55E' : overall >= 65 ? '#F59E0B' : '#EF4444' },
                    { label:'RUL Est.',      value:`${rul} hrs`,       color: rul < 50 ? '#EF4444' : '#374151' },
                  ].map(m => (
                    <div key={m.label} className="bg-white rounded-xl p-3 border border-gray-100">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">{m.label}</p>
                      <p className="text-lg font-black" style={{ color: m.color }}>{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Recommendation */}
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench size={13} className="text-orange-500" />
                    <span className="text-sm font-bold text-gray-700">RECOMMENDATION</span>
                  </div>
                  <p className="text-sm text-gray-600">{topRec.recommendation}</p>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-[10px] text-amber-700">
                    ⚠ <strong>IMPORTANT:</strong> This is a simulated prototype recommendation for SIH 2026 demonstration purposes.
                    This does NOT constitute a certified aircraft maintenance advisory. All telemetry data is synthetic.
                    Confidence level reflects simulation model output only.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Additional recommendations */}
            {(maintenanceRecs ?? []).slice(1).map((rec, i) => {
              const c = priorityConfig[rec.priority ?? 'LOW'];
              return (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i+1)*0.1 }}
                  className={`rounded-2xl shadow-sm border p-4 ${c.bg} ${c.border}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold ${c.text}`}>{rec.icon} {rec.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${c.badge}`}>{rec.priority}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{rec.detail}</p>
                  <p className="text-xs font-semibold text-gray-700">→ {rec.recommendation}</p>
                  <p className="text-[9px] text-gray-400 mt-1">Confidence: {rec.confidence}% · [SIMULATED]</p>
                </motion.div>
              );
            })}

            {/* Maintenance tasks */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Upcoming Maintenance Tasks</h3>
              <div className="space-y-2">
                {(tasks ?? []).map(task => (
                  <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`} />
                    <span className="text-xs font-semibold text-gray-700 flex-1">{task.name}</span>
                    <span className="text-[9px] text-gray-400">Due: {task.due}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      task.status === 'open' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                      {task.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar — summary */}
          <div className="space-y-4">
            {/* Engine health summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Engine Health Summary</h3>
              <div className="space-y-3">
                {[
                  { label:'SOH',           value:`${overall}%`, color: overall>=85?'#22C55E':overall>=65?'#F59E0B':'#EF4444' },
                  { label:'Anomaly Score', value:`${anomaly}/100`, color: anomaly>60?'#EF4444':anomaly>30?'#F59E0B':'#22C55E' },
                  { label:'Degradation',   value:`${soh?.degradation ?? 0}%`, color:'#374151' },
                  { label:'RUL',           value:`${rul} hrs`, color: rul<50?'#EF4444':'#374151' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{item.label}</span>
                    <span className="text-sm font-black" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active fault status */}
            <div className={`rounded-2xl p-5 ${activeFault && activeFault !== 'nominal' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              {activeFault && activeFault !== 'nominal' ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} className="text-red-500" />
                    <span className="text-sm font-bold text-red-700">Active Fault</span>
                  </div>
                  <p className="text-sm text-red-600 font-semibold">{activeFault.replace(/_/g,' ').toUpperCase()}</p>
                  <button onClick={resetFault}
                    className="mt-3 w-full py-2 rounded-xl text-xs font-bold bg-red-100 border border-red-200 text-red-700 hover:bg-red-200 transition-all">
                    <RotateCcw size={11} className="inline mr-1" />Clear Fault
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={14} className="text-green-500" />
                    <span className="text-sm font-bold text-green-700">All Systems Nominal</span>
                  </div>
                  <p className="text-xs text-green-600">No active faults detected</p>
                </>
              )}
            </div>

            {/* System architecture summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3">System Architecture</h3>
              <div className="space-y-1.5">
                {[
                  'Virtual UAV Engine',
                  'Virtual Sensors (×9)',
                  'Data Acquisition',
                  'Data Processing',
                  'Digital Twin',
                  'AI / ML Engine',
                  'Health Analytics',
                  'Maintenance Advisory',
                ].map((stage, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-black bg-orange-50 text-orange-500 border border-orange-100 shrink-0">
                      {i+1}
                    </span>
                    <span className="text-xs text-gray-600">{stage}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Return CTA */}
            <button onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3D00)', boxShadow: '0 4px 20px rgba(255,107,53,0.3)' }}>
              ← Return to Mission Control
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
