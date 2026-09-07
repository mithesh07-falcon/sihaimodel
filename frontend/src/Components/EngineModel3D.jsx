/**
 * EngineModel3D.jsx
 * High-Fidelity Rotax 912 ULS 100 HP MALE UAV Engine — 3D Digital Twin
 *
 * Specifications & Features (Synchronized with Reference Image & Telemetry):
 *  • 4-Stroke 4-Cylinder Boxer Architecture (Horizontally Opposed)
 *  • Forward Propeller Speed Reduction Gearbox (PSRU) with exact 2.43:1 ratio
 *  • Rotating Propeller Drive Flange with 6-bolt circle pattern spinning at RPM / 2.43
 *  • Dual BING 64 Constant Velocity (CV) Carburetors on top with polished dome caps
 *  • Signature High-Temp Aviation Orange Fluid Lines & Fire-Sleeved Conduit
 *  • Deep-Black Valve / Rocker Covers with ROTAX branding & cooling fins
 *  • Liquid-Cooled Cylinder Heads with dynamic CHT thermal mapping
 *  • Tuned Stainless Steel 4-into-1 Exhaust Manifold with dynamic EGT glow
 *  • Reciprocating Pistons & Oscillating Connecting Rods driven by live RPM
 *  • Micro-vibration shudder matching live telemetry vibration (g)
 *  • Studio Lighting with clean isolated background in White & Orange theme
 */

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Html } from '@react-three/drei';
import { useEngineStore } from '../store/useEngineStore';
import {
  rpmToSpeed, thermalTarget, thermalIntensity,
  lerpColor, vibrationJitter, statusRimColor, easeRpm,
} from './twin/engineAnimation';
import * as THREE from 'three';

// ─── PBR Material Definitions matching Rotax 912 Photograph ──────────────────
const MAT_BRUSHED_ALU = { color: '#CAD3DB', metalness: 0.95, roughness: 0.32, clearcoat: 0.15, clearcoatRoughness: 0.2 };
const MAT_CAST_ALU    = { color: '#B8C2C9', metalness: 0.88, roughness: 0.48 };
const MAT_FINS        = { color: '#242B31', metalness: 0.40, roughness: 0.85 };
const MAT_STEEL_POL   = { color: '#E4ECF2', metalness: 1.0,  roughness: 0.08, clearcoat: 1.0, clearcoatRoughness: 0.08 };
const MAT_STEEL_FORG  = { color: '#A6B3BE', metalness: 0.92, roughness: 0.26 };
const MAT_ROTAX_BLACK = { color: '#1B2024', metalness: 0.30, roughness: 0.70 };
const MAT_HOSE_ORANGE = { color: '#FF6B35', metalness: 0.15, roughness: 0.45 }; // Signature Rotax orange hoses
const MAT_HOSE_COOL   = { color: '#2C353D', metalness: 0.05, roughness: 0.88 };
const MAT_EXHAUST     = { color: '#685A4C', metalness: 0.82, roughness: 0.40 };
const MAT_BRASS       = { color: '#C89C48', metalness: 0.90, roughness: 0.25 };

const pm = (mat, extra = {}) => ({ ...mat, ...extra });

// ─── Single Cylinder Unit (Boxer Bank) ──────────────────────────────────────
const CylinderUnit = React.memo(({
  position, rotation, isLeft,
  pistonRef, rodRef, headRef, sparkLightRef,
  chtColor, chtIntensity,
  onSelectPart, isSelected
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Air-cooled finned cylinder barrel */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.54, 0.54, 1.45, 24]} />
        <meshPhysicalMaterial {...pm(MAT_CAST_ALU)} />
      </mesh>

      {/* Cooling fins (Anodized dark fins as in Rotax 912) */}
      {[-0.48, -0.32, -0.16, 0.0, 0.16, 0.32, 0.48].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.67, 0.67, 0.045, 24]} />
          <meshPhysicalMaterial {...pm(MAT_FINS)} />
        </mesh>
      ))}

      {/* Liquid-Cooled Cylinder Head with dynamic CHT glow */}
      <group position={[isLeft ? -0.92 : 0.92, 0, 0]}>
        <mesh
          ref={headRef}
          castShadow
          onClick={(e) => { e.stopPropagation(); onSelectPart('cylinders'); }}
        >
          <boxGeometry args={[0.48, 1.16, 1.16]} />
          <meshPhysicalMaterial
            {...pm(MAT_BRUSHED_ALU)}
            emissive={chtColor || '#000000'}
            emissiveIntensity={chtIntensity || 0}
          />
        </mesh>

        {/* Black Rocker / Valve Cover branded ROTAX */}
        <mesh position={[isLeft ? -0.28 : 0.28, 0, 0]} castShadow>
          <boxGeometry args={[0.12, 1.05, 1.05]} />
          <meshPhysicalMaterial {...pm(MAT_ROTAX_BLACK)} />
        </mesh>
        {/* Embossed ROTAX badge strip */}
        <mesh position={[isLeft ? -0.35 : 0.35, 0, 0]}>
          <boxGeometry args={[0.03, 0.26, 0.65]} />
          <meshPhysicalMaterial color={isSelected ? '#FF6B35' : '#E2E8F0'} metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Coolant manifold pipe connector */}
        <mesh position={[0, 0.46, 0.3]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.065, 0.065, 0.32, 12]} />
          <meshPhysicalMaterial {...pm(MAT_BRASS)} />
        </mesh>

        {/* Dual Spark Plugs per cylinder (Rotax dual ignition) */}
        <mesh position={[0, 0.35, -0.32]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.28, 10]} />
          <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
        </mesh>
        <mesh position={[0, -0.35, -0.32]} rotation={[-0.4, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.28, 10]} />
          <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
        </mesh>

        {/* Spark firing light */}
        <pointLight ref={sparkLightRef} position={[0, 0, 0]} intensity={0.1} distance={2} color="#FF9933" />
      </group>

      {/* Internal Piston assembly */}
      <group ref={pistonRef}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.46, 0.46, 0.38, 20]} />
          <meshPhysicalMaterial color="#E2E8ED" metalness={0.95} roughness={0.15} />
        </mesh>
        {/* Connecting Rod */}
        <group ref={rodRef}>
          <mesh position={[isLeft ? 0.46 : -0.46, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.055, 0.075, 0.98, 10]} />
            <meshPhysicalMaterial {...pm(MAT_STEEL_FORG)} />
          </mesh>
        </group>
      </group>
    </group>
  );
});

// ─── 3D Sensor Pin Attached Directly to Mechanical Parts ───────────────────
const SensorPin = ({
  position,
  label,
  value,
  unit,
  partKey,
  status = 'nominal',
  isSelected,
  onSelect,
}) => {
  const isWarn = status === 'warning';
  const isCrit = status === 'critical';
  const beaconColor = isCrit ? '#EF4444' : isWarn ? '#F59E0B' : '#FF6B35';

  return (
    <group position={position}>
      {/* 3D Pointer Stem Needle */}
      <mesh position={[0, -0.07, 0]}>
        <cylinderGeometry args={[0.015, 0.005, 0.14, 8]} />
        <meshBasicMaterial color={beaconColor} />
      </mesh>

      {/* 3D Luminous Sphere Beacon */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color={beaconColor} />
      </mesh>

      {/* Outer Pulse Halo */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.088, 20]} />
        <meshBasicMaterial color={beaconColor} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Embedded 2D HTML Badge that tracks 3D Position */}
      <Html
        position={[0, 0.22, 0]}
        distanceFactor={7.5}
        center
        className="pointer-events-auto select-none"
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(partKey);
          }}
          className={`cursor-pointer group flex items-center gap-1.5 px-2.5 py-1 rounded-xl shadow-lg border transition-all duration-200 backdrop-blur-md ${
            isSelected
              ? 'bg-orange-500 text-white border-orange-400 ring-2 ring-orange-300/80 scale-105'
              : isCrit
              ? 'bg-red-50/95 text-red-950 border-red-400 hover:border-red-600 shadow-red-500/20'
              : isWarn
              ? 'bg-amber-50/95 text-amber-950 border-amber-400 hover:border-amber-600 shadow-amber-500/20'
              : 'bg-white/95 text-gray-900 border-gray-200/90 hover:border-orange-500 hover:shadow-orange-500/15'
          }`}
          style={{ whiteSpace: 'nowrap' }}
          title={`Click to inspect ${label}`}
        >
          {/* Status Indicator Dot */}
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isCrit
                ? 'bg-red-500 animate-ping'
                : isWarn
                ? 'bg-amber-500 animate-pulse'
                : isSelected
                ? 'bg-white animate-pulse'
                : 'bg-orange-500'
            }`}
          />
          <div className="flex flex-col text-left leading-none">
            <span
              className={`text-[8px] font-black uppercase tracking-wider ${
                isSelected ? 'text-orange-100' : 'text-gray-400'
              }`}
            >
              {label}
            </span>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <span
                className={`font-mono text-[11px] font-black ${
                  isSelected ? 'text-white' : 'text-gray-900'
                }`}
              >
                {value}
              </span>
              {unit && (
                <span
                  className={`text-[9px] font-bold ${
                    isSelected ? 'text-orange-200' : 'text-gray-500'
                  }`}
                >
                  {unit}
                </span>
              )}
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
};

// ─── Main Rotax 912 Engine 3D Model ─────────────────────────────────────────
const Rotax912Assembly = ({ showPins = true }) => {
  const telemetry = useEngineStore((s) => s.telemetry);
  const diagnosis = useEngineStore((s) => s.diagnosis);
  const selectedPart = useEngineStore((s) => s.selectedPart);
  const setSelectedPart = useEngineStore((s) => s.setSelectedPart);

  const rpm = Math.round(telemetry?.rpm ?? 0);
  const propRpm = Math.round(rpm / 2.43);
  const cht = telemetry?.cht != null ? Number(telemetry.cht).toFixed(1) : '110.0';
  const cht2 = telemetry?.cht != null ? (Number(telemetry.cht) + 1.2).toFixed(1) : '111.2';
  const egt = telemetry?.egt != null ? Math.round(telemetry.egt) : 810;
  const rawOp = telemetry?.oil_pressure ?? 380;
  const oilP = (rawOp > 0 && rawOp < 25) ? Number(rawOp).toFixed(1) : (rawOp / 100).toFixed(1);
  const oilT = telemetry?.oil_temp != null ? Math.round(telemetry.oil_temp) : 92;
  const fuelFlow = telemetry?.fuel_flow != null ? Number(telemetry.fuel_flow).toFixed(1) : '18.2';
  const vib = telemetry?.vibration != null ? Number(telemetry.vibration).toFixed(2) : (telemetry?.vibration_rms != null ? Number(telemetry.vibration_rms).toFixed(2) : '0.85');

  const groupRef    = useRef();
  const crankRef    = useRef();
  const propRef     = useRef();
  const exhRef      = useRef();
  const carb1Ref    = useRef();
  const carb2Ref    = useRef();

  const pRefs  = [useRef(), useRef(), useRef(), useRef()];
  const rRefs  = [useRef(), useRef(), useRef(), useRef()];
  const hRefs  = [useRef(), useRef(), useRef(), useRef()];
  const spRefs = [useRef(), useRef(), useRef(), useRef()];

  const stateRef = useRef({
    crankAngle: 0,
    visualRpm: 0,
    headColor: new THREE.Color('#CAD3DB'),
    exhColor:  new THREE.Color('#685A4C'),
    headIntensity: 0,
    exhIntensity: 0,
  });

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const s = stateRef.current;

    // Real live telemetry from virtual engine
    const rawRpm = telemetry.rpm ?? 0;
    const cht = telemetry.cht ?? 110;
    const egt = telemetry.egt ?? 810;
    const vib = telemetry.vibration ?? telemetry.vibration_rms ?? 0.8;
    const isRunning = Boolean(telemetry.engine_on || rawRpm > 100);

    // RPM smoothing & scaling
    const targetSpeed = isRunning ? rpmToSpeed(rawRpm || 2400) : 0;
    s.visualRpm = easeRpm(s.visualRpm, targetSpeed, delta * 3);
    s.crankAngle += delta * s.visualRpm;

    const ca = s.crankAngle;

    // 1. Crankshaft rotation
    if (crankRef.current) crankRef.current.rotation.z = ca;

    // 2. Propeller Flange rotation at EXACT 2.43:1 PSRU ratio!
    if (propRef.current) {
      propRef.current.rotation.z = ca / 2.43;
    }

    // 3. Opposed boxer piston reciprocation
    const stroke = 0.42;
    if (pRefs[0].current) pRefs[0].current.position.x = -Math.sin(ca) * stroke;
    if (pRefs[1].current) pRefs[1].current.position.x =  Math.sin(ca) * stroke;
    if (pRefs[2].current) pRefs[2].current.position.x = -Math.sin(ca + Math.PI) * stroke;
    if (pRefs[3].current) pRefs[3].current.position.x =  Math.sin(ca + Math.PI) * stroke;

    // Connecting rod oscillation
    const rodAng = Math.cos(ca) * 0.18;
    if (rRefs[0].current) rRefs[0].current.rotation.y = rodAng;
    if (rRefs[1].current) rRefs[1].current.rotation.y = -rodAng;
    if (rRefs[2].current) rRefs[2].current.rotation.y = -rodAng;
    if (rRefs[3].current) rRefs[3].current.rotation.y = rodAng;

    // Spark flash simulation
    if (isRunning) {
      const spark = (phase) => Math.max(0, Math.sin(ca * 0.5 + phase)) ** 6 * 1.8;
      spRefs.forEach((ref, idx) => {
        if (ref.current) ref.current.intensity = 0.15 + spark(idx * Math.PI * 0.5);
      });
    } else {
      spRefs.forEach(ref => { if (ref.current) ref.current.intensity = 0; });
    }

    // 4. Real-time CHT thermal glow
    const targetHeadColor = thermalTarget(cht, 105, 125, 138);
    const targetHeadInt = isRunning ? thermalIntensity(cht, 105, 125, 138) : 0;
    s.headColor = lerpColor(s.headColor, targetHeadColor, delta * 2);
    s.headIntensity = THREE.MathUtils.lerp(s.headIntensity, targetHeadInt, delta * 2);

    hRefs.forEach(ref => {
      if (ref.current) {
        ref.current.material.emissive.copy(s.headColor);
        ref.current.material.emissiveIntensity = s.headIntensity;
      }
    });

    // 5. Real-time EGT exhaust glow
    const targetExhColor = thermalTarget(egt, 740, 850, 910);
    const targetExhInt = isRunning ? (thermalIntensity(egt, 740, 850, 910) + 0.15) : 0;
    s.exhColor = lerpColor(s.exhColor, targetExhColor, delta * 2);
    s.exhIntensity = THREE.MathUtils.lerp(s.exhIntensity, targetExhInt, delta * 2);

    if (exhRef.current) {
      exhRef.current.material.emissive.copy(s.exhColor);
      exhRef.current.material.emissiveIntensity = s.exhIntensity;
    }

    // 6. Micro-vibration shudder matching live vibration telemetry
    if (groupRef.current && isRunning && vib > 0.1) {
      const j = vibrationJitter(t, vib, 0.015);
      groupRef.current.position.x = j.x;
      groupRef.current.position.y = -0.1 + j.y;
      groupRef.current.position.z = j.z;
    } else if (groupRef.current) {
      groupRef.current.position.set(0, -0.1, 0);
    }
  });

  return (
    <group ref={groupRef} scale={[1.15, 1.15, 1.15]} position={[0, -0.1, 0]}>
      {/* ── 1. CENTRAL CRANKCASE (Horizontally Split Aluminium Alloy) ── */}
      <mesh
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); setSelectedPart('crankcase'); }}
      >
        <boxGeometry args={[2.35, 1.55, 2.05]} />
        <meshPhysicalMaterial {...pm(MAT_CAST_ALU)} />
      </mesh>
      {/* Central horizontal split line */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.38, 0.04, 2.08]} />
        <meshPhysicalMaterial color="#64748B" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Structural Stiffening Ribs on crankcase */}
      {[-0.6, 0, 0.6].map((z, i) => (
        <mesh key={i} position={[0, 0.78, z]}>
          <boxGeometry args={[1.8, 0.08, 0.06]} />
          <meshPhysicalMaterial {...pm(MAT_CAST_ALU)} />
        </mesh>
      ))}

      {/* ── 2. PROMINENT FORWARD PROPELLER SPEED REDUCTION GEARBOX (PSRU) ── */}
      {/* Gearbox Housing protruding forward from crankcase */}
      <group position={[0, 0.12, 1.35]}>
        <mesh
          castShadow
          onClick={(e) => { e.stopPropagation(); setSelectedPart('gearbox'); }}
        >
          {/* Tapered bell housing */}
          <cylinderGeometry args={[0.42, 0.62, 0.65, 20]} />
          <meshPhysicalMaterial {...pm(MAT_BRUSHED_ALU)} />
        </mesh>
        {/* Gearbox reinforcement flange */}
        <mesh position={[0, -0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.66, 0.66, 0.08, 20]} />
          <meshPhysicalMaterial {...pm(MAT_CAST_ALU)} />
        </mesh>

        {/* 2.43:1 Gear Reduction Propeller Output Flange (Spins at RPM / 2.43) */}
        <group ref={propRef} position={[0, 0, 0.38]}>
          {/* Main prop drive hub */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.48, 0.48, 0.12, 24]} />
            <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
          </mesh>
          {/* Ring gear perimeter teeth indication */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.52, 0.52, 0.04, 32]} />
            <meshPhysicalMaterial color="#94A3B8" metalness={0.95} roughness={0.2} />
          </mesh>
          {/* Central pilot guide shaft */}
          <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.16, 18]} />
            <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
          </mesh>
          {/* 6 Propeller Mounting Bolt Holes & Studs */}
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const angle = (idx * Math.PI) / 3;
            return (
              <mesh
                key={idx}
                position={[Math.cos(angle) * 0.36, Math.sin(angle) * 0.36, 0.08]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.035, 0.035, 0.08, 8]} />
                <meshPhysicalMaterial color="#334155" metalness={0.9} roughness={0.1} />
              </mesh>
            );
          })}
        </group>
      </group>

      {/* ── 3. FOUR BOXER CYLINDERS (Opposed 2x2 Layout) ── */}
      {[
        { pos: [-1.48,  0.22,  0.55], rot: [0, 0, 0],       isLeft: true,  idx: 0 },
        { pos: [ 1.48,  0.22,  0.55], rot: [0, Math.PI, 0], isLeft: false, idx: 1 },
        { pos: [-1.48, -0.22, -0.55], rot: [0, 0, 0],       isLeft: true,  idx: 2 },
        { pos: [ 1.48, -0.22, -0.55], rot: [0, Math.PI, 0], isLeft: false, idx: 3 },
      ].map(({ pos, rot, isLeft, idx }) => (
        <CylinderUnit
          key={idx}
          position={pos}
          rotation={rot}
          isLeft={isLeft}
          pistonRef={pRefs[idx]}
          rodRef={rRefs[idx]}
          headRef={hRefs[idx]}
          sparkLightRef={spRefs[idx]}
          onSelectPart={setSelectedPart}
          isSelected={selectedPart === 'cylinders'}
        />
      ))}

      {/* ── 4. DUAL BING 64 CONSTANT VELOCITY CARBURETORS ON TOP ── */}
      {[-1, 1].map((side, i) => (
        <group
          key={i}
          ref={i === 0 ? carb1Ref : carb2Ref}
          position={[side * 0.85, 1.02, 0.15]}
          onClick={(e) => { e.stopPropagation(); setSelectedPart('fuel_system'); }}
        >
          {/* Polished Upper Vacuum Dome Cap */}
          <mesh castShadow position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.22, 0.28, 0.25, 18]} />
            <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
          </mesh>
          {/* Top damper adjustment screw */}
          <mesh position={[0, 0.38, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.08, 8]} />
            <meshPhysicalMaterial {...pm(MAT_BRASS)} />
          </mesh>
          {/* Main Carburetor Venturi Body */}
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[0.38, 0.32, 0.42]} />
            <meshPhysicalMaterial {...pm(MAT_BRUSHED_ALU)} />
          </mesh>
          {/* Lower Float Chamber Bowl */}
          <mesh position={[0, -0.22, 0]} castShadow>
            <cylinderGeometry args={[0.19, 0.17, 0.22, 16]} />
            <meshPhysicalMaterial {...pm(MAT_CAST_ALU)} />
          </mesh>
          {/* Curved Cast Intake Manifold Runners to Cylinder Heads */}
          <mesh position={[side * 0.35, -0.32, 0.35]} rotation={[0.4, 0, side * 0.6]}>
            <cylinderGeometry args={[0.085, 0.085, 0.72, 12]} />
            <meshPhysicalMaterial {...pm(MAT_BRUSHED_ALU)} />
          </mesh>
          <mesh position={[side * 0.35, -0.32, -0.35]} rotation={[-0.4, 0, side * 0.6]}>
            <cylinderGeometry args={[0.085, 0.085, 0.72, 12]} />
            <meshPhysicalMaterial {...pm(MAT_BRUSHED_ALU)} />
          </mesh>
        </group>
      ))}

      {/* ── 5. SIGNATURE VIBRANT ORANGE AVIATION FLUID & IGNITION CONDUITS ── */}
      {/* High-visibility orange fire-sleeved lines routing across top (as in photo) */}
      <group>
        {/* Main top cross-feed orange line */}
        <mesh position={[0, 1.25, 0.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 1.95, 12]} />
          <meshPhysicalMaterial {...pm(MAT_HOSE_ORANGE)} />
        </mesh>
        {/* Branch 1 curving to left carb */}
        <mesh position={[-0.65, 1.15, 0.28]} rotation={[0.5, 0, -0.4]}>
          <cylinderGeometry args={[0.038, 0.038, 0.65, 10]} />
          <meshPhysicalMaterial {...pm(MAT_HOSE_ORANGE)} />
        </mesh>
        {/* Branch 2 curving to right carb */}
        <mesh position={[0.65, 1.15, 0.28]} rotation={[0.5, 0, 0.4]}>
          <cylinderGeometry args={[0.038, 0.038, 0.65, 10]} />
          <meshPhysicalMaterial {...pm(MAT_HOSE_ORANGE)} />
        </mesh>
        {/* Supply line curving down to fuel pump */}
        <mesh position={[0.4, 0.85, 0.7]} rotation={[0.8, 0.4, -0.3]}>
          <cylinderGeometry args={[0.042, 0.042, 0.95, 10]} />
          <meshPhysicalMaterial {...pm(MAT_HOSE_ORANGE)} />
        </mesh>
      </group>

      {/* ── 6. TUNED STAINLESS STEEL EXHAUST MANIFOLD & COLLECTOR ── */}
      <group position={[0, -0.75, -0.3]}>
        {/* Lower Muffler / Collector Canister */}
        <mesh
          ref={exhRef}
          position={[0, -0.45, -0.85]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
          onClick={(e) => { e.stopPropagation(); setSelectedPart('exhaust'); }}
        >
          <cylinderGeometry args={[0.26, 0.26, 1.25, 18]} />
          <meshPhysicalMaterial {...pm(MAT_EXHAUST)} />
        </mesh>
        {/* Exhaust runner pipes from all 4 cylinder heads */}
        {[-1, 1].map((side, i) => (
          <React.Fragment key={i}>
            <mesh position={[side * 1.15, 0.18, 0.35]} rotation={[0.6, 0, side * 0.55]}>
              <cylinderGeometry args={[0.075, 0.075, 0.95, 12]} />
              <meshPhysicalMaterial {...pm(MAT_EXHAUST)} />
            </mesh>
            <mesh position={[side * 1.15, 0.18, -0.35]} rotation={[-0.4, 0, side * 0.55]}>
              <cylinderGeometry args={[0.075, 0.075, 0.95, 12]} />
              <meshPhysicalMaterial {...pm(MAT_EXHAUST)} />
            </mesh>
          </React.Fragment>
        ))}
      </group>

      {/* ── 7. REAR ACCESSORY SECTION & MECHANICAL FUEL PUMP ── */}
      <group position={[0, -0.1, -1.25]}>
        {/* Rear starter / alternator casing */}
        <mesh castShadow>
          <cylinderGeometry args={[0.45, 0.55, 0.55, 18]} />
          <meshPhysicalMaterial {...pm(MAT_CAST_ALU)} />
        </mesh>
        {/* Diaphragm mechanical fuel pump */}
        <mesh position={[0.55, 0.25, 0.1]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.22, 0.25, 14]} />
          <meshPhysicalMaterial {...pm(MAT_BRUSHED_ALU)} />
        </mesh>
        {/* Oil filter spin-on canister (Rotax black filter) */}
        <mesh position={[-0.6, -0.35, 0]} rotation={[0.4, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.16, 0.42, 16]} />
          <meshPhysicalMaterial color="#111827" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* ── 8. COOLANT PLUMBING & WATER PUMP ── */}
      <group position={[0, -0.92, 0.4]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.25, 0.28, 14]} />
          <meshPhysicalMaterial {...pm(MAT_BRUSHED_ALU)} />
        </mesh>
        {/* Coolant distribution cross tubes */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.048, 0.048, 1.85, 10]} />
          <meshPhysicalMaterial {...pm(MAT_HOSE_COOL)} />
        </mesh>
      </group>

      {/* ── 9. REAL-TIME 3D SENSOR PINS ON ENGINE PARTS ── */}
      {showPins && (
        <group>
          {/* PSRU Gearbox & Propeller Shaft Pin */}
          <SensorPin
            position={[0, 0.72, 1.45]}
            label="PSRU 2.43:1"
            value={propRpm.toLocaleString()}
            unit="RPM"
            partKey="gearbox"
            status="nominal"
            isSelected={selectedPart === 'gearbox'}
            onSelect={setSelectedPart}
          />

          {/* Dual BING 64 Carburetors Pin */}
          <SensorPin
            position={[0, 1.48, 0.15]}
            label="BING 64 Carbs"
            value={fuelFlow}
            unit="L/h"
            partKey="fuel_system"
            status={Number(fuelFlow) > 24 || Number(fuelFlow) < 12 ? 'warning' : 'nominal'}
            isSelected={selectedPart === 'fuel_system'}
            onSelect={setSelectedPart}
          />

          {/* Cylinder Bank 1 & 3 Left Head (CHT) */}
          <SensorPin
            position={[-1.75, 0.55, 0.55]}
            label="Cyl 1/3 CHT"
            value={cht}
            unit="°C"
            partKey="cylinders"
            status={Number(cht) >= 145 ? 'critical' : Number(cht) >= 130 ? 'warning' : 'nominal'}
            isSelected={selectedPart === 'cylinders'}
            onSelect={setSelectedPart}
          />

          {/* Cylinder Bank 2 & 4 Right Head (CHT) */}
          <SensorPin
            position={[1.75, 0.55, -0.55]}
            label="Cyl 2/4 CHT"
            value={cht2}
            unit="°C"
            partKey="cylinders"
            status={Number(cht2) >= 145 ? 'critical' : Number(cht2) >= 130 ? 'warning' : 'nominal'}
            isSelected={selectedPart === 'cylinders'}
            onSelect={setSelectedPart}
          />

          {/* Tuned Stainless Exhaust Collector (EGT) */}
          <SensorPin
            position={[0, -1.25, -0.9]}
            label="Exhaust EGT"
            value={egt}
            unit="°C"
            partKey="exhaust"
            status={Number(egt) >= 910 ? 'critical' : Number(egt) >= 870 ? 'warning' : 'nominal'}
            isSelected={selectedPart === 'exhaust'}
            onSelect={setSelectedPart}
          />

          {/* Crankcase & Lubrication System (Oil P & T) */}
          <SensorPin
            position={[0.95, -0.75, 0.2]}
            label="Oil System"
            value={`${oilP} bar · ${oilT}°C`}
            partKey="crankcase"
            status={Number(oilP) < 2.0 || Number(oilT) > 125 ? 'critical' : Number(oilP) < 2.8 || Number(oilT) > 110 ? 'warning' : 'nominal'}
            isSelected={selectedPart === 'crankcase'}
            onSelect={setSelectedPart}
          />

          {/* Vibration Sensor on Engine Mount */}
          <SensorPin
            position={[-0.95, -0.45, 0.95]}
            label="Vib Sensor"
            value={vib}
            unit="g"
            partKey="crankcase"
            status={Number(vib) >= 2.8 ? 'critical' : Number(vib) >= 1.8 ? 'warning' : 'nominal'}
            isSelected={selectedPart === 'crankcase'}
            onSelect={setSelectedPart}
          />
        </group>
      )}
    </group>
  );
};

// ─── Exported Master 3D Component with Studio Lighting & Overlay ────────────
const EngineModel3D = () => {
  const [showPins, setShowPins] = useState(true);
  const telemetry = useEngineStore((s) => s.telemetry);
  const diagnosis = useEngineStore((s) => s.diagnosis);
  const streamConnected = useEngineStore((s) => s.streamConnected);
  const selectedPart = useEngineStore((s) => s.selectedPart);
  const setSelectedPart = useEngineStore((s) => s.setSelectedPart);

  const rpm = Math.round(telemetry?.rpm ?? 0);
  const propRpm = Math.round(rpm / 2.43);
  const cht = telemetry?.cht ? Number(telemetry.cht).toFixed(1) : '110.0';
  const egt = telemetry?.egt ? Math.round(telemetry.egt) : '810';
  const vib = telemetry?.vibration != null ? Number(telemetry.vibration).toFixed(2) : '0.85';

  return (
    <div className="w-full h-[460px] lg:h-[520px] bg-gradient-to-b from-[#F8FAFC] to-[#EDF2F7] border border-gray-200/80 rounded-3xl relative shadow-sm overflow-hidden select-none font-sans">
      
      {/* ── 3D Three.js Scene ── */}
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.12,
          powerPreference: 'high-performance'
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <PerspectiveCamera makeDefault position={[3.2, 2.2, 4.4]} fov={46} />
        
        {/* Studio Lighting */}
        <ambientLight intensity={0.7} />
        {/* Main studio key light with soft shadow */}
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.8}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0002}
        />
        {/* Warm fill light */}
        <directionalLight position={[-6, 4, -4]} intensity={0.8} color="#FFF5EB" />
        {/* Cool rim reflection light */}
        <directionalLight position={[0, -4, 5]} intensity={0.4} color="#E0F2FE" />

        {/* Rotax 912 Complete Assembly */}
        <Rotax912Assembly showPins={showPins} />

        {/* Clean studio contact shadow on floor plane */}
        <ContactShadows
          position={[0, -1.35, 0]}
          opacity={0.48}
          scale={7}
          blur={2.0}
          far={2.2}
          color="#0F172A"
        />

        <OrbitControls
          enableZoom={true}
          enablePan={true}
          autoRotate={!selectedPart && rpm > 0}
          autoRotateSpeed={0.8}
          maxPolarAngle={Math.PI / 2 + 0.05}
          minDistance={2.0}
          maxDistance={8.5}
          target={[0, 0.05, 0]}
        />
      </Canvas>

      {/* ── Top-Left Engine Spec & Telemetry HUD ── */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs">
          <div className={`w-2.5 h-2.5 rounded-full ${streamConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-[11px] font-black tracking-wider text-gray-900 uppercase">
            ROTAX 912 ULS · 4-CYLINDER BOXER
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-600">
            PSRU 2.43:1
          </span>
        </div>

        {/* Live synchronized metrics pill */}
        <div className="flex items-center gap-2.5 bg-white/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs text-xs">
          <span className="text-gray-500 font-semibold">Engine Speed:</span>
          <span className="font-black text-gray-900 font-mono">{rpm.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">RPM</span></span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500 font-semibold">Prop Speed:</span>
          <span className="font-black text-orange-600 font-mono">{propRpm.toLocaleString()} <span className="text-[10px] text-orange-400 font-normal">RPM</span></span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500 font-semibold">CHT:</span>
          <span className="font-black text-gray-900 font-mono">{cht}°C</span>
        </div>
      </div>

      {/* ── Top-Right Controls & Technical Part Inspector ── */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2.5">
        {/* Interactive ON/OFF Button for 3D Sensor Pins */}
        <button
          id="engine-pins-toggle-btn"
          onClick={() => setShowPins((prev) => !prev)}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md backdrop-blur-md cursor-pointer border select-none ${
            showPins
              ? 'bg-orange-500 text-white border-orange-400 shadow-orange-500/25 ring-2 ring-orange-400/30'
              : 'bg-white/95 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-orange-300'
          }`}
          title="Toggle Real-Time Sensor Pins directly on 3D Engine parts"
        >
          <span className={`w-2.5 h-2.5 rounded-full ${showPins ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
          <span className="tracking-wide uppercase font-black text-[11px]">
            Sensor Pins: {showPins ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Selected Part Technical Inspector Card */}
        {selectedPart && (
          <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-orange-200 shadow-lg flex flex-col gap-1 max-w-[250px] animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">INSPECTED COMPONENT</span>
              <button
                onClick={() => setSelectedPart(null)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold px-1 rounded-md hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <p className="text-sm font-black text-gray-900 capitalize">{selectedPart.replace('_', ' ')}</p>
            <p className="text-[11px] text-gray-600 leading-snug">
              {selectedPart === 'gearbox' && 'Propeller Speed Reduction Unit (PSRU) with integrated dog clutch, ratio 2.43:1.'}
              {selectedPart === 'fuel_system' && 'Dual BING 64 Constant Velocity Carburetors with automatic altitude compensating diaphragm.'}
              {selectedPart === 'cylinders' && 'Liquid-cooled cylinder heads and air-cooled finned steel cylinder barrels.'}
              {selectedPart === 'exhaust' && 'Tuned 4-into-1 stainless steel exhaust collector manifold with EGT monitoring.'}
              {selectedPart === 'crankcase' && 'Cast aluminum alloy horizontally split crankcase with dry-sump forced lubrication.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Bottom Controls & Camera Hint ── */}
      <div className="absolute bottom-3 left-3 z-20 font-mono text-[9.5px] text-gray-500 bg-white/90 backdrop-blur-md border border-gray-200 px-3 py-2 rounded-xl flex items-center gap-4 shadow-xs">
        <div className="flex items-center gap-1.5 text-orange-600 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          <span>3D ROTAX DIGITAL TWIN</span>
        </div>
        <span>• Left Click + Drag to rotate</span>
        <span>• Scroll to zoom</span>
        <span>• Click parts or pins to inspect</span>
      </div>
    </div>
  );
};

export default EngineModel3D;
