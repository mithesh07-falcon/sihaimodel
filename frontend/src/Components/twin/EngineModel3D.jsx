import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useEngineStore } from '../../store/useEngineStore';
import PartCallout from './PartCallout';
import * as THREE from 'three';

// ── Helper: part health to color + emissive ──────────────────────────────────
function partColor(status) {
  if (status === 'critical') return { color:'#EF4444', emissive:'#7f0000', emissiveIntensity: 0.5 + Math.sin(Date.now()*0.006)*0.3 };
  if (status === 'warning')  return { color:'#F59E0B', emissive:'#7a4a00', emissiveIntensity: 0.3 };
  return { color:'#6EE7B7', emissive:'#003322', emissiveIntensity: 0.05 };
}

// ── Callout status helper ────────────────────────────────────────────────────
function sensorStatus(val, warnHigh, critHigh, warnLow, critLow) {
  if ((critHigh != null && val > critHigh) || (critLow != null && val < critLow)) return 'critical';
  if ((warnHigh != null && val > warnHigh) || (warnLow != null && val < warnLow)) return 'warning';
  return 'healthy';
}

// ── Main 3D Engine Geometry ──────────────────────────────────────────────────
const EngineGeometry = () => {
  const telemetry  = useEngineStore(s => s.telemetry);
  const diagnosis  = useEngineStore(s => s.diagnosis);

  const crankRef  = useRef();
  const piston1Ref = useRef();
  const piston2Ref = useRef();
  const piston3Ref = useRef();
  const piston4Ref = useRef();

  // Determine part health from diagnosis
  const faultComp = (diagnosis.fault_component || '').toLowerCase();
  const st = diagnosis.status;

  const oilStatus  = faultComp.includes('oil') ? st.toLowerCase() : 'healthy';
  const cylStatus  = (faultComp.includes('cylinder') || faultComp.includes('cooling') || faultComp.includes('thermal')) ? st.toLowerCase() : 'healthy';
  const crankStatus = faultComp.includes('bearing') || faultComp.includes('crank') ? st.toLowerCase() : 'healthy';
  const fuelStatus  = faultComp.includes('fuel') || faultComp.includes('efi') ? st.toLowerCase() : 'healthy';

  const oilC  = partColor(oilStatus);
  const cylC  = partColor(cylStatus);
  const crkC  = partColor(crankStatus);
  const fuelC = partColor(fuelStatus);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const rpm = telemetry.rpm || 1000;
    const spd = (rpm / 60) * 0.35;
    if (crankRef.current)  crankRef.current.rotation.z = t * spd;
    const stroke = 0.4;
    const p1 = Math.sin(t * spd) * stroke;
    const p2 = Math.sin(t * spd + Math.PI) * stroke;
    if (piston1Ref.current) piston1Ref.current.position.x = -1.6 - p1;
    if (piston2Ref.current) piston2Ref.current.position.x =  1.6 + p1;
    if (piston3Ref.current) piston3Ref.current.position.x = -1.6 - p2;
    if (piston4Ref.current) piston4Ref.current.position.x =  1.6 + p2;
  });

  // Callout values
  const oilPSI = ((telemetry.oil_pressure || 380) * 0.145).toFixed(1);
  const egtVal = (telemetry.egt || 810).toFixed(0);
  const vibVal = (telemetry.vibration || 1.1).toFixed(2);
  const rpmVal = Math.round(telemetry.rpm || 4800);

  return (
    <group>
      {/* Lights */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <pointLight position={[-6, 4, -4]} intensity={0.5} color="#ff8844" />
      <pointLight position={[0, -3, 3]} intensity={0.3} color="#ffffff" />

      {/* ── Crankcase body ── */}
      <mesh castShadow>
        <boxGeometry args={[2.4, 1.6, 1.8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* ── Crankshaft ── */}
      <group ref={crankRef}>
        <mesh rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 2.2, 16]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.1}
            emissive={crkC.emissive} emissiveIntensity={crkC.emissiveIntensity} />
        </mesh>
        {[-0.5, 0.5].map((z, i) => (
          <mesh key={i} position={[0, 0.3, z]}>
            <boxGeometry args={[0.45, 0.65, 0.12]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.8}
              emissive={crkC.emissive} emissiveIntensity={crkC.emissiveIntensity} />
          </mesh>
        ))}
      </group>

      {/* ── 4 Cylinders + Pistons ── */}
      {[
        { ref: piston1Ref, pos: [-1.5, 0.4,  0.55], dir:  1, z: 0.55  },
        { ref: piston2Ref, pos: [ 1.5, 0.4, -0.55], dir: -1, z: -0.55 },
        { ref: piston3Ref, pos: [-1.5,-0.4, -0.55], dir:  1, z: -0.55 },
        { ref: piston4Ref, pos: [ 1.5,-0.4,  0.55], dir: -1, z: 0.55  },
      ].map(({ ref, pos, dir, z }, i) => (
        <group key={i} position={pos}>
          {/* Cylinder sleeve */}
          <mesh rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[0.5, 0.5, 1.5, 16]} />
            <meshStandardMaterial color="#1E293B" metalness={0.5} roughness={0.4}
              transparent opacity={0.6}
              emissive={cylC.emissive} emissiveIntensity={cylC.emissiveIntensity} />
          </mesh>
          {/* Cooling fins */}
          {[0.2, 0.5, 0.8].map((offset, j) => (
            <mesh key={j} position={[dir * offset, 0, 0]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.6, 0.6, 0.06, 16]} />
              <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4}
                emissive={cylC.emissive} emissiveIntensity={cylC.emissiveIntensity * 0.5} />
            </mesh>
          ))}
          {/* Piston */}
          <group ref={ref}>
            <mesh rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.44, 0.44, 0.38, 16]} />
              <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.15} />
            </mesh>
          </group>
        </group>
      ))}

      {/* ── Oil sump ── */}
      <mesh position={[0, -1.1, 0]} castShadow>
        <boxGeometry args={[1.8, 0.45, 1.5]} />
        <meshStandardMaterial color="#78350F" metalness={0.5} roughness={0.5}
          emissive={oilC.emissive} emissiveIntensity={oilC.emissiveIntensity} />
      </mesh>

      {/* ── Fuel rail ── */}
      <mesh position={[0, 1.15, 0]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 3.2, 8]} />
        <meshStandardMaterial color="#0369A1" metalness={0.8} roughness={0.2}
          emissive={fuelC.emissive} emissiveIntensity={fuelC.emissiveIntensity} />
      </mesh>

      {/* ── Exhaust manifold ── */}
      <mesh position={[0, -0.4, -1.1]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.18, 0.6, 12]} />
        <meshStandardMaterial color="#78350F" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* ── Propeller shaft ── */}
      <mesh position={[0, 0, 1.5]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 12]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* ── Callout labels ── */}
      <PartCallout
        position={[0, -1.4, 0.5]}
        label="Oil Pressure"
        value={`${oilPSI} PSI`}
        status={oilStatus}
      />
      <PartCallout
        position={[0, 0.8, -1.4]}
        label="EGT"
        value={`${egtVal} °C`}
        status={sensorStatus(telemetry.egt, 870, 910)}
      />
      <PartCallout
        position={[1.9, 0, 0.8]}
        label="Vibration"
        value={`${vibVal} g`}
        status={sensorStatus(telemetry.vibration, 2.0, 3.0)}
      />
      <PartCallout
        position={[-1.9, 0.5, -0.6]}
        label="RPM"
        value={`${rpmVal}`}
        status={sensorStatus(telemetry.rpm, 5200, 5600)}
      />
    </group>
  );
};

// ── Exported component ───────────────────────────────────────────────────────
const EngineModel3D = () => (
  <div className="relative w-full h-full rounded-2xl overflow-hidden engine-glow bg-gradient-to-b from-slate-50 to-cream">
    <Canvas shadows gl={{ antialias: true }}>
      <PerspectiveCamera makeDefault position={[0, 2, 5]} fov={45} />
      <EngineGeometry />
      <OrbitControls enableZoom autoRotate autoRotateSpeed={0.4}
        minDistance={3} maxDistance={10} maxPolarAngle={Math.PI / 1.8} />
    </Canvas>

    {/* Overlay badge */}
    <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur border border-gray-200 text-xs text-gray-500 font-medium px-2.5 py-1 rounded-lg">
      3D DIGITAL TWIN · Drag to orbit · Scroll to zoom
    </div>
  </div>
);

export default EngineModel3D;
