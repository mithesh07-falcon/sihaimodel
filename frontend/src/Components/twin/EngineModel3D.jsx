import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useEngineStore } from '../../store/useEngineStore';
import PartCallout from './PartCallout';
import {
  rpmToSpeed, pistonOffset, thermalTarget, thermalIntensity,
  lerpColor, vibrationJitter, statusRimColor, easeRpm
} from './engineAnimation';
import * as THREE from 'three';

// ── Animated engine internals ────────────────────────────────────────────
const EngineGeometry = () => {
  const telemetry = useEngineStore(s => s.telemetry);
  const diagnosis = useEngineStore(s => s.diagnosis);

  // Refs for animated parts
  const groupRef    = useRef();
  const crankRef    = useRef();
  const piston1Ref  = useRef();
  const piston2Ref  = useRef();
  const piston3Ref  = useRef();
  const piston4Ref  = useRef();
  const cyl1MatRef  = useRef();
  const cyl2MatRef  = useRef();
  const cyl3MatRef  = useRef();
  const cyl4MatRef  = useRef();
  const exhaustMatRef = useRef();
  const oilSumpMatRef = useRef();
  const rimLightRef   = useRef();

  // Mutable state for smooth animation (no re-renders)
  const anim = useRef({
    crankAngle: 0,
    visualRpm: rpmToSpeed(telemetry.rpm || 4800),
    cylColors: [new THREE.Color('#94A3B8'), new THREE.Color('#94A3B8'), new THREE.Color('#94A3B8'), new THREE.Color('#94A3B8')],
    exhaustColor: new THREE.Color('#78350F'),
    oilColor: new THREE.Color('#78350F'),
    rimColor: new THREE.Color('#22C55E'),
  });

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const a = anim.current;
    const rpm    = telemetry.rpm || 4800;
    const cht    = telemetry.cht || 110;
    const egt    = telemetry.egt || 810;
    const oilP   = telemetry.oil_pressure || 380;
    const oilT   = telemetry.oil_temp || 92;
    const vib    = telemetry.vibration || 1.1;
    const status = diagnosis.status || 'Healthy';

    // A. RPM-driven rotation with ease-down on critical
    const targetSpeed = status === 'Critical' && diagnosis.fault_type === 'Healthy' ? 0.3 : rpmToSpeed(rpm);
    a.visualRpm = easeRpm(a.visualRpm, targetSpeed, delta);
    a.crankAngle += delta * a.visualRpm;

    if (crankRef.current)  crankRef.current.rotation.z = a.crankAngle;
    if (piston1Ref.current) piston1Ref.current.position.x = -1.6 + pistonOffset(a.crankAngle);
    if (piston2Ref.current) piston2Ref.current.position.x =  1.6 - pistonOffset(a.crankAngle);
    if (piston3Ref.current) piston3Ref.current.position.x = -1.6 + pistonOffset(a.crankAngle + Math.PI);
    if (piston4Ref.current) piston4Ref.current.position.x =  1.6 - pistonOffset(a.crankAngle + Math.PI);

    // B. Thermal glow (CHT/EGT → cylinder/exhaust emissive)
    const cylTarget = thermalTarget(cht, 100, 125, 140);
    const cylIntensity = thermalIntensity(cht, 100, 125, 140);
    const exTarget = thermalTarget(egt, 750, 870, 920);
    const exIntensity = thermalIntensity(egt, 750, 870, 920);

    [cyl1MatRef, cyl2MatRef, cyl3MatRef, cyl4MatRef].forEach((ref, i) => {
      if (ref.current) {
        a.cylColors[i] = lerpColor(a.cylColors[i], cylTarget, delta * 1.2);
        ref.current.emissive.copy(a.cylColors[i]);
        ref.current.emissiveIntensity = cylIntensity + (status === 'Critical' ? Math.sin(t * 4) * 0.15 : 0);
      }
    });
    if (exhaustMatRef.current) {
      a.exhaustColor = lerpColor(a.exhaustColor, exTarget, delta * 1.0);
      exhaustMatRef.current.emissive.copy(a.exhaustColor);
      exhaustMatRef.current.emissiveIntensity = exIntensity;
    }

    // Oil sump glow
    const oilHealthy = oilP > 280 && oilT < 110;
    const oilTarget = oilHealthy ? new THREE.Color('#005500') : oilP < 200 ? new THREE.Color('#EF4444') : new THREE.Color('#F59E0B');
    const oilIntensity = oilHealthy ? 0.05 : oilP < 200 ? 0.6 : 0.3;
    if (oilSumpMatRef.current) {
      a.oilColor = lerpColor(a.oilColor, oilTarget, delta * 1.0);
      oilSumpMatRef.current.emissive.copy(a.oilColor);
      oilSumpMatRef.current.emissiveIntensity = oilIntensity;
    }

    // C. Vibration jitter on whole group
    if (groupRef.current) {
      const j = vibrationJitter(t, vib);
      groupRef.current.position.x = j.x;
      groupRef.current.position.y = j.y;
      groupRef.current.position.z = j.z;
    }

    // E. Rim light tint
    if (rimLightRef.current) {
      const targetRim = statusRimColor(status);
      a.rimColor = lerpColor(a.rimColor, targetRim, delta * 0.8);
      rimLightRef.current.color.copy(a.rimColor);
    }
  });

  // Callout display values
  const oilPSI = ((telemetry.oil_pressure || 380) * 0.145).toFixed(1);
  const egtVal = Math.round(telemetry.egt || 810);
  const vibVal = (telemetry.vibration || 1.1).toFixed(2);
  const rpmVal = Math.round(telemetry.rpm || 4800);

  const faultLower = (diagnosis.fault_component || '').toLowerCase();
  const oilStatus = faultLower.includes('oil') ? diagnosis.status.toLowerCase() : undefined;

  return (
    <group ref={groupRef}>
      {/* Lights */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
      <pointLight ref={rimLightRef} position={[-5, 3, -4]} intensity={0.6} />
      <pointLight position={[0, -3, 4]} intensity={0.25} color="#FFFFFF" />

      {/* ── Crankcase body ── */}
      <mesh castShadow>
        <boxGeometry args={[2.4, 1.6, 1.8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* ── Crankshaft (animated rotation) ── */}
      <group ref={crankRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 2.2, 16]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.92} roughness={0.08} />
        </mesh>
        {[-0.5, 0.5].map((z, i) => (
          <mesh key={i} position={[0, 0.3, z]}>
            <boxGeometry args={[0.45, 0.65, 0.12]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.85} roughness={0.15} />
          </mesh>
        ))}
      </group>

      {/* ── 4 Cylinders with thermal glow + animated pistons ── */}
      {[
        { ref: piston1Ref, matRef: cyl1MatRef, pos: [-1.5, 0.4, 0.55] },
        { ref: piston2Ref, matRef: cyl2MatRef, pos: [1.5, 0.4, -0.55] },
        { ref: piston3Ref, matRef: cyl3MatRef, pos: [-1.5, -0.4, -0.55] },
        { ref: piston4Ref, matRef: cyl4MatRef, pos: [1.5, -0.4, 0.55] },
      ].map(({ ref, matRef, pos }, i) => (
        <group key={i} position={pos}>
          {/* Cylinder sleeve — thermal glow applied here */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.5, 0.5, 1.5, 16]} />
            <meshStandardMaterial
              ref={matRef}
              color="#1E293B" metalness={0.5} roughness={0.4}
              transparent opacity={0.65}
              emissive="#000000" emissiveIntensity={0}
            />
          </mesh>
          {/* Cooling fins */}
          {[0.2, 0.5, 0.8].map((offset, j) => (
            <mesh key={j} position={[i < 2 ? offset : -offset, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.62, 0.62, 0.05, 16]} />
              <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.35} />
            </mesh>
          ))}
          {/* Piston (animated reciprocation) */}
          <group ref={ref}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.44, 0.44, 0.35, 16]} />
              <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        </group>
      ))}

      {/* ── Oil sump (glow reacts to oil health) ── */}
      <mesh position={[0, -1.1, 0]} castShadow>
        <boxGeometry args={[1.8, 0.45, 1.5]} />
        <meshStandardMaterial
          ref={oilSumpMatRef}
          color="#78350F" metalness={0.5} roughness={0.5}
          emissive="#000000" emissiveIntensity={0}
        />
      </mesh>

      {/* ── Fuel rail ── */}
      <mesh position={[0, 1.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 3.2, 8]} />
        <meshStandardMaterial color="#0369A1" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* ── Exhaust manifold (thermal glow) ── */}
      <mesh position={[0, -0.4, -1.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.2, 0.7, 12]} />
        <meshStandardMaterial
          ref={exhaustMatRef}
          color="#78350F" metalness={0.6} roughness={0.35}
          emissive="#000000" emissiveIntensity={0}
        />
      </mesh>

      {/* ── Propeller shaft ── */}
      <mesh position={[0, 0, 1.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.6, 12]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.92} roughness={0.08} />
      </mesh>

      {/* ── Camshaft ── */}
      <mesh position={[0, 0.9, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 2.0, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* ── Floating callout labels ── */}
      <PartCallout position={[-2.2, 0.5, 0.8]} label="VIBRATION" value={vibVal} unit="g" rawValue={telemetry.vibration} warnHigh={2.0} critHigh={3.0} />
      <PartCallout position={[0, -1.6, 0.6]} label="OIL PRESSURE" value={oilPSI} unit="PSI" rawValue={telemetry.oil_pressure} warnLow={280} critLow={200} overrideStatus={oilStatus} />
      <PartCallout position={[0.3, 0.6, -1.6]} label="EGT" value={`${egtVal}`} unit="°C" rawValue={telemetry.egt} warnHigh={870} critHigh={910} />
      <PartCallout position={[2.2, 0.5, -0.5]} label="RPM" value={`${rpmVal}`} unit="" rawValue={telemetry.rpm} warnHigh={5200} critHigh={5600} />
    </group>
  );
};

// ── Exported canvas wrapper ──────────────────────────────────────────────
const EngineModel3D = () => (
  <div className="relative w-full h-full rounded-2xl overflow-hidden engine-glow bg-gradient-to-b from-slate-50 to-cream">
    <Canvas shadows gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
      <PerspectiveCamera makeDefault position={[0, 2.5, 5.5]} fov={42} />
      <EngineGeometry />
      <OrbitControls
        enableZoom autoRotate autoRotateSpeed={0.35}
        minDistance={3.5} maxDistance={11} maxPolarAngle={Math.PI / 1.7}
      />
      <EffectComposer>
        <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} intensity={0.6} />
      </EffectComposer>
    </Canvas>

    {/* Overlay badge */}
    <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur border border-gray-200 text-[9px] text-gray-500 font-medium px-2.5 py-1 rounded-lg select-none">
      3D DIGITAL TWIN · Drag to orbit · Scroll to zoom
    </div>
  </div>
);

export default EngineModel3D;
