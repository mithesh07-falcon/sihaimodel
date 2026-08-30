import React from 'react';
import { Html } from '@react-three/drei';
import { motion } from 'framer-motion';

// Status colors for callout badges
const STATUS_COLORS = {
  healthy:  { border: '#D1FAE5', bg: '#F0FDF4', dot: '#22C55E', text: '#15803D', label: 'Normal' },
  warning:  { border: '#FDE68A', bg: '#FFFBEB', dot: '#F59E0B', text: '#B45309', label: 'Warning' },
  critical: { border: '#FECACA', bg: '#FEF2F2', dot: '#EF4444', text: '#B91C1C', label: 'Critical' },
};

/**
 * PartCallout — a world-anchored floating card rendered via drei <Html occlude>
 * Props:
 *   position  [x,y,z]   — 3D anchor point on the engine
 *   label     string    — sensor/component name
 *   value     string    — live value + unit
 *   status    string    — 'healthy' | 'warning' | 'critical'
 */
const PartCallout = ({ position, label, value, status = 'healthy' }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.healthy;

  return (
    <Html position={position} center occlude distanceFactor={8} zIndexRange={[10, 0]}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: 10,
          padding: '6px 10px',
          minWidth: 110,
          boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
          fontFamily: 'Inter, system-ui, sans-serif',
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {/* Header row */}
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:c.dot,
            boxShadow: status === 'critical' ? `0 0 0 3px ${c.dot}33` : 'none' }} />
          <span style={{ fontSize:10, fontWeight:600, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em' }}>
            {label}
          </span>
        </div>
        {/* Value */}
        <div style={{ fontSize:13, fontWeight:700, color:'#111827', lineHeight:1.2 }}>{value}</div>
        {/* Status */}
        <div style={{ fontSize:9, fontWeight:600, color:c.text, marginTop:2, textTransform:'uppercase', letterSpacing:'0.04em' }}>
          {c.label}
        </div>
        {/* Connector dot */}
        <div style={{
          position:'absolute', bottom:-5, left:'50%', transform:'translateX(-50%)',
          width:8, height:8, borderRadius:'50%', background:'white',
          border:`2px solid ${c.dot}`, boxShadow:'0 1px 4px rgba(0,0,0,0.12)'
        }} />
      </motion.div>
    </Html>
  );
};

export default PartCallout;
