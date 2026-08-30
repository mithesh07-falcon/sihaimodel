import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Hourglass, TrendingUp, Wrench, Bell } from 'lucide-react';
import { useEngineStore } from '../../store/useEngineStore';

const statusColor = { Healthy:'text-green-500', Warning:'text-amber-500', Critical:'text-red-500' };
const statusBg    = { Healthy:'bg-green-50 border-green-100', Warning:'bg-amber-50 border-amber-100', Critical:'bg-red-50 border-red-100' };

function scoreLabel(s) {
  return s >= 85 ? 'Excellent' : s >= 65 ? 'Fair' : 'Poor';
}

const KpiCard = ({ label, icon: Icon, value, caption, valueClass = 'text-gray-900', bgClass = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay }}
    className={`card flex flex-col gap-3 min-w-0 border ${bgClass || 'border-gray-100'}`}
  >
    <div className="flex items-center justify-between">
      <span className="label-xs">{label}</span>
      <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
        <Icon size={15} className="text-gray-400" strokeWidth={1.8} />
      </div>
    </div>
    <div>
      <p className={`text-2xl font-extrabold leading-tight ${valueClass}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1 font-medium">{caption}</p>
    </div>
  </motion.div>
);

const KpiCardRow = () => {
  const d = useEngineStore(s => s.diagnosis);
  const alerts = useEngineStore(s => s.alerts);
  const st = d.status || 'Healthy';
  const critCount = alerts.filter(a => a.sev === 'critical').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
      <KpiCard
        label="Engine Status" icon={Shield}
        value={st}
        caption={st === 'Healthy' ? 'No critical issues' : d.fault_component}
        valueClass={statusColor[st] || 'text-gray-900'}
        bgClass={statusBg[st] || 'border-gray-100'}
        delay={0}
      />
      <KpiCard
        label="RUL Estimate" icon={Hourglass}
        value={`${d.rul_estimate_hours ?? 240} hrs`}
        caption="Flight hours remaining"
        valueClass="text-gray-900" delay={0.05}
      />
      <KpiCard
        label="Failure Probability" icon={TrendingUp}
        value={`${d.failure_probability_30d ?? 0.5}%`}
        caption="Next 30 days"
        valueClass={d.failure_probability_30d > 20 ? 'text-red-500' : d.failure_probability_30d > 8 ? 'text-amber-500' : 'text-gray-900'}
        delay={0.1}
      />
      <KpiCard
        label="Maintenance Score" icon={Wrench}
        value={`${d.maintenance_score ?? 100}/100`}
        caption={scoreLabel(d.maintenance_score ?? 100)}
        valueClass={d.maintenance_score < 60 ? 'text-red-500' : d.maintenance_score < 80 ? 'text-amber-500' : 'text-green-600'}
        delay={0.15}
      />
      <KpiCard
        label="Active Alerts" icon={Bell}
        value={alerts.length}
        caption={`${critCount} critical`}
        valueClass={critCount > 0 ? 'text-red-500' : 'text-gray-900'}
        bgClass={critCount > 0 ? 'bg-red-50 border-red-100' : 'border-gray-100'}
        delay={0.2}
      />
    </div>
  );
};

export default KpiCardRow;
