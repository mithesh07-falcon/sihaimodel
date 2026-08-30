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

// ─── Colours — realistic cast-aluminium / machined-steel engine palette ──────
const C = {
  crankcase: '#C0C8D0',   // cast aluminium crankcase  – warm silver-grey
  barrel:    '#B8C0C8',   // air-cooled barrel         – slightly cooler silver
  fin:       '#A8B4BC',   // cooling fins              – slightly darker silver
  head:      '#D0D8E0',   // cylinder head casting     – bright machined aluminium
  piston:    '#E8ECF0',   // piston crown              – polished alloy
  rod:       '#C4CDD5',   // connecting rod            – forged steel silver
  ring:      '#8A9BAA',   // piston rings / rod cap    – harder steel, darker
  crank:     '#D4DCE4',   // crankshaft                – bright turned steel
  carb:      '#B0B8C0',   // carburetor body           – cast aluminium
  exhaust:   '#7A4828',   // exhaust manifold          – dark heat-stained steel
  oil:       '#8A9BAA',   // oil tank                  – anodised aluminium
  oilLine:   '#C8A060',   // oil scavenge line         – brass/copper fitting
  fuel:      '#4A90C4',   // coolant hose / fuel rail  – blue silicone
  gearbox:   '#B4BCC4',   // reduction gearbox         – cast aluminium
  spinner:   '#FF6B35',   // prop spinner              – safety orange (brand accent)
  alt:       '#9AA8B4',   // alternator housing        – anodised dark aluminium
};

// ─── Single Cylinder Assembly (1 cylinder unit, air-cooled barrel + liquid head) ──
const CylinderUnit = React.memo(({
  position, rotation,
  pistonRef, rodRef, rockerRef, headMatRef, sparkLightRef,
  isLeft,
}) => (
  <group position={position} rotation={rotation}>
    {/* Barrel outer solid cylinder */}
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.52, 0.52, 1.4, 20]} />
      <meshStandardMaterial color={C.barrel} metalness={0.75} roughness={0.3} />
    </mesh>

    {/* Cooling fins (6 rings) */}
    {[-0.45, -0.28, -0.11, 0.06, 0.23, 0.40].map((x, i) => (
      <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.64, 0.64, 0.04, 20]} />
        <meshStandardMaterial color={C.fin} metalness={0.8} roughness={0.3} />
      </mesh>
    ))}

    {/* Bore hollow indicator (dark inner bore face – slightly shadowed silver) */}
    <mesh rotation={[0, 0, Math.PI / 2]}
      position={[isLeft ? -0.7 : 0.7, 0, 0]}>
      <cylinderGeometry args={[0.46, 0.46, 0.02, 20]} />
      <meshStandardMaterial color="#7A8A96" metalness={0.85} roughness={0.25} />
    </mesh>

    {/* ── Liquid-Cooled Cylinder Head ── */}
    <group position={[isLeft ? -0.88 : 0.88, 0, 0]}>
      {/* Head casting - THIS is the thermal glow target */}
      <mesh>
        <boxGeometry args={[0.44, 1.12, 1.12]} />
        <meshStandardMaterial
          ref={headMatRef}
          color={C.head}
          metalness={0.7}
          roughness={0.3}
          emissive="#000000"
          emissiveIntensity={0}
        />
      </mesh>

      {/* Rocker cover – bright machined aluminium */}
      <mesh position={[isLeft ? -0.25 : 0.25, 0.1, 0]}>
        <boxGeometry args={[0.1, 0.82, 0.82]} />
        <meshStandardMaterial color="#C8D4DC" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Spark plug 1 */}
      <mesh position={[0, 0.58, -0.22]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.18, 8]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Spark plug lead 1 (red) */}
      <mesh position={[-0.04, 0.73, -0.3]} rotation={[0.6, 0, 0.1]}>
        <cylinderGeometry args={[0.018, 0.018, 0.18, 6]} />
        <meshStandardMaterial color="#EF4444" roughness={0.4} />
      </mesh>

      {/* Spark plug 2 */}
      <mesh position={[0, 0.58, 0.22]} rotation={[-0.3, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.18, 8]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Spark plug lead 2 (blue) */}
      <mesh position={[-0.04, 0.73, 0.3]} rotation={[-0.6, 0, 0.1]}>
        <cylinderGeometry args={[0.018, 0.018, 0.18, 6]} />
        <meshStandardMaterial color="#3B82F6" roughness={0.4} />
      </mesh>

      {/* Coolant outlet fitting */}
      <mesh position={[0, -0.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.12, 10]} />
        <meshStandardMaterial color={C.fuel} metalness={0.8} roughness={0.2} />
      </mesh>
    </group>

    {/* Combustion flash point-light */}
    <pointLight
      ref={sparkLightRef}
      position={[isLeft ? -0.5 : 0.5, 0, 0]}
      intensity={0.3}
      distance={2.5}
      color="#FFA033"
    />

    {/* Rocker arm (pivots with cam) */}
    <group ref={rockerRef} position={[isLeft ? -0.62 : 0.62, 0.3, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.44, 8]} />
        <meshStandardMaterial color={C.rod} metalness={0.85} roughness={0.2} />
      </mesh>
    </group>

    {/* Piston + connecting rod */}
    <group ref={pistonRef}>
      {/* Piston crown */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.44, 0.44, 0.36, 20]} />
        <meshStandardMaterial color={C.piston} metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Piston rings */}
      {[-0.09, -0.02, 0.05].map((rx, ri) => (
        <mesh key={ri} position={[rx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.455, 0.455, 0.022, 20]} />
          <meshStandardMaterial color={C.ring} metalness={0.95} roughness={0.1} />
        </mesh>
      ))}
      {/* Wrist pin */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.42, 10]} />
        <meshStandardMaterial color={C.crank} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* H-beam connecting rod */}
      <group ref={rodRef}>
        <mesh position={[isLeft ? 0.44 : -0.44, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.07, 0.92, 10]} />
          <meshStandardMaterial color={C.rod} metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Big-end cap */}
        <mesh position={[isLeft ? 0.93 : -0.93, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.15, 14]} />
          <meshStandardMaterial color={C.ring} metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  </group>
));

// ─── Complete Animated Engine Group ──────────────────────────────────────────
const EngineGeometry = () => {
  const telemetry = useEngineStore((s) => s.telemetry);
  const diagnosis  = useEngineStore((s) => s.diagnosis);

  const groupRef    = useRef();
  const crankRef    = useRef();
  const camRef      = useRef();
  const propRef     = useRef();
  const altRef      = useRef();
  const rimRef      = useRef();

  const p1 = useRef(); const p2 = useRef(); const p3 = useRef(); const p4 = useRef();
  const r1 = useRef(); const r2 = useRef(); const r3 = useRef(); const r4 = useRef();
  const ro1 = useRef(); const ro2 = useRef(); const ro3 = useRef(); const ro4 = useRef();

  const hm1 = useRef(); const hm2 = useRef(); const hm3 = useRef(); const hm4 = useRef();
  const sp1 = useRef(); const sp2 = useRef(); const sp3 = useRef(); const sp4 = useRef();

  const exhRef  = useRef();
  const oilRef  = useRef();

  const st = useRef({
    crankAngle: 0,
    visualRpm:  rpmToSpeed(4800),
    headColors: [
      new THREE.Color('#64748B'), new THREE.Color('#64748B'),
      new THREE.Color('#64748B'), new THREE.Color('#64748B'),
    ],
    exhColor:  new THREE.Color('#78350F'),
    oilColor:  new THREE.Color('#059669'),
    rimColor:  new THREE.Color('#22C55E'),
  });

  useFrame((state, delta) => {
    const t   = state.clock.getElapsedTime();
    const s   = st.current;
    const rpm = telemetry.rpm     ?? 4800;
    const cht = telemetry.cht     ?? 110;
    const egt = telemetry.egt     ?? 810;
    const oilP = telemetry.oil_pressure ?? 380;
    const oilT = telemetry.oil_temp     ?? 92;
    const vib  = telemetry.vibration    ?? 1.1;
    const status = diagnosis.status || 'Healthy';

    // ── Rotation speeds ──────────────────────────────────────────────────────
    const target = status === 'Critical' ? 0.2 : rpmToSpeed(rpm);
    s.visualRpm  = easeRpm(s.visualRpm, target, delta);
    s.crankAngle += delta * s.visualRpm;

    const ca = s.crankAngle;
    if (crankRef.current) crankRef.current.rotation.z = ca;
    if (camRef.current)   camRef.current.rotation.z   = ca * 0.5;
    if (propRef.current)  propRef.current.rotation.z  = ca / 2.43;
    if (altRef.current)   altRef.current.rotation.z   = ca * 1.5;

    // ── Boxer piston reciprocation ───────────────────────────────────────────
    const amp = 0.40;
    if (p1.current) p1.current.position.x = -Math.sin(ca) * amp;
    if (p2.current) p2.current.position.x =  Math.sin(ca) * amp;
    if (p3.current) p3.current.position.x = -Math.sin(ca + Math.PI) * amp;
    if (p4.current) p4.current.position.x =  Math.sin(ca + Math.PI) * amp;

    // Rod rock
    const rr = Math.cos(ca) * 0.15;
    if (r1.current) r1.current.rotation.y =  rr;
    if (r2.current) r2.current.rotation.y = -rr;
    if (r3.current) r3.current.rotation.y = -rr;
    if (r4.current) r4.current.rotation.y =  rr;

    // Rocker rock (camshaft-driven, half crank speed)
    const rk = Math.sin(ca * 0.5) * 0.12;
    if (ro1.current) ro1.current.rotation.z =  rk;
    if (ro2.current) ro2.current.rotation.z = -rk;
    if (ro3.current) ro3.current.rotation.z = -rk;
    if (ro4.current) ro4.current.rotation.z =  rk;

    // ── Combustion spark flashes ─────────────────────────────────────────────
    const fl = (phase) => Math.max(0, Math.sin(ca * 0.5 + phase)) ** 8 * 2.0;
    if (sp1.current) sp1.current.intensity = 0.2 + fl(0);
    if (sp2.current) sp2.current.intensity = 0.2 + fl(Math.PI * 0.5);
    if (sp3.current) sp3.current.intensity = 0.2 + fl(Math.PI);
    if (sp4.current) sp4.current.intensity = 0.2 + fl(Math.PI * 1.5);

    // ── Thermal glow – heads (CHT) ───────────────────────────────────────────
    const hTgt = thermalTarget(cht, 105, 125, 138);
    const hInt = thermalIntensity(cht, 105, 125, 138) +
      (status === 'Critical' ? (Math.sin(t * 6) + 1) * 0.3 : 0);

    [hm1, hm2, hm3, hm4].forEach((ref, i) => {
      if (!ref.current) return;
      s.headColors[i] = lerpColor(s.headColors[i], hTgt, delta * 1.8);
      ref.current.emissive.copy(s.headColors[i]);
      ref.current.emissiveIntensity = hInt;
    });

    // ── Thermal glow – exhaust (EGT) ─────────────────────────────────────────
    const eTgt = thermalTarget(egt, 760, 870, 920);
    const eInt = thermalIntensity(egt, 760, 870, 920) + 0.1;
    if (exhRef.current) {
      s.exhColor = lerpColor(s.exhColor, eTgt, delta * 1.5);
      exhRef.current.emissive.copy(s.exhColor);
      exhRef.current.emissiveIntensity = eInt;
    }

    // ── Oil tank health glow ─────────────────────────────────────────────────
    const oOk  = oilP >= 280 && oilT <= 110;
    const oTgt = oOk ? new THREE.Color('#10B981')
      : oilP < 200 || oilT > 120 ? new THREE.Color('#EF4444')
      : new THREE.Color('#F59E0B');
    if (oilRef.current) {
      s.oilColor = lerpColor(s.oilColor, oTgt, delta * 1.5);
      oilRef.current.emissive.copy(s.oilColor);
      oilRef.current.emissiveIntensity = oOk ? 0.05 : 0.6;
    }

    // ── Vibration jitter ─────────────────────────────────────────────────────
    if (groupRef.current) {
      const j = vibrationJitter(t, vib, 0.014);
      groupRef.current.position.x = j.x;
      groupRef.current.position.y = j.y;
    }

    // ── Rim light colour ──────────────────────────────────────────────────────
    if (rimRef.current) {
      s.rimColor = lerpColor(s.rimColor, statusRimColor(status), delta * 1.2);
      rimRef.current.color.copy(s.rimColor);
    }
  });

  // Callout display values
  const oilPSI = ((telemetry.oil_pressure ?? 380) * 0.145).toFixed(1);
  const egtV   = Math.round(telemetry.egt      ?? 810);
  const vibV   = (telemetry.vibration           ?? 1.1).toFixed(2);
  const rpmV   = Math.round(telemetry.rpm        ?? 4800);
  const faultC = (diagnosis.fault_component || '').toLowerCase();
  const oilSt  = faultC.includes('oil') ? diagnosis.status?.toLowerCase() : undefined;

  return (
    <group ref={groupRef}>
      {/* ── Lights ── */}
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 8, 6]}  intensity={1.4} castShadow />
      <directionalLight position={[-5, -4, -4]} intensity={0.55} color="#CBD5E1" />
      <pointLight ref={rimRef} position={[-5, 3, -5]} intensity={0.9} />
      <pointLight position={[0, -3, 4]} intensity={0.5} color="#fff" />

      {/* ── 1. Crankcase (split horizontal case) ── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.3, 1.5, 2.0]} />
        <meshStandardMaterial color={C.crankcase} metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Case split seam – slightly darker silver gasket line */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.34, 0.06, 2.04]} />
        <meshStandardMaterial color="#9AAAB4" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* ── 2. Crankshaft ── */}
      <group ref={crankRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 2.3, 18]} />
          <meshStandardMaterial color={C.crank} metalness={0.95} roughness={0.08} />
        </mesh>
        {/* Counterweights */}
        {[-0.6, -0.2, 0.2, 0.6].map((z, i) => (
          <mesh key={i} position={[0, 0, z]}>
            <mesh position={[0, i % 2 === 0 ? 0.3 : -0.3, 0]}>
              <boxGeometry args={[0.4, 0.55, 0.1]} />
              <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.15} />
            </mesh>
          </mesh>
        ))}
      </group>

      {/* ── 3. Central Camshaft (0.5× crank speed) ── */}
      <group ref={camRef} position={[0, 0.52, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.065, 0.065, 2.1, 14]} />
          <meshStandardMaterial color={C.rod} metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Cam lobes */}
        {[-0.65, -0.22, 0.22, 0.65].map((z, i) => (
          <mesh key={i} position={[0, 0.06, z]} rotation={[0, 0, i * 1.1]}>
            <cylinderGeometry args={[0.1, 0.07, 0.07, 10]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.1} />
          </mesh>
        ))}
      </group>

      {/* ── 4. Four Horizontally-Opposed Boxer Cylinders ── */}
      {/* Left front */}
      <CylinderUnit position={[-1.45, 0.2, 0.55]} rotation={[0,0,0]}
        pistonRef={p1} rodRef={r1} rockerRef={ro1}
        headMatRef={hm1} sparkLightRef={sp1} isLeft={true} />

      {/* Right front */}
      <CylinderUnit position={[1.45, 0.2, 0.55]} rotation={[0, Math.PI, 0]}
        pistonRef={p2} rodRef={r2} rockerRef={ro2}
        headMatRef={hm2} sparkLightRef={sp2} isLeft={false} />

      {/* Left rear */}
      <CylinderUnit position={[-1.45, -0.2, -0.55]} rotation={[0,0,0]}
        pistonRef={p3} rodRef={r3} rockerRef={ro3}
        headMatRef={hm3} sparkLightRef={sp3} isLeft={true} />

      {/* Right rear */}
      <CylinderUnit position={[1.45, -0.2, -0.55]} rotation={[0, Math.PI, 0]}
        pistonRef={p4} rodRef={r4} rockerRef={ro4}
        headMatRef={hm4} sparkLightRef={sp4} isLeft={false} />

      {/* ── 5. Twin Carburetors (one per bank) ── */}
      {[-1, 1].map((side, i) => (
        <group key={i} position={[side * 1.1, 0.88, 0]}>
          {/* Carb body */}
          <mesh>
            <boxGeometry args={[0.34, 0.44, 0.38]} />
            <meshStandardMaterial color={C.carb} metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Float bowl */}
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.16, 14]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.85} roughness={0.2} />
          </mesh>
          {/* Intake runners */}
          {[0.45, -0.45].map((z, j) => (
            <mesh key={j} position={[0, -0.15, z]} rotation={[j === 0 ? 0.4 : -0.4, 0, 0]}>
              <cylinderGeometry args={[0.048, 0.048, 0.62, 10]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ── 6. Dry-Sump External Oil Tank ── */}
      <group position={[1.5, -0.62, 0.98]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.27, 0.27, 0.82, 18]} />
          <meshStandardMaterial
            ref={oilRef}
            color={C.oil}
            metalness={0.75}
            roughness={0.3}
            emissive="#000000"
            emissiveIntensity={0}
          />
        </mesh>
        {/* Dipstick cap */}
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.07, 14]} />
          <meshStandardMaterial color="#F59E0B" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Scavenge line */}
        <mesh position={[-0.4, -0.18, -0.28]} rotation={[0, 0.8, -0.4]}>
          <cylinderGeometry args={[0.032, 0.032, 0.75, 10]} />
          <meshStandardMaterial color={C.oilLine} metalness={0.85} roughness={0.3} />
        </mesh>
      </group>

      {/* ── 7. Coolant Radiator ── */}
      <group position={[0, -1.08, 0]}>
        <mesh>
          <boxGeometry args={[1.55, 0.36, 0.78]} />
          <meshStandardMaterial color="#8A9BAA" metalness={0.85} roughness={0.35} />
        </mesh>
        {/* Coolant hose */}
        <mesh position={[-0.82, 0.12, 0]} rotation={[0, 0, 0.55]}>
          <cylinderGeometry args={[0.04, 0.04, 0.55, 10]} />
          <meshStandardMaterial color={C.fuel} roughness={0.4} />
        </mesh>
      </group>

      {/* ── 8. Exhaust Headers & Collector ── */}
      <group position={[0, -0.35, -1.38]}>
        {/* Collector */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.17, 0.82, 14]} />
          <meshStandardMaterial
            ref={exhRef}
            color={C.exhaust}
            metalness={0.7}
            roughness={0.35}
            emissive="#000000"
            emissiveIntensity={0}
          />
        </mesh>
        {/* Header pipes */}
        {[[-0.85, 0.35, 0.12], [0.85, 0.35, 0.12]].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[0.4, 0, i === 0 ? 0.6 : -0.6]}>
            <cylinderGeometry args={[0.075, 0.075, 0.92, 10]} />
            <meshStandardMaterial color="#475569" metalness={0.75} roughness={0.35} />
          </mesh>
        ))}
      </group>

      {/* ── 9. Front Reduction Gearbox + Prop Shaft (÷ 2.43) ── */}
      <group position={[0, 0, 1.38]}>
        {/* Housing */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.44, 0.52, 16]} />
          <meshStandardMaterial color={C.gearbox} metalness={0.82} roughness={0.22} />
        </mesh>
        {/* Prop flange + spinner (slower rotation group) */}
        <group ref={propRef} position={[0, 0, 0.34]}>
          {/* Flange disc */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.08, 18]} />
            <meshStandardMaterial color={C.crank} metalness={0.95} roughness={0.1} />
          </mesh>
          {/* Spinner cone */}
          <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.22, 0.40, 18]} />
            <meshStandardMaterial color={C.spinner} metalness={0.85} roughness={0.2} />
          </mesh>
          {/* Flange bolts */}
          {[0,1,2,3,4,5].map((bi) => {
            const a = (bi * Math.PI) / 3;
            return (
              <mesh key={bi} position={[Math.cos(a)*0.31, Math.sin(a)*0.31, 0.05]}>
                <cylinderGeometry args={[0.022, 0.022, 0.04, 6]} />
                <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.1} />
              </mesh>
            );
          })}
        </group>
      </group>

      {/* ── 10. Rear Alternator / Generator ── */}
      <group position={[0, 0.1, -1.28]} ref={altRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.32, 14]} />
          <meshStandardMaterial color={C.alt} metalness={0.88} roughness={0.22} />
        </mesh>
        {/* Belt pulley */}
        <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.06, 12]} />
          <meshStandardMaterial color={C.ring} metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* ── 11. Live 3D Callouts ── */}
      <PartCallout
        position={[-2.3, 0.45, 0.85]}
        label="VIBRATION" value={vibV} unit="g RMS"
        rawValue={telemetry.vibration} warnHigh={2.0} critHigh={3.0} />
      <PartCallout
        position={[1.9, -0.65, 1.25]}
        label="OIL PRESSURE" value={oilPSI} unit="PSI"
        rawValue={telemetry.oil_pressure} warnLow={280} critLow={200}
        overrideStatus={oilSt} />
      <PartCallout
        position={[0.3, 0.65, -1.95]}
        label="EGT" value={`${egtV}`} unit="°C"
        rawValue={telemetry.egt} warnHigh={870} critHigh={910} />
      <PartCallout
        position={[2.1, 0.45, -0.5]}
        label="ENGINE SPEED" value={`${rpmV}`} unit="RPM"
        rawValue={telemetry.rpm} warnHigh={5200} critHigh={5600} />
    </group>
  );
};

// ─── Canvas Wrapper ────────────────────────────────────────────────────────────
const EngineModel3D = () => (
  <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden bg-gradient-to-b from-slate-50 to-orange-50">
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        powerPreference: 'high-performance',
      }}
    >
      <PerspectiveCamera makeDefault position={[0, 2.6, 5.8]} fov={42} />
      <EngineGeometry />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.4}
        enableZoom
        minDistance={3.5}
        maxDistance={11}
        maxPolarAngle={Math.PI / 1.65}
        dampingFactor={0.06}
      />
    </Canvas>

    {/* Status badge */}
    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm border border-gray-200 text-[10px] text-gray-600 font-semibold px-2.5 py-1 rounded-lg shadow-sm pointer-events-none select-none flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
      3D DIGITAL TWIN · Drag to Orbit · Scroll to Zoom
    </div>
  </div>
);

export default EngineModel3D;
