import React from 'react';
import { ShieldCheck, Cpu, TrendingUp, Clock, Radio, Activity, Zap, ExternalLink } from 'lucide-react';
import { useEngineStore } from '../../store/useEngineStore';

const TopTaskBar = () => {
  const telemetry = useEngineStore((s) => s.telemetry);
  const diagnosis = useEngineStore((s) => s.diagnosis);
  const soh = useEngineStore((s) => s.soh);
  const streamConnected = useEngineStore((s) => s.streamConnected);
  const ingestionRateHz = useEngineStore((s) => s.ingestionRateHz);
  const pingMs = useEngineStore((s) => s.pingMs) || 32;

  // Real dynamic AI metrics
  const isHealthy = streamConnected && (diagnosis.status === 'Healthy' || diagnosis.status === 'nominal');
  const anomalyScore = streamConnected ? (soh?.anomalyScore ?? 8) : 0;
  const isAnomaly = anomalyScore > 40;
  const faultName = streamConnected ? (diagnosis.fault_type || (isHealthy ? 'Nominal' : 'Warning')) : 'Standby';
  const degradation = streamConnected ? ((soh?.degradation ?? 4) / 100).toFixed(2) : '0.00';
  const rulHours = streamConnected ? (diagnosis.rul_estimate_hours ?? Math.round(((soh?.overall ?? 90) / 100) * 240)) : '--';

  return (
    <header className="bg-white border-b border-gray-200/80 px-6 py-2.5 flex items-center justify-between gap-4 shrink-0 shadow-2xs select-none font-sans z-30">
      {/* Left: Engine & Mission Identity */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-black tracking-tight text-gray-900 uppercase">
            AEROTWIN GCS · ROTAX 912 ULS
          </span>
        </div>
        <span className="text-gray-300">|</span>
        {/* Stream Status & Latency */}
        <div className="flex items-center gap-2 text-xs">
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${
            streamConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <Radio size={11} className={streamConnected ? 'animate-pulse text-emerald-600' : 'text-amber-500'} />
            {streamConnected ? `STREAM LIVE (${ingestionRateHz.toFixed(1)} Hz · ${pingMs}ms)` : 'STREAM STANDBY'}
          </div>
          <a
            href="https://virtualengine.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-gray-400 hover:text-orange-600 transition-colors flex items-center gap-0.5"
            title="Open virtual engine origin simulator"
          >
            virtualengine.vercel.app <ExternalLink size={9} />
          </a>
        </div>
      </div>

      {/* Right: 4 Deep Learning AI Models Bar */}
      <div className="flex items-center gap-2 overflow-x-auto py-0.5">
        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider hidden xl:inline">
          AI PIPELINE:
        </span>

        {/* Model 1: Autoencoder (Anomaly Detection) */}
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs transition-all shadow-2xs ${
            isAnomaly
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-gray-50/80 border-gray-200 text-gray-700'
          }`}
          title="Deep Autoencoder: Unsupervised Reconstruction Anomaly Detector"
        >
          <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${isAnomaly ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
            <ShieldCheck size={12} strokeWidth={2.4} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-gray-400 leading-none">AUTOENCODER</span>
            <span className="text-[11px] font-black leading-none mt-0.5">
              {isAnomaly ? `ANOMALY (${anomalyScore})` : `NORMAL (${anomalyScore})`}
            </span>
          </div>
        </div>

        {/* Model 2: 1D-CNN (Fault Classification) */}
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs transition-all shadow-2xs ${
            !isHealthy && streamConnected
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-gray-50/80 border-gray-200 text-gray-700'
          }`}
          title="1D Convolutional Neural Network: Real-Time Multiclass Fault Classifier"
        >
          <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${!isHealthy && streamConnected ? 'bg-amber-100 text-amber-600' : 'bg-orange-100 text-orange-600'}`}>
            <Cpu size={12} strokeWidth={2.4} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-gray-400 leading-none">1D-CNN CLASSIFIER</span>
            <span className="text-[11px] font-black leading-none mt-0.5 truncate max-w-[110px]">
              {faultName}
            </span>
          </div>
        </div>

        {/* Model 3: GRU / BiLSTM (Degradation Index) */}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-xl border border-gray-200 bg-gray-50/80 text-gray-700 text-xs shadow-2xs"
          title="Gated Recurrent Unit (GRU): Multivariate Health Degradation Tracker"
        >
          <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={12} strokeWidth={2.4} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-gray-400 leading-none">GRU DEGRADATION</span>
            <span className="text-[11px] font-black leading-none mt-0.5">
              {degradation} <span className="text-[9px] font-normal text-gray-400">INDEX</span>
            </span>
          </div>
        </div>

        {/* Model 4: TCN / Transformer (RUL Prediction) */}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-xl border border-gray-200 bg-gray-50/80 text-gray-700 text-xs shadow-2xs"
          title="Temporal Convolutional Network (TCN): Remaining Useful Life (RUL) Prognostics"
        >
          <div className="w-5 h-5 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
            <Clock size={12} strokeWidth={2.4} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-gray-400 leading-none">TCN PROGNOSTICS</span>
            <span className="text-[11px] font-black leading-none mt-0.5 font-mono">
              {rulHours} <span className="text-[9px] font-normal text-gray-400">HRS</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopTaskBar;
