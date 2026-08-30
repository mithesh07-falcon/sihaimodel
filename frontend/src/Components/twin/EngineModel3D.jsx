/**
 * EngineModel3D.jsx
 * Rotax 912-class MALE UAV Engine — Cinematic 3D Digital Twin
 *
 * Features:
 *  • MeshPhysicalMaterial: brushed-aluminium crankcase, matte-black fins,
 *    polished-steel bolts, rubber hoses
 *  • drei Environment (HDRI studio preset) + ContactShadows + rim lights
 *  • Animated Camera Rig: establishing shot → smooth orbit → DoF focus on fault
 *  • Condition-driven FX: X-ray transparency on Warning/Critical, carb zoom on hover
 *  • Teal-orange cinematic grade overlay + film-grain CSS layer
 *  • cubic-bezier eased transitions, AdaptiveDpr (60→30 fps fallback)
 *  • All animation targets driven from Zustand store (single source of truth)
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls, Environment, ContactShadows,
  PerspectiveCamera, AdaptiveDpr,
} from '@react-three/drei';
import { useEngineStore } from '../../store/useEngineStore';
import PartCallout from './PartCallout';
import {
  rpmToSpeed, thermalTarget, thermalIntensity,
  lerpColor, vibrationJitter, statusRimColor, easeRpm,
} from './engineAnimation';
import * as THREE from 'three';

// ─── PBR Material Palettes ────────────────────────────────────────────────────
// Brushed aluminium (crankcase, gearbox, carb bodies, heads)
const MAT_BRUSHED_ALU = { color: '#BFC8CE', metalness: 1.0, roughness: 0.38, clearcoat: 0.12, clearcoatRoughness: 0.18 };
// Cast aluminium (crankcase outer body, slightly rougher)
const MAT_CAST_ALU   = { color: '#C2CAD0', metalness: 0.95, roughness: 0.45 };
// Matte black cooling fins (anodised)
const MAT_FINS       = { color: '#1E2428', metalness: 0.35, roughness: 0.88 };
// Polished turned steel (crankshaft, bolts, wrist pins)
const MAT_STEEL_POL  = { color: '#D8DFE5', metalness: 1.0, roughness: 0.06, clearcoat: 1.0, clearcoatRoughness: 0.06 };
// Forged steel H-beam (connecting rods)
const MAT_STEEL_FORG = { color: '#B8C3CC', metalness: 0.9, roughness: 0.28 };
// Piston alloy (polished crown)
const MAT_PISTON     = { color: '#E2E8ED', metalness: 0.95, roughness: 0.18 };
// Piston rings / ring pack (harder, darker tool steel)
const MAT_RING       = { color: '#6A7A86', metalness: 0.95, roughness: 0.15 };
// Rubber hose (coolant, oil — subtle wear texture via roughness)
const MAT_HOSE_COOL  = { color: '#122D4A', metalness: 0.0, roughness: 0.92 };
const MAT_HOSE_OIL   = { color: '#1C1410', metalness: 0.0, roughness: 0.95 };
// Brass / copper fitting (oil scavenge banjo)
const MAT_BRASS      = { color: '#C8A060', metalness: 0.9, roughness: 0.28 };
// Safety-orange spinner (brand accent)
const MAT_SPINNER    = { color: '#FF6B35', metalness: 0.82, roughness: 0.22 };
// Exhaust steel (heat-blued, dark)
const MAT_EXHAUST    = { color: '#4A3828', metalness: 0.75, roughness: 0.55, emissive: '#000000', emissiveIntensity: 0 };
// Red ignition HT lead
const MAT_LEAD_RED   = { color: '#CC1111', metalness: 0.0, roughness: 0.55 };
// Blue ignition HT lead
const MAT_LEAD_BLUE  = { color: '#1155CC', metalness: 0.0, roughness: 0.55 };

// Helper: create PhysicalMaterial props
const pm = (mat, extra = {}) => ({ ...mat, ...extra });

// ─── Easing helper (cubic-bezier approximation for lerp speed) ────────────────
const cubicEase = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ─── Single Cylinder Assembly ─────────────────────────────────────────────────
const CylinderUnit = React.memo(({
  position, rotation,
  pistonRef, rodRef, rockerRef, headMatRef, sparkLightRef,
  isLeft, xrayMode,
}) => {
  const xrayProps = xrayMode
    ? { transparent: true, opacity: 0.18, depthWrite: false }
    : {};

  return (
    <group position={position} rotation={rotation}>
      {/* Air-cooled finned cylinder barrel (matte black anodised fins) */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.52, 0.52, 1.4, 22]} />
        <meshPhysicalMaterial {...pm(MAT_CAST_ALU)} {...xrayProps} />
      </mesh>

      {/* Cooling fins — matte black anodised aluminium */}
      {[-0.44, -0.28, -0.12, 0.04, 0.20, 0.36].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.65, 0.65, 0.042, 22]} />
          <meshPhysicalMaterial {...pm(MAT_FINS)} {...xrayProps} />
        </mesh>
      ))}

      {/* Inner bore face — shadowed cylinder wall */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[isLeft ? -0.7 : 0.7, 0, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 0.02, 22]} />
        <meshPhysicalMaterial color="#3A4550" metalness={0.8} roughness={0.4} />
      </mesh>

      {/* ── Liquid-Cooled Cylinder Head (brushed aluminium) ── */}
      <group position={[isLeft ? -0.9 : 0.9, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.46, 1.14, 1.14]} />
          <meshPhysicalMaterial
            ref={headMatRef}
            {...pm(MAT_BRUSHED_ALU)}
            emissive="#000000"
            emissiveIntensity={0}
            {...xrayProps}
          />
        </mesh>

        {/* Valve / rocker cover — same brushed alu but slightly shinier */}
        <mesh position={[isLeft ? -0.27 : 0.27, 0.08, 0]}>
          <boxGeometry args={[0.11, 0.84, 0.84]} />
          <meshPhysicalMaterial {...pm(MAT_BRUSHED_ALU, { roughness: 0.28 })} {...xrayProps} />
        </mesh>

        {/* Coolant hose outlet (rubber) */}
        <mesh position={[0, -0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.042, 0.042, 0.14, 10]} />
          <meshPhysicalMaterial {...pm(MAT_HOSE_COOL)} />
        </mesh>

        {/* Spark plug 1 (polished hex body) */}
        <group position={[0, 0.6, -0.24]} rotation={[0.28, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.052, 0.068, 0.18, 6]} />
            <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
          </mesh>
          {/* HT lead 1 — red */}
          <mesh position={[-0.04, 0.16, 0.04]} rotation={[0.5, 0, 0.1]}>
            <cylinderGeometry args={[0.016, 0.016, 0.18, 6]} />
            <meshPhysicalMaterial {...pm(MAT_LEAD_RED)} />
          </mesh>
        </group>

        {/* Spark plug 2 (dual ignition circuit) */}
        <group position={[0, 0.6, 0.24]} rotation={[-0.28, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.052, 0.068, 0.18, 6]} />
            <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
          </mesh>
          {/* HT lead 2 — blue */}
          <mesh position={[-0.04, 0.16, -0.04]} rotation={[-0.5, 0, 0.1]}>
            <cylinderGeometry args={[0.016, 0.016, 0.18, 6]} />
            <meshPhysicalMaterial {...pm(MAT_LEAD_BLUE)} />
          </mesh>
        </group>

        {/* Polished cap bolts (6 per head) */}
        {[[-0.3, -0.42], [-0.3, 0.42], [0, -0.5], [0, 0.5], [0.3, -0.42], [0.3, 0.42]].map(([bz, by], bi) => (
          <mesh key={bi} position={[isLeft ? -0.25 : 0.25, by * 0.5, bz * 0.5]}>
            <cylinderGeometry args={[0.025, 0.025, 0.04, 6]} />
            <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
          </mesh>
        ))}
      </group>

      {/* Combustion firing light */}
      <pointLight ref={sparkLightRef} position={[isLeft ? -0.5 : 0.5, 0, 0]}
        intensity={0.3} distance={2.5} color="#FFA033" />

      {/* Rocker arm shaft (visible through XRay) */}
      <group ref={rockerRef} position={[isLeft ? -0.65 : 0.65, 0.28, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.46, 8]} />
          <meshPhysicalMaterial {...pm(MAT_STEEL_FORG)} />
        </mesh>
      </group>

      {/* Piston + connecting rod (visible in XRay mode) */}
      <group ref={pistonRef}>
        {/* Piston crown — polished alloy */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.44, 0.44, 0.36, 22]} />
          <meshPhysicalMaterial {...pm(MAT_PISTON)} {...(xrayMode ? {} : {})} />
        </mesh>
        {/* Ring pack */}
        {[-0.09, -0.02, 0.05].map((rx, ri) => (
          <mesh key={ri} position={[rx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.455, 0.455, 0.022, 22]} />
            <meshPhysicalMaterial {...pm(MAT_RING)} />
          </mesh>
        ))}
        {/* Gudgeon / wrist pin */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.064, 0.064, 0.42, 10]} />
          <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
        </mesh>
        {/* H-beam connecting rod */}
        <group ref={rodRef}>
          <mesh position={[isLeft ? 0.44 : -0.44, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.072, 0.94, 10]} />
            <meshPhysicalMaterial {...pm(MAT_STEEL_FORG)} />
          </mesh>
          {/* Big-end cap */}
          <mesh position={[isLeft ? 0.94 : -0.94, 0, 0]}>
            <cylinderGeometry args={[0.135, 0.135, 0.16, 14]} />
            <meshPhysicalMaterial {...pm(MAT_RING)} />
          </mesh>
        </group>
      </group>
    </group>
  );
});

// ─── Cinematic Camera Rig ─────────────────────────────────────────────────────
// Phase 0 (0–2 s): wide establishing pull-in
// Phase 1 (2 s+):  smooth 15°/s auto-orbit (handed off to OrbitControls)
// Phase 2:         On critical, snap-focus to fault component with cubic-bezier lerp
const CameraRig = ({ status, faultComponent, orbitRef }) => {
  const { camera } = useThree();
  const phase     = useRef(0);   // 0=intro, 1=orbit, 2=fault-focus
  const elapsed   = useRef(0);
  const startPos  = useRef(new THREE.Vector3(0, 8, 14));
  const targetPos = useRef(new THREE.Vector3(0, 2.6, 5.8));
  const lookAt    = useRef(new THREE.Vector3(0, 0, 0));

  // Fault component → camera focus offset
  const faultOffset = (() => {
    const lc = (faultComponent || '').toLowerCase();
    if (lc.includes('oil'))      return new THREE.Vector3(1.6, -0.5, 1.1);
    if (lc.includes('exhaust'))  return new THREE.Vector3(0,   -0.3, -1.5);
    if (lc.includes('cylinder')) return new THREE.Vector3(-1.5, 0.2, 0.5);
    if (lc.includes('bearing'))  return new THREE.Vector3(0,    0.0, 0.0);
    return new THREE.Vector3(0, 1.0, 3.8);
  })();

  useEffect(() => {
    camera.position.copy(startPos.current);
  }, []);

  useFrame((state, delta) => {
    elapsed.current += delta;

    if (phase.current === 0) {
      // Intro pull-in over 2.5s with cubic-bezier ease
      const t = Math.min(elapsed.current / 2.5, 1);
      const e = cubicEase(t);
      camera.position.lerpVectors(startPos.current, targetPos.current, e);
      camera.lookAt(lookAt.current);
      if (t >= 1) {
        phase.current = 1;
        if (orbitRef.current) orbitRef.current.enabled = true;
      }
    } else if (phase.current === 1 && (status === 'Warning' || status === 'Critical')) {
      phase.current = 2;
      elapsed.current = 0;
    } else if (phase.current === 2) {
      // Focus on fault component over 1.5s
      const t = Math.min(elapsed.current / 1.5, 1);
      const e = cubicEase(t);
      const focusTarget = new THREE.Vector3().addVectors(
        new THREE.Vector3(0, 2.2, 4.5),
        faultOffset.clone().multiplyScalar(0.8)
      );
      camera.position.lerp(focusTarget, e * delta * 2);
      camera.lookAt(faultOffset);
      // Return to orbit after focus
      if (t >= 1 && (status === 'Healthy')) {
        phase.current = 1;
        elapsed.current = 0;
      }
    }
  });

  return null;
};

// ─── Complete Engine Group ────────────────────────────────────────────────────
const EngineGeometry = ({ xrayMode, carbHovered, setEngineReady }) => {
  const telemetry = useEngineStore((s) => s.telemetry);
  const diagnosis  = useEngineStore((s) => s.diagnosis);

  const groupRef   = useRef();
  const crankRef   = useRef();
  const camRef     = useRef();
  const propRef    = useRef();
  const altRef     = useRef();
  const rimRef     = useRef();
  const exhRef     = useRef();
  const oilRef     = useRef();
  const carbRef    = useRef();

  const p = [useRef(), useRef(), useRef(), useRef()];
  const r = [useRef(), useRef(), useRef(), useRef()];
  const ro = [useRef(), useRef(), useRef(), useRef()];
  const hm = [useRef(), useRef(), useRef(), useRef()];
  const sp = [useRef(), useRef(), useRef(), useRef()];

  const st = useRef({
    crankAngle: 0,
    visualRpm: rpmToSpeed(4800),
    headColors: Array(4).fill(null).map(() => new THREE.Color('#BFC8CE')),
    exhColor:  new THREE.Color('#4A3828'),
    oilColor:  new THREE.Color('#059669'),
    rimColor:  new THREE.Color('#22C55E'),
    carbScale: 1.0,
  });

  useEffect(() => { if (setEngineReady) setEngineReady(true); }, []);

  useFrame((state, delta) => {
    const t   = state.clock.getElapsedTime();
    const s   = st.current;
    const rpm    = telemetry.rpm          ?? 4800;
    const cht    = telemetry.cht          ?? 110;
    const egt    = telemetry.egt          ?? 810;
    const oilP   = telemetry.oil_pressure ?? 380;
    const oilT   = telemetry.oil_temp     ?? 92;
    const vib    = telemetry.vibration    ?? 1.1;
    const status = diagnosis.status       || 'Healthy';

    // ── RPM-driven rotation (cubic-eased) ─────────────────────────────────
    const tgtRpm = status === 'Critical' ? 0.2 : rpmToSpeed(rpm);
    s.visualRpm  = easeRpm(s.visualRpm, tgtRpm, delta);
    s.crankAngle += delta * s.visualRpm;

    const ca = s.crankAngle;
    if (crankRef.current) crankRef.current.rotation.z = ca;
    if (camRef.current)   camRef.current.rotation.z   = ca * 0.5;      // ÷2 cam
    if (propRef.current)  propRef.current.rotation.z  = ca / 2.43;     // ÷2.43 PSRU
    if (altRef.current)   altRef.current.rotation.z   = ca * 1.5;

    // ── Boxer piston reciprocation ────────────────────────────────────────
    const amp = 0.40;
    if (p[0].current) p[0].current.position.x = -Math.sin(ca) * amp;
    if (p[1].current) p[1].current.position.x =  Math.sin(ca) * amp;
    if (p[2].current) p[2].current.position.x = -Math.sin(ca + Math.PI) * amp;
    if (p[3].current) p[3].current.position.x =  Math.sin(ca + Math.PI) * amp;

    const rr = Math.cos(ca) * 0.15;
    [r[0], r[1], r[2], r[3]].forEach((ref, i) => {
      if (ref.current) ref.current.rotation.y = i % 2 === 0 ? rr : -rr;
    });

    const rk = Math.sin(ca * 0.5) * 0.12;
    [ro[0], ro[1], ro[2], ro[3]].forEach((ref, i) => {
      if (ref.current) ref.current.rotation.z = i % 2 === 0 ? rk : -rk;
    });

    // ── Combustion spark flashes ──────────────────────────────────────────
    const fl = (ph) => Math.max(0, Math.sin(ca * 0.5 + ph)) ** 8 * 2.2;
    [sp[0], sp[1], sp[2], sp[3]].forEach((ref, i) => {
      if (ref.current) ref.current.intensity = 0.2 + fl(i * Math.PI * 0.5);
    });

    // ── CHT thermal glow — heads only, barrels stay neutral ──────────────
    const hTgt = thermalTarget(cht, 105, 125, 138);
    const hInt = thermalIntensity(cht, 105, 125, 138) +
      (status === 'Critical' ? (Math.sin(t * 6) + 1) * 0.35 : 0);
    hm.forEach((ref, i) => {
      if (!ref.current) return;
      s.headColors[i] = lerpColor(s.headColors[i], hTgt, delta * 1.8);
      ref.current.emissive.copy(s.headColors[i]);
      ref.current.emissiveIntensity = hInt;
    });

    // ── EGT exhaust glow ──────────────────────────────────────────────────
    const eTgt = thermalTarget(egt, 760, 870, 920);
    const eInt = thermalIntensity(egt, 760, 870, 920) + 0.12;
    if (exhRef.current) {
      s.exhColor = lerpColor(s.exhColor, eTgt, delta * 1.5);
      exhRef.current.emissive.copy(s.exhColor);
      exhRef.current.emissiveIntensity = eInt;
    }

    // ── Oil tank health glow ──────────────────────────────────────────────
    const oOk  = oilP >= 280 && oilT <= 110;
    const oTgt = oOk ? new THREE.Color('#0D8A50')
      : oilP < 200 || oilT > 120 ? new THREE.Color('#CC2200')
      : new THREE.Color('#CC7700');
    if (oilRef.current) {
      s.oilColor = lerpColor(s.oilColor, oTgt, delta * 1.5);
      oilRef.current.emissive.copy(s.oilColor);
      oilRef.current.emissiveIntensity = oOk ? 0.04 : 0.65;
    }

    // ── Carb highlight on hover (cubic-bezier scale pulse) ────────────────
    if (carbRef.current) {
      const targetScale = carbHovered ? 1.12 : 1.0;
      s.carbScale += (targetScale - s.carbScale) * Math.min(delta * 5, 1);
      carbRef.current.scale.setScalar(s.carbScale);
    }

    // ── Vibration jitter (scaled to live reading) ─────────────────────────
    if (groupRef.current) {
      const j = vibrationJitter(t, vib, 0.013);
      groupRef.current.position.x = j.x;
      groupRef.current.position.y = j.y;
    }

    // ── Global status rim light ───────────────────────────────────────────
    if (rimRef.current) {
      s.rimColor = lerpColor(s.rimColor, statusRimColor(status), delta * 1.2);
      rimRef.current.color.copy(s.rimColor);
    }
  });

  // Callout values
  const oilPSI = ((telemetry.oil_pressure ?? 380) * 0.145).toFixed(1);
  const egtV   = Math.round(telemetry.egt      ?? 810);
  const vibV   = (telemetry.vibration           ?? 1.1).toFixed(2);
  const rpmV   = Math.round(telemetry.rpm        ?? 4800);
  const status = diagnosis.status || 'Healthy';
  const fc     = (diagnosis.fault_component || '').toLowerCase();
  const oilSt  = fc.includes('oil') ? status.toLowerCase() : undefined;

  return (
    <group ref={groupRef}>
      {/* ── HDRI studio lighting (fixed top-left 45°) ── */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[-4, 6, 4]}      /* top-left 45° fixed */
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[5, -2, -5]} intensity={0.4} color="#C8E0FF" />
      {/* Rim light — tinted by diagnosis status */}
      <pointLight ref={rimRef} position={[-5, 2, -4]} intensity={1.1} />
      {/* Warm underlight for depth */}
      <pointLight position={[0, -2.5, 3.5]} intensity={0.35} color="#FFD4A0" />

      {/* ── 1. Horizontally-Split Crankcase (cast + brushed alu) ── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.3, 1.5, 2.0]} />
        <meshPhysicalMaterial {...pm(MAT_CAST_ALU)} {...(xrayMode ? { transparent: true, opacity: 0.18, depthWrite: false } : {})} />
      </mesh>
      {/* Case split seam — darker shadow line */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.34, 0.058, 2.04]} />
        <meshPhysicalMaterial color="#8A9BAA" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* M8 hex mounting bolts along case */}
      {[-0.9, -0.3, 0.3, 0.9].map((z, bi) => (
        <mesh key={bi} position={[1.18, 0, z]}>
          <cylinderGeometry args={[0.03, 0.03, 0.05, 6]} />
          <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
        </mesh>
      ))}

      {/* ── 2. Crankshaft (polished turned steel) ── */}
      <group ref={crankRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 2.3, 20]} />
          <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
        </mesh>
        {/* Counterweights */}
        {[[-0.6, 0], [-0.2, 1], [0.2, 0], [0.6, 1]].map(([z, side], i) => (
          <group key={i} position={[0, side ? 0.3 : -0.3, z]}>
            <boxGeometry args={[0.4, 0.55, 0.1]} />
          </group>
        ))}
      </group>

      {/* ── 3. Central Camshaft (½ crank speed, cast steel) ── */}
      <group ref={camRef} position={[0, 0.52, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.064, 0.064, 2.1, 14]} />
          <meshPhysicalMaterial {...pm(MAT_STEEL_FORG)} />
        </mesh>
        {[-0.65, -0.22, 0.22, 0.65].map((z, i) => (
          <mesh key={i} position={[0, 0.06, z]} rotation={[0, 0, i * 1.1]}>
            <cylinderGeometry args={[0.1, 0.07, 0.068, 10]} />
            <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
          </mesh>
        ))}
      </group>

      {/* ── 4. Four Boxer Cylinders ── */}
      {[
        { pos: [-1.45,  0.2,  0.55], rot: [0, 0, 0],         left: true,  pRef: p[0], rRef: r[0], roRef: ro[0], hmRef: hm[0], spRef: sp[0] },
        { pos: [ 1.45,  0.2,  0.55], rot: [0, Math.PI, 0],   left: false, pRef: p[1], rRef: r[1], roRef: ro[1], hmRef: hm[1], spRef: sp[1] },
        { pos: [-1.45, -0.2, -0.55], rot: [0, 0, 0],         left: true,  pRef: p[2], rRef: r[2], roRef: ro[2], hmRef: hm[2], spRef: sp[2] },
        { pos: [ 1.45, -0.2, -0.55], rot: [0, Math.PI, 0],   left: false, pRef: p[3], rRef: r[3], roRef: ro[3], hmRef: hm[3], spRef: sp[3] },
      ].map(({ pos, rot, left, pRef, rRef, roRef, hmRef, spRef }, idx) => (
        <CylinderUnit
          key={idx}
          position={pos} rotation={rot}
          pistonRef={pRef} rodRef={rRef} rockerRef={roRef}
          headMatRef={hmRef} sparkLightRef={spRef}
          isLeft={left}
          xrayMode={xrayMode}
        />
      ))}

      {/* ── 5. Twin Carburettors (brushed alu) — hover-to-focus ── */}
      {[-1, 1].map((side, i) => (
        <group key={i} ref={i === 0 ? carbRef : null}
          position={[side * 1.08, 0.9, 0]}>
          {/* Main carb body */}
          <mesh>
            <boxGeometry args={[0.34, 0.46, 0.40]} />
            <meshPhysicalMaterial {...pm(MAT_BRUSHED_ALU)} />
          </mesh>
          {/* Float bowl (cast alu) */}
          <mesh position={[0, -0.26, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.17, 14]} />
            <meshPhysicalMaterial {...pm(MAT_CAST_ALU, { roughness: 0.42 })} />
          </mesh>
          {/* Float bowl drain bolt */}
          <mesh position={[0, -0.36, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.04, 6]} />
            <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
          </mesh>
          {/* Intake runners (rubber boots) */}
          {[0.46, -0.46].map((z, j) => (
            <mesh key={j} position={[0, -0.14, z]} rotation={[j === 0 ? 0.38 : -0.38, 0, 0]}>
              <cylinderGeometry args={[0.048, 0.048, 0.62, 10]} />
              <meshPhysicalMaterial {...pm(MAT_HOSE_OIL)} />
            </mesh>
          ))}
          {/* Throttle cable bracket */}
          <mesh position={[0, 0.26, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.016, 0.016, 0.22, 8]} />
            <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
          </mesh>
        </group>
      ))}

      {/* ── 6. Dry-Sump External Oil Tank ── */}
      <group position={[1.52, -0.62, 1.0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.84, 18]} />
          <meshPhysicalMaterial
            ref={oilRef}
            {...pm(MAT_BRUSHED_ALU)}
            emissive="#000000"
            emissiveIntensity={0}
          />
        </mesh>
        {/* Level cap (bright yellow alu) */}
        <mesh position={[0, 0.46, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.07, 14]} />
          <meshPhysicalMaterial color="#DDAA00" metalness={0.85} roughness={0.28} />
        </mesh>
        {/* Braided stainless scavenge line */}
        <mesh position={[-0.42, -0.18, -0.3]} rotation={[0, 0.8, -0.4]}>
          <cylinderGeometry args={[0.033, 0.033, 0.78, 10]} />
          <meshPhysicalMaterial {...pm(MAT_BRASS)} />
        </mesh>
        {/* Oil return rubber hose */}
        <mesh position={[-0.3, 0.3, -0.25]} rotation={[0.4, 0.5, 0.3]}>
          <cylinderGeometry args={[0.025, 0.025, 0.45, 8]} />
          <meshPhysicalMaterial {...pm(MAT_HOSE_OIL)} />
        </mesh>
      </group>

      {/* ── 7. Liquid Cooling Radiator (cast core + rubber hoses) ── */}
      <group position={[0, -1.08, 0]}>
        <mesh>
          <boxGeometry args={[1.58, 0.38, 0.8]} />
          <meshPhysicalMaterial {...pm(MAT_BRUSHED_ALU, { roughness: 0.50 })} />
        </mesh>
        {/* Blue silicone inlet hose from head */}
        <mesh position={[-0.84, 0.14, 0]} rotation={[0, 0, 0.55]}>
          <cylinderGeometry args={[0.042, 0.042, 0.58, 10]} />
          <meshPhysicalMaterial {...pm(MAT_HOSE_COOL)} />
        </mesh>
        {/* Blue silicone outlet hose back to head */}
        <mesh position={[0.84, 0.14, 0]} rotation={[0, 0, -0.55]}>
          <cylinderGeometry args={[0.042, 0.042, 0.58, 10]} />
          <meshPhysicalMaterial {...pm(MAT_HOSE_COOL)} />
        </mesh>
      </group>

      {/* ── 8. Exhaust Headers & 4-into-1 Collector ── */}
      <group position={[0, -0.36, -1.4]}>
        {/* Collector pipe (heat-blued dark steel) */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.17, 0.84, 14]} />
          <meshPhysicalMaterial
            ref={exhRef}
            {...pm(MAT_EXHAUST)}
          />
        </mesh>
        {/* Header pipes (both banks) */}
        {[[-0.88, 0.34, 0.12, 0.6], [0.88, 0.34, 0.12, -0.6]].map(([x, y, z, rotZ], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[0.4, 0, rotZ]}>
            <cylinderGeometry args={[0.076, 0.076, 0.94, 10]} />
            <meshPhysicalMaterial color="#4A4A4A" metalness={0.8} roughness={0.45} />
          </mesh>
        ))}
      </group>

      {/* ── 9. Front Reduction Gearbox + Prop Output Shaft (÷2.43) ── */}
      <group position={[0, 0, 1.4]}>
        {/* PSRU housing */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.33, 0.45, 0.54, 16]} />
          <meshPhysicalMaterial {...pm(MAT_BRUSHED_ALU)} />
        </mesh>
        {/* Prop flange + spinner (slow rotation group at ÷2.43) */}
        <group ref={propRef} position={[0, 0, 0.35]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.43, 0.43, 0.09, 18]} />
            <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
          </mesh>
          {/* Safety-orange spinner cone */}
          <mesh position={[0, 0, 0.23]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.23, 0.42, 18]} />
            <meshPhysicalMaterial {...pm(MAT_SPINNER)} />
          </mesh>
          {/* 6 drive flange bolts */}
          {[0,1,2,3,4,5].map((bi) => {
            const a = (bi * Math.PI) / 3;
            return (
              <mesh key={bi} position={[Math.cos(a)*0.32, Math.sin(a)*0.32, 0.06]}>
                <cylinderGeometry args={[0.023, 0.023, 0.04, 6]} />
                <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
              </mesh>
            );
          })}
        </group>
      </group>

      {/* ── 10. Rear Alternator / Generator ── */}
      <group position={[0, 0.1, -1.3]} ref={altRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.29, 0.29, 0.33, 14]} />
          <meshPhysicalMaterial {...pm(MAT_BRUSHED_ALU, { roughness: 0.48 })} />
        </mesh>
        {/* Pulley */}
        <mesh position={[0, 0.33, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.06, 12]} />
          <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
        </mesh>
        {/* Mounting bracket bolts */}
        {[-0.18, 0.18].map((z, bi) => (
          <mesh key={bi} position={[0.32, 0, z]}>
            <cylinderGeometry args={[0.024, 0.024, 0.04, 6]} />
            <meshPhysicalMaterial {...pm(MAT_STEEL_POL)} />
          </mesh>
        ))}
      </group>

      {/* ── 11. Live Parameter Callouts ── */}
      <PartCallout position={[-2.35, 0.45, 0.9]}
        label="VIBRATION" value={vibV} unit="g RMS"
        rawValue={telemetry.vibration} warnHigh={2.0} critHigh={3.0} />
      <PartCallout position={[1.95, -0.65, 1.3]}
        label="OIL PRESSURE" value={oilPSI} unit="PSI"
        rawValue={telemetry.oil_pressure} warnLow={280} critLow={200}
        overrideStatus={oilSt} />
      <PartCallout position={[0.3, 0.7, -2.0]}
        label="EGT" value={`${egtV}`} unit="°C"
        rawValue={telemetry.egt} warnHigh={870} critHigh={910} />
      <PartCallout position={[2.15, 0.5, -0.55]}
        label="ENGINE SPEED" value={`${rpmV}`} unit="RPM"
        rawValue={telemetry.rpm} warnHigh={5200} critHigh={5600} />
    </group>
  );
};

// ─── Canvas Wrapper ────────────────────────────────────────────────────────────
const EngineModel3D = () => {
  const diagnosis  = useEngineStore((s) => s.diagnosis);
  const status     = diagnosis.status || 'Healthy';
  const [carbHovered, setCarbHovered] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [showCTA, setShowCTA]         = useState(false);
  const orbitRef   = useRef();

  // Show CTA after 12 s (one full slow orbit)
  useEffect(() => {
    const t = setTimeout(() => setShowCTA(true), 12000);
    return () => clearTimeout(t);
  }, []);

  // X-ray mode on Warning/Critical
  const xrayMode = status === 'Warning' || status === 'Critical';

  return (
    <div
      className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0F1A22 0%, #1A2A36 55%, #0D1820 100%)' }}
    >
      {/* ── Teal-orange cinematic grade overlay ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        background: 'linear-gradient(135deg, rgba(0,180,180,0.055) 0%, transparent 50%, rgba(255,110,30,0.055) 100%)',
        mixBlendMode: 'overlay',
      }} />

      {/* ── Subtle film grain via SVG noise ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, opacity: 0.038,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '180px 180px',
      }} />

      {/* ── XRay mode banner ── */}
      {xrayMode && (
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, pointerEvents: 'none',
          background: status === 'Critical' ? 'rgba(180,20,20,0.85)' : 'rgba(160,100,0,0.85)',
          color: '#FFF', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
          padding: '3px 12px', borderRadius: 99,
          backdropFilter: 'blur(6px)',
          animation: 'pulse 1.8s infinite',
        }}>
          {status === 'Critical' ? '⚠ CRITICAL — X-RAY MODE ACTIVE' : '⚡ WARNING — X-RAY MODE ACTIVE'}
        </div>
      )}

      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <AdaptiveDpr pixelated />
        <PerspectiveCamera makeDefault position={[0, 8, 14]} fov={42} near={0.5} far={60} />

        {/* HDRI studio environment — no background, just lighting */}
        <Environment preset="studio" background={false} />

        <EngineGeometry
          xrayMode={xrayMode}
          carbHovered={carbHovered}
          setEngineReady={setEngineReady}
        />

        {/* Soft contact shadow under engine */}
        <ContactShadows
          position={[0, -1.5, 0]}
          opacity={0.45}
          scale={8}
          blur={2.4}
          far={2}
          color="#000820"
        />

        {/* Cinematic camera rig */}
        <CameraRig
          status={status}
          faultComponent={diagnosis.fault_component}
          orbitRef={orbitRef}
        />

        <OrbitControls
          ref={orbitRef}
          enabled={false}          /* enabled=true once intro phase completes */
          autoRotate
          autoRotateSpeed={1.0}    /* ~15°/s at 60fps */
          enableZoom
          minDistance={3.5}
          maxDistance={12}
          maxPolarAngle={Math.PI / 1.65}
          dampingFactor={0.06}
          enableDamping
        />
      </Canvas>

      {/* ── Bottom status badge ── */}
      <div style={{
        position: 'absolute', bottom: 12, left: 14, zIndex: 10, pointerEvents: 'none',
        background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.2)', color: '#E2E8F0',
        fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
        padding: '4px 12px', borderRadius: 99,
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: status === 'Critical' ? '#EF4444' : status === 'Warning' ? '#F59E0B' : '#22C55E',
          boxShadow: `0 0 6px 2px ${status === 'Critical' ? '#EF4444' : status === 'Warning' ? '#F59E0B' : '#22C55E'}88`,
          animation: 'pulse 2s infinite',
          flexShrink: 0,
        }} />
        3D DIGITAL TWIN · Drag to Orbit · Scroll to Zoom
      </div>

      {/* ── Carb hover hotspot ── */}
      <div
        style={{
          position: 'absolute', top: '38%', left: '30%',
          width: 52, height: 52, cursor: 'pointer', zIndex: 8,
          borderRadius: '50%',
          border: carbHovered ? '2px solid rgba(255,107,53,0.8)' : '2px solid transparent',
          background: carbHovered ? 'rgba(255,107,53,0.12)' : 'transparent',
          transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
        onMouseEnter={() => setCarbHovered(true)}
        onMouseLeave={() => setCarbHovered(false)}
        title="Hover: Carburetor focus"
      />

      {/* ── CTA end-frame fade-in ── */}
      {showCTA && (
        <div style={{
          position: 'absolute', bottom: 16, right: 16, zIndex: 10,
          opacity: 0, animation: 'fadeInCTA 1.2s cubic-bezier(0.4,0,0.2,1) forwards',
          background: 'rgba(255,107,53,0.18)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,107,53,0.45)', color: '#FF9060',
          fontSize: 12, fontWeight: 700, padding: '7px 18px', borderRadius: 99,
          cursor: 'pointer', letterSpacing: '0.06em',
        }}>
          Explore Specs →
        </div>
      )}

      <style>{`
        @keyframes fadeInCTA { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.55} }
      `}</style>
    </div>
  );
};

export default EngineModel3D;
