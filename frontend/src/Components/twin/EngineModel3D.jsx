import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useEngineStore } from '../../store/useEngineStore';
import PartCallout from './PartCallout';
import {
  rpmToSpeed, thermalTarget, thermalIntensity,
  lerpColor, vibrationJitter, statusRimColor, easeRpm
} from './engineAnimation';
import * as THREE from 'three';

// ── Single Boxer Cylinder Bank Assembly (2 Opposed Cylinders) ────────────
const CylinderUnit = ({
  position,
  rotation,
  pistonRef,
  rodRef,
  rockerRef,
  valveInRef,
  valveExRef,
  pushrodRef,
  headMatRef,
  sparkLightRef,
  isLeftBank,
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* ── 1. Air-Cooled Finned Cylinder Barrel (Neutral Metal, Ram-Air Cooled) ── */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5, 0.5, 1.35, 24, 1, true]} />
        <meshStandardMaterial
          color="#334155"
          metalness={0.8}
          roughness={0.25}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Machined Radial Cooling Fins on Barrel */}
      {[-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45].map((xOff, idx) => (
        <mesh key={idx} position={[xOff, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.62, 0.62, 0.035, 24]} />
          <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}

      {/* ── 2. Liquid-Cooled Cylinder Head (Heat/CHT Emissive Glow Target) ── */}
      <group position={[isLeftBank ? -0.82 : 0.82, 0, 0]}>
        {/* Main Head Casting with Coolant Jacket */}
        <mesh>
          <boxGeometry args={[0.42, 1.15, 1.15]} />
          <meshStandardMaterial
            ref={headMatRef}
            color="#64748B"
            metalness={0.7}
            roughness={0.3}
            emissive="#000000"
            emissiveIntensity={0}
          />
        </mesh>

        {/* Dual Redundant Spark Plugs (2 per cylinder in Rotax 912) */}
        <group position={[0, 0.58, -0.25]} rotation={[0.3, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.05, 0.07, 0.18, 6]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.12, 12]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
          </mesh>
          {/* Plug Lead 1 */}
          <mesh position={[0, 0.25, 0.05]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.16, 8]} />
            <meshStandardMaterial color="#EF4444" roughness={0.5} />
          </mesh>
        </group>

        <group position={[0, 0.58, 0.25]} rotation={[-0.3, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.05, 0.07, 0.18, 6]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.12, 12]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
          </mesh>
          {/* Plug Lead 2 */}
          <mesh position={[0, 0.25, -0.05]} rotation={[-0.4, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.16, 8]} />
            <meshStandardMaterial color="#3B82F6" roughness={0.5} />
          </mesh>
        </group>

        {/* Rocker Box Cover on Head Exterior */}
        <mesh position={[isLeftBank ? -0.24 : 0.24, 0, 0]}>
          <boxGeometry args={[0.12, 0.85, 0.85]} />
          <meshStandardMaterial color="#1E293B" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* Overhead Rocker Arms & Valves (Driven by Pushrods) */}
        <group ref={rockerRef} position={[isLeftBank ? -0.15 : 0.15, 0.25, 0]}>
          {/* Rocker Shaft & Pivot */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.5, 8]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Intake Valve & Spring */}
          <group ref={valveInRef} position={[0, -0.1, -0.18]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.06, 0.06, 0.12, 12]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
          {/* Exhaust Valve & Spring */}
          <group ref={valveExRef} position={[0, -0.1, 0.18]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.06, 0.06, 0.12, 12]} />
              <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        </group>

        {/* Liquid Coolant In/Out Hose Fitting */}
        <mesh position={[0, -0.52, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.16, 12]} />
          <meshStandardMaterial color="#0284C7" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Pushrod Tube (Connects Central Camshaft to Rocker Box) */}
      <group ref={pushrodRef} position={[isLeftBank ? -0.4 : 0.4, 0.38, 0]}>
        <mesh rotation={[0, 0, isLeftBank ? 0.08 : -0.08]}>
          <cylinderGeometry args={[0.025, 0.025, 0.85, 8]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Internal Combustion Chamber Firing Flash Light */}
      <pointLight
        ref={sparkLightRef}
        position={[isLeftBank ? -0.45 : 0.45, 0, 0]}
        intensity={0.25}
        distance={2.5}
        color="#FFA033"
      />

      {/* ── 3. Reciprocating Piston & Connecting Rod ── */}
      <group ref={pistonRef}>
        {/* Forged Aluminum Piston Crown & Skirt */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.46, 0.46, 0.38, 24]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.92} roughness={0.15} />
        </mesh>

        {/* Triple Piston Rings */}
        {[-0.1, -0.03, 0.04].map((rPos, rIdx) => (
          <mesh key={rIdx} position={[rPos, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.47, 0.47, 0.02, 24]} />
            <meshStandardMaterial color="#475569" metalness={0.95} roughness={0.1} />
          </mesh>
        ))}

        {/* Wrist Pin Gudgeon */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.44, 12]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* H-Beam Connecting Rod */}
        <group ref={rodRef}>
          <mesh position={[isLeftBank ? 0.42 : -0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.055, 0.075, 0.9, 12]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Crank Journal Rod Bearing Cap */}
          <mesh position={[isLeftBank ? 0.9 : -0.9, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.16, 16]} />
            <meshStandardMaterial color="#64748B" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// ── Complete Rotax 912-Class Aero Piston Engine Digital Twin ──────────────
const EngineGeometry = () => {
  const telemetry = useEngineStore((s) => s.telemetry);
  const diagnosis = useEngineStore((s) => s.diagnosis);

  // References for live physical animations
  const engineGroupRef = useRef();
  const crankShaftRef = useRef();
  const camShaftRef = useRef();
  const propReductionRef = useRef();
  const alternatorRef = useRef();

  // 4 Piston refs
  const p1Ref = useRef();
  const p2Ref = useRef();
  const p3Ref = useRef();
  const p4Ref = useRef();

  // 4 Rod refs
  const rod1Ref = useRef();
  const rod2Ref = useRef();
  const rod3Ref = useRef();
  const rod4Ref = useRef();

  // Rockers & Pushrods
  const rock1Ref = useRef();
  const rock2Ref = useRef();
  const rock3Ref = useRef();
  const rock4Ref = useRef();

  const push1Ref = useRef();
  const push2Ref = useRef();
  const push3Ref = useRef();
  const push4Ref = useRef();

  // 4 Liquid-cooled head material refs (Independent CHT glow)
  const head1MatRef = useRef();
  const head2MatRef = useRef();
  const head3MatRef = useRef();
  const head4MatRef = useRef();

  // 4 Combustion spark flash lights
  const spark1Ref = useRef();
  const spark2Ref = useRef();
  const spark3Ref = useRef();
  const spark4Ref = useRef();

  // Fluid & Thermal materials
  const exhaustMatRef = useRef();
  const oilTankMatRef = useRef();
  const oilLineMatRef = useRef();
  const coolantHoseMatRef = useRef();
  const rimLightRef = useRef();

  // Internal continuous animation state
  const stateTracker = useRef({
    crankAngle: 0,
    camAngle: 0,
    propAngle: 0,
    visualRpm: rpmToSpeed(telemetry.rpm || 4800),
    headColors: [
      new THREE.Color('#64748B'),
      new THREE.Color('#64748B'),
      new THREE.Color('#64748B'),
      new THREE.Color('#64748B'),
    ],
    exhaustColor: new THREE.Color('#78350F'),
    oilColor: new THREE.Color('#059669'),
    rimColor: new THREE.Color('#22C55E'),
  });

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const st = stateTracker.current;

    const rpm = telemetry.rpm ?? 4800;
    const cht = telemetry.cht ?? 110;
    const egt = telemetry.egt ?? 810;
    const oilP = telemetry.oil_pressure ?? 380;
    const oilT = telemetry.oil_temp ?? 92;
    const vib = telemetry.vibration ?? 1.1;
    const engineStatus = diagnosis.status || 'Healthy';

    // ── A. Mechanical Angular Speeds (Exact Aero Gear Ratios) ──────────
    // 1. Crankshaft Angular Velocity (Base RPM)
    const targetSpeed =
      engineStatus === 'Critical' && diagnosis.fault_type === 'Healthy'
        ? 0.2
        : rpmToSpeed(rpm);
    st.visualRpm = easeRpm(st.visualRpm, targetSpeed, delta);
    st.crankAngle += delta * st.visualRpm;

    // 2. Camshaft at Half Crankshaft Speed (Standard 4-Stroke Cycle)
    st.camAngle += delta * (st.visualRpm * 0.5);

    // 3. Propeller Reduction Gearbox (PSRU) at Crankshaft Speed ÷ 2.43
    st.propAngle += delta * (st.visualRpm / 2.43);

    const crank = st.crankAngle;
    const cam = st.camAngle;
    const prop = st.propAngle;

    // Apply primary rotations
    if (crankShaftRef.current) crankShaftRef.current.rotation.z = crank;
    if (camShaftRef.current) camShaftRef.current.rotation.z = cam;
    if (propReductionRef.current) propReductionRef.current.rotation.z = prop;
    if (alternatorRef.current) alternatorRef.current.rotation.z = crank * 1.5;

    // ── B. Horizontally Opposed Boxer Piston Motion (Mirrored Phase) ──
    const strokeAmp = 0.42;
    // Bank 1 & 2 opposed pairs move outwards and inwards synchronously
    const pos1 = -Math.sin(crank) * strokeAmp;
    const pos2 = Math.sin(crank) * strokeAmp;
    const pos3 = -Math.sin(crank + Math.PI) * strokeAmp;
    const pos4 = Math.sin(crank + Math.PI) * strokeAmp;

    if (p1Ref.current) p1Ref.current.position.x = pos1;
    if (p2Ref.current) p2Ref.current.position.x = pos2;
    if (p3Ref.current) p3Ref.current.position.x = pos3;
    if (p4Ref.current) p4Ref.current.position.x = pos4;

    // Connecting rod rocking
    const rodRock = Math.cos(crank) * 0.16;
    if (rod1Ref.current) rod1Ref.current.rotation.y = rodRock;
    if (rod2Ref.current) rod2Ref.current.rotation.y = -rodRock;
    if (rod3Ref.current) rod3Ref.current.rotation.y = -rodRock;
    if (rod4Ref.current) rod4Ref.current.rotation.y = rodRock;

    // Valve Rocker Rocking (Driven off Camshaft Angle)
    const rockerRock1 = Math.sin(cam) * 0.12;
    const rockerRock2 = Math.sin(cam + Math.PI * 0.5) * 0.12;
    const rockerRock3 = Math.sin(cam + Math.PI) * 0.12;
    const rockerRock4 = Math.sin(cam + Math.PI * 1.5) * 0.12;

    if (rock1Ref.current) rock1Ref.current.rotation.z = rockerRock1;
    if (rock2Ref.current) rock2Ref.current.rotation.z = -rockerRock2;
    if (rock3Ref.current) rock3Ref.current.rotation.z = rockerRock3;
    if (rock4Ref.current) rock4Ref.current.rotation.z = -rockerRock4;

    // ── C. Dual-Ignition Combustion Pulses ─────────────────────────────
    const spark1 = Math.max(0, Math.sin(cam)) ** 8 * 2.0;
    const spark2 = Math.max(0, Math.sin(cam + Math.PI * 0.5)) ** 8 * 2.0;
    const spark3 = Math.max(0, Math.sin(cam + Math.PI)) ** 8 * 2.0;
    const spark4 = Math.max(0, Math.sin(cam + Math.PI * 1.5)) ** 8 * 2.0;

    if (spark1Ref.current) spark1Ref.current.intensity = 0.2 + spark1;
    if (spark2Ref.current) spark2Ref.current.intensity = 0.2 + spark2;
    if (spark3Ref.current) spark3Ref.current.intensity = 0.2 + spark3;
    if (spark4Ref.current) spark4Ref.current.intensity = 0.2 + spark4;

    // ── D. CHT & EGT Thermal Color Gradient Mapping ───────────────────
    const targetHeadColor = thermalTarget(cht, 105, 125, 138);
    const targetHeadIntensity = thermalIntensity(cht, 105, 125, 138);

    const targetExhaustColor = thermalTarget(egt, 760, 870, 920);
    const targetExhaustIntensity = thermalIntensity(egt, 760, 870, 920);

    // Liquid-cooled cylinder heads smoothly lerp temperature
    [head1MatRef, head2MatRef, head3MatRef, head4MatRef].forEach((ref, idx) => {
      if (ref.current) {
        st.headColors[idx] = lerpColor(st.headColors[idx], targetHeadColor, delta * 1.8);
        ref.current.emissive.copy(st.headColors[idx]);
        ref.current.emissiveIntensity =
          targetHeadIntensity +
          (engineStatus === 'Critical' ? (Math.sin(time * 6) + 1) * 0.3 : 0);
      }
    });

    // Exhaust manifold thermal glow
    if (exhaustMatRef.current) {
      st.exhaustColor = lerpColor(st.exhaustColor, targetExhaustColor, delta * 1.5);
      exhaustMatRef.current.emissive.copy(st.exhaustColor);
      exhaustMatRef.current.emissiveIntensity = targetExhaustIntensity + 0.15;
    }

    // Dry-Sump Oil Tank & Scavenge Line Health Glow
    const oilHealthy = oilP >= 280 && oilT <= 110;
    const targetOilColor = oilHealthy
      ? new THREE.Color('#10B981')
      : oilP < 200 || oilT > 120
      ? new THREE.Color('#EF4444')
      : new THREE.Color('#F59E0B');
    const targetOilIntensity = oilHealthy ? 0.05 : oilP < 200 ? 0.8 : 0.4;

    st.oilColor = lerpColor(st.oilColor, targetOilColor, delta * 1.5);
    if (oilTankMatRef.current) {
      oilTankMatRef.current.emissive.copy(st.oilColor);
      oilTankMatRef.current.emissiveIntensity = targetOilIntensity;
    }
    if (oilLineMatRef.current) {
      oilLineMatRef.current.emissive.copy(st.oilColor);
      oilLineMatRef.current.emissiveIntensity = targetOilIntensity;
    }

    // ── E. Vibration Micro-Jitter (Scales to live vibration RMS) ────────
    if (engineGroupRef.current) {
      const jitter = vibrationJitter(time, vib, 0.016);
      engineGroupRef.current.position.x = jitter.x;
      engineGroupRef.current.position.y = jitter.y;
      engineGroupRef.current.position.z = jitter.z;
    }

    // ── F. Overall Diagnosis Status Ambient Rim Light ───────────────────
    if (rimLightRef.current) {
      const targetRim = statusRimColor(engineStatus);
      st.rimColor = lerpColor(st.rimColor, targetRim, delta * 1.2);
      rimLightRef.current.color.copy(st.rimColor);
    }
  });

  // Callout display numbers
  const oilPressurePSI = ((telemetry.oil_pressure ?? 380) * 0.145).toFixed(1);
  const egtDisplay = Math.round(telemetry.egt ?? 810);
  const vibDisplay = (telemetry.vibration ?? 1.1).toFixed(2);
  const rpmDisplay = Math.round(telemetry.rpm ?? 4800);

  const faultComp = (diagnosis.fault_component || '').toLowerCase();
  const oilOverrideStatus = faultComp.includes('oil')
    ? diagnosis.status.toLowerCase()
    : undefined;

  return (
    <group ref={engineGroupRef}>
      {/* ── Studio Multi-Source Lighting ── */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[6, 8, 6]} intensity={1.3} castShadow />
      <directionalLight position={[-6, -4, -4]} intensity={0.45} color="#CBD5E1" />
      <pointLight ref={rimLightRef} position={[-4, 3, -5]} intensity={0.9} />
      <pointLight position={[0, -2.5, 4]} intensity={0.4} color="#FFFFFF" />

      {/* ── 1. Horizontally Split Crankcase ── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.45, 1.9]} />
        <meshStandardMaterial color="#64748B" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Crankcase Center Splitting Line & Bolting Flange */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.24, 0.08, 1.94]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* ── 2. Central Forged Crankshaft ── */}
      <group ref={crankShaftRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 2.3, 20]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.08} />
        </mesh>
        {/* Crank Counterweights */}
        {[-0.6, -0.2, 0.2, 0.6].map((zPos, idx) => (
          <group key={idx} position={[0, 0, zPos]}>
            <mesh position={[0, idx % 2 === 0 ? 0.32 : -0.32, 0]}>
              <boxGeometry args={[0.42, 0.58, 0.1]} />
              <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.15} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── 3. Central Camshaft (Inside Crankcase, Turns at 0.5x Crank Speed) ── */}
      <group ref={camShaftRef} position={[0, 0.55, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 2.1, 16]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Cam Lobe Profiles */}
        {[-0.7, -0.35, 0, 0.35, 0.7].map((zOff, lIdx) => (
          <mesh key={lIdx} position={[0, 0.06, zOff]} rotation={[0, 0, lIdx * 1.2]}>
            <cylinderGeometry args={[0.1, 0.07, 0.08, 12]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.1} />
          </mesh>
        ))}
      </group>

      {/* ── 4. Four Horizontally Opposed Boxer Cylinders ── */}
      {/* Cyl 1: Front Left */}
      <CylinderUnit
        position={[-1.4, 0.22, 0.55]}
        rotation={[0, 0, 0]}
        pistonRef={p1Ref}
        rodRef={rod1Ref}
        rockerRef={rock1Ref}
        pushrodRef={push1Ref}
        headMatRef={head1MatRef}
        sparkLightRef={spark1Ref}
        isLeftBank={true}
      />

      {/* Cyl 2: Front Right */}
      <CylinderUnit
        position={[1.4, 0.22, 0.55]}
        rotation={[0, Math.PI, 0]}
        pistonRef={p2Ref}
        rodRef={rod2Ref}
        rockerRef={rock2Ref}
        pushrodRef={push2Ref}
        headMatRef={head2MatRef}
        sparkLightRef={spark2Ref}
        isLeftBank={false}
      />

      {/* Cyl 3: Rear Left */}
      <CylinderUnit
        position={[-1.4, -0.22, -0.55]}
        rotation={[0, 0, 0]}
        pistonRef={p3Ref}
        rodRef={rod3Ref}
        rockerRef={rock3Ref}
        pushrodRef={push3Ref}
        headMatRef={head3MatRef}
        sparkLightRef={spark3Ref}
        isLeftBank={true}
      />

      {/* Cyl 4: Rear Right */}
      <CylinderUnit
        position={[1.4, -0.22, -0.55]}
        rotation={[0, Math.PI, 0]}
        pistonRef={p4Ref}
        rodRef={rod4Ref}
        rockerRef={rock4Ref}
        pushrodRef={push4Ref}
        headMatRef={head4MatRef}
        sparkLightRef={spark4Ref}
        isLeftBank={false}
      />

      {/* ── 5. Twin Carburetors & Dual Intake Manifolds (One Per Bank) ── */}
      {/* Left Bank Carburetor */}
      <group position={[-1.15, 0.85, 0]}>
        <mesh>
          <boxGeometry args={[0.35, 0.45, 0.4]} />
          <meshStandardMaterial color="#64748B" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Carb Float Bowl */}
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.18, 16]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Intake Manifold Runners to Left Cylinders */}
        <mesh position={[0, -0.15, 0.45]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.65, 12]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.15, -0.45]} rotation={[-0.4, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.65, 12]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* Right Bank Carburetor */}
      <group position={[1.15, 0.85, 0]}>
        <mesh>
          <boxGeometry args={[0.35, 0.45, 0.4]} />
          <meshStandardMaterial color="#64748B" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.18, 16]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.15, 0.45]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.65, 12]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.15, -0.45]} rotation={[-0.4, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.65, 12]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* ── 6. Dry-Sump External Oil Tank & Scavenge Lines ── */}
      <group position={[1.4, -0.65, 0.95]}>
        {/* Cylindrical External Oil Tank */}
        <mesh castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.85, 20]} />
          <meshStandardMaterial
            ref={oilTankMatRef}
            color="#334155"
            metalness={0.75}
            roughness={0.3}
            emissive="#000000"
            emissiveIntensity={0}
          />
        </mesh>
        {/* Oil Tank Cap with Dipstick */}
        <mesh position={[0, 0.46, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.08, 16]} />
          <meshStandardMaterial color="#F59E0B" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Braided Stainless Scavenge Line to Crankcase */}
        <mesh
          ref={oilLineMatRef}
          position={[-0.45, -0.2, -0.3]}
          rotation={[0, 0.8, -0.4]}
        >
          <cylinderGeometry args={[0.035, 0.035, 0.8, 12]} />
          <meshStandardMaterial color="#D97706" metalness={0.85} roughness={0.3} />
        </mesh>
      </group>

      {/* ── 7. Liquid Cooling Radiator & Coolant Hoses ── */}
      <group position={[0, -1.05, 0]}>
        {/* Compact Radiator Core Below Crankcase */}
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[1.6, 0.35, 0.8]} />
          <meshStandardMaterial color="#1E293B" metalness={0.85} roughness={0.35} />
        </mesh>
        {/* Radiator Cooling Tubes */}
        {[-0.5, 0, 0.5].map((xR, rI) => (
          <mesh key={rI} position={[xR, -0.2, 0.42]}>
            <boxGeometry args={[0.12, 0.32, 0.04]} />
            <meshStandardMaterial color="#0284C7" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
        {/* Blue Coolant Hose */}
        <mesh
          ref={coolantHoseMatRef}
          position={[-0.8, 0.1, 0]}
          rotation={[0, 0, 0.6]}
        >
          <cylinderGeometry args={[0.04, 0.04, 0.6, 12]} />
          <meshStandardMaterial color="#0284C7" roughness={0.4} />
        </mesh>
      </group>

      {/* ── 8. Exhaust Headers & 4-into-1 Collector (EGT Thermal Glow) ── */}
      <group position={[0, -0.35, -1.35]}>
        {/* Main Collector Pipe */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.18, 0.85, 16]} />
          <meshStandardMaterial
            ref={exhaustMatRef}
            color="#78350F"
            metalness={0.7}
            roughness={0.35}
            emissive="#000000"
            emissiveIntensity={0}
          />
        </mesh>
        {/* Left & Right Bank Exhaust Headers */}
        <mesh position={[-0.85, 0.15, 0.35]} rotation={[0.4, 0, 0.6]}>
          <cylinderGeometry args={[0.08, 0.08, 0.95, 12]} />
          <meshStandardMaterial color="#475569" metalness={0.75} roughness={0.35} />
        </mesh>
        <mesh position={[0.85, 0.15, 0.35]} rotation={[0.4, 0, -0.6]}>
          <cylinderGeometry args={[0.08, 0.08, 0.95, 12]} />
          <meshStandardMaterial color="#475569" metalness={0.75} roughness={0.35} />
        </mesh>
      </group>

      {/* ── 9. Front Integrated Reduction Gearbox (PSRU, Crank ÷ 2.43) ── */}
      <group position={[0, 0, 1.35]}>
        {/* Cast Reduction Gearbox Housing */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.45, 0.55, 18]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Slower-Spinning Output Propeller Shaft & Flange (Crank ÷ 2.43) */}
        <group ref={propReductionRef} position={[0, 0, 0.35]}>
          {/* Propeller Hub Flange */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.44, 0.44, 0.09, 20]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.1} />
          </mesh>
          {/* Propeller Hub Spinner Cone */}
          <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.24, 0.42, 20]} />
            <meshStandardMaterial color="#FF6B35" metalness={0.85} roughness={0.2} />
          </mesh>
          {/* 6 Drive Flange Lug Bolts */}
          {[0, 1, 2, 3, 4, 5].map((bIdx) => {
            const bAngle = (bIdx * Math.PI) / 3;
            return (
              <mesh
                key={bIdx}
                position={[Math.cos(bAngle) * 0.32, Math.sin(bAngle) * 0.32, 0.05]}
              >
                <cylinderGeometry args={[0.025, 0.025, 0.04, 6]} />
                <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.1} />
              </mesh>
            );
          })}
        </group>
      </group>

      {/* ── 10. Rear Accessory Generator / Alternator ── */}
      <group position={[0, 0.1, -1.25]} ref={alternatorRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.35, 16]} />
          <meshStandardMaterial color="#1E293B" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Stator Cooling Slots */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.31, 0.31, 0.15, 16, 1, true]} />
          <meshStandardMaterial color="#D97706" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* ── 11. World-Anchored Annotated 3D Floating Callouts ── */}
      {/* 1. Vibration Callout (Pinned to Main Crankcase Bearing) */}
      <PartCallout
        position={[-2.2, 0.45, 0.8]}
        label="VIBRATION"
        value={vibDisplay}
        unit="g RMS"
        rawValue={telemetry.vibration}
        warnHigh={2.0}
        critHigh={3.0}
      />

      {/* 2. Oil Pressure Callout (Pinned to External Dry-Sump Oil Tank) */}
      <PartCallout
        position={[1.9, -0.6, 1.2]}
        label="OIL PRESSURE"
        value={oilPressurePSI}
        unit="PSI"
        rawValue={telemetry.oil_pressure}
        warnLow={280}
        critLow={200}
        overrideStatus={oilOverrideStatus}
      />

      {/* 3. EGT Callout (Pinned to Exhaust Collector Manifold) */}
      <PartCallout
        position={[0.2, 0.7, -1.9]}
        label="EGT"
        value={`${egtDisplay}`}
        unit="°C"
        rawValue={telemetry.egt}
        warnHigh={870}
        critHigh={910}
      />

      {/* 4. Engine RPM Callout (Pinned to PSRU Propeller Output Shaft) */}
      <PartCallout
        position={[2.0, 0.45, -0.5]}
        label="ENGINE SPEED"
        value={`${rpmDisplay}`}
        unit="RPM"
        rawValue={telemetry.rpm}
        warnHigh={5200}
        critHigh={5600}
      />
    </group>
  );
};

// ── Exported 3D Canvas Twin Component ─────────────────────────────────────
const EngineModel3D = () => {
  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden engine-glow bg-gradient-to-b from-slate-50 to-cream">
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          powerPreference: 'high-performance',
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 2.5, 5.4]} fov={44} />
        <EngineGeometry />
        <OrbitControls
          enableZoom={true}
          autoRotate={true}
          autoRotateSpeed={0.35}
          minDistance={3.2}
          maxDistance={10}
          maxPolarAngle={Math.PI / 1.7}
          dampingFactor={0.05}
        />
      </Canvas>

      {/* Overlay Badge */}
      <div className="absolute bottom-3 left-3 bg-white/85 backdrop-blur-sm border border-gray-200 text-[10px] text-gray-600 font-semibold px-2.5 py-1 rounded-lg shadow-sm pointer-events-none select-none flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        3D DIGITAL TWIN · Drag to Orbit · Scroll to Zoom
      </div>
    </div>
  );
};

export default EngineModel3D;
