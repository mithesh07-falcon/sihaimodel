import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useEngineStore } from '../store/useEngineStore';
import * as THREE from 'three';

// Engine Internal Components that animate inside the Canvas
const EngineGeometry = () => {
  const telemetry = useEngineStore((state) => state.telemetry);
  const diagnosis = useEngineStore((state) => state.diagnosis);
  const selectedPart = useEngineStore((state) => state.selectedPart);
  const setSelectedPart = useEngineStore((state) => state.setSelectedPart);
  
  const [hovered, setHovered] = useState(null);

  // References for animations
  const crankshaftRef = useRef();
  const piston1Ref = useRef();
  const piston2Ref = useRef();
  const piston3Ref = useRef();
  const piston4Ref = useRef();
  const connRod1Ref = useRef();
  const connRod2Ref = useRef();
  const connRod3Ref = useRef();
  const connRod4Ref = useRef();

  // Animation Loop based on RPM
  useFrame((state) => {
    const rpm = telemetry.rpm || 1000;
    // Scale animation speed to RPM
    const t = state.clock.getElapsedTime() * (rpm / 60) * 0.4;
    
    // Rotate Crankshaft
    if (crankshaftRef.current) {
      crankshaftRef.current.rotation.z = t;
    }

    // Pistons motion: opposed cylinder movements (pistons 1 & 4 sync, 2 & 3 sync)
    const stroke = 0.5; // piston travel limit
    const p1 = Math.sin(t) * stroke;
    const p2 = Math.sin(t + Math.PI) * stroke;

    if (piston1Ref.current) piston1Ref.current.position.x = -1.8 - p1;
    if (piston2Ref.current) piston2Ref.current.position.x = 1.8 + p1;
    if (piston3Ref.current) piston3Ref.current.position.x = -1.8 - p2;
    if (piston4Ref.current) piston4Ref.current.position.x = 1.8 + p2;

    // Connect rods angle oscillation
    const rodAng = Math.cos(t) * 0.2;
    if (connRod1Ref.current) connRod1Ref.current.rotation.z = rodAng;
    if (connRod2Ref.current) connRod2Ref.current.rotation.z = -rodAng;
    if (connRod3Ref.current) connRod3Ref.current.rotation.z = -rodAng;
    if (connRod4Ref.current) connRod4Ref.current.rotation.z = rodAng;
  });

  // Highlight/Glow helper based on diagnosis component flags
  const getMaterialProperties = (partName, defaultColor = '#475569') => {
    const isSelected = selectedPart === partName;
    const isHovered = hovered === partName;
    
    // Check if diagnosis says this part is failing
    const faultComp = (diagnosis.fault_component || '').toLowerCase();
    const status = diagnosis.status;
    let isFailing = false;

    if (partName === 'cylinders' && (faultComp.includes('cylinder') || faultComp.includes('combustion') || faultComp.includes('overheating'))) {
      isFailing = true;
    } else if (partName === 'oil_system' && (faultComp.includes('oil') || faultComp.includes('sump') || faultComp.includes('pump'))) {
      isFailing = true;
    } else if (partName === 'crankshaft' && (faultComp.includes('crank') || faultComp.includes('bearing') || faultComp.includes('journal'))) {
      isFailing = true;
    } else if (partName === 'fuel_system' && (faultComp.includes('fuel') || faultComp.includes('injector') || faultComp.includes('injection') || faultComp.includes('efi'))) {
      isFailing = true;
    }

    // Determine color
    let baseColor = defaultColor;
    if (isFailing) {
      baseColor = status === 'Critical' ? '#ef4444' : '#f59e0b';
    } else if (isSelected) {
      baseColor = '#06b6d4'; // Cyan selected
    } else if (isHovered) {
      baseColor = '#0891b2'; // Cyan dark hover
    }

    return {
      color: baseColor,
      roughness: 0.3,
      metalness: 0.8,
      emissive: isFailing ? (status === 'Critical' ? '#ff0000' : '#ffaa00') : isSelected ? '#003344' : '#000000',
      emissiveIntensity: isFailing ? (Math.sin(Date.now() * 0.008) * 0.4 + 0.6) : isSelected ? 0.3 : 0.0
    };
  };

  return (
    <group position={[0, 0, 0]}>
      {/* Lights inside R3F */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
      <directionalLight position={[-10, 8, -5]} intensity={0.6} />

      {/* ================= 1. CENTRAL CRANKCASE ================= */}
      <mesh
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); setSelectedPart('crankshaft'); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered('crankshaft'); }}
        onPointerOut={() => setHovered(null)}
      >
        <boxGeometry args={[2.2, 1.8, 1.8]} />
        <meshStandardMaterial {...getMaterialProperties('crankshaft', '#334155')} />
      </mesh>

      {/* ================= 2. CRANKSHAFT (Inner shaft) ================= */}
      <group ref={crankshaftRef} rotation={[0, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.22, 0.22, 2.0, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Crank webs */}
        <mesh position={[0, 0, -0.6]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.5, 0.8, 0.15]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.6]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.5, 0.8, 0.15]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} />
        </mesh>
      </group>

      {/* ================= 3. FOUR CYLINDERS & PISTONS ================= */}
      
      {/* CYLINDER 1 (Top Left, position X < 0) */}
      <group position={[-1.7, 0.5, 0.5]}>
        {/* Outer Cylinder Sleeve */}
        <mesh 
          rotation={[0, 0, Math.PI / 2]}
          onClick={(e) => { e.stopPropagation(); setSelectedPart('cylinders'); }}
          onPointerOver={(e) => { e.stopPropagation(); setHovered('cylinders'); }}
          onPointerOut={() => setHovered(null)}
        >
          <cylinderGeometry args={[0.52, 0.52, 1.6, 16]} />
          <meshStandardMaterial {...getMaterialProperties('cylinders', '#1e293b')} opacity={0.65} transparent />
        </mesh>
        
        {/* Piston 1 */}
        <group ref={piston1Ref}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.45, 0.45, 0.4, 16]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Rod */}
          <group ref={connRod1Ref}>
            <mesh position={[0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.07, 1.2, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
          </group>
        </group>
      </group>

      {/* CYLINDER 2 (Top Right, position X > 0) */}
      <group position={[1.7, 0.5, -0.5]}>
        <mesh 
          rotation={[0, 0, -Math.PI / 2]}
          onClick={(e) => { e.stopPropagation(); setSelectedPart('cylinders'); }}
          onPointerOver={(e) => { e.stopPropagation(); setHovered('cylinders'); }}
          onPointerOut={() => setHovered(null)}
        >
          <cylinderGeometry args={[0.52, 0.52, 1.6, 16]} />
          <meshStandardMaterial {...getMaterialProperties('cylinders', '#1e293b')} opacity={0.65} transparent />
        </mesh>

        <group ref={piston2Ref}>
          <mesh rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.45, 0.45, 0.4, 16]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
          <group ref={connRod2Ref}>
            <mesh position={[-0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.07, 1.2, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
          </group>
        </group>
      </group>

      {/* CYLINDER 3 (Bottom Left, position X < 0) */}
      <group position={[-1.7, -0.5, -0.5]}>
        <mesh 
          rotation={[0, 0, Math.PI / 2]}
          onClick={(e) => { e.stopPropagation(); setSelectedPart('cylinders'); }}
          onPointerOver={(e) => { e.stopPropagation(); setHovered('cylinders'); }}
          onPointerOut={() => setHovered(null)}
        >
          <cylinderGeometry args={[0.52, 0.52, 1.6, 16]} />
          <meshStandardMaterial {...getMaterialProperties('cylinders', '#1e293b')} opacity={0.65} transparent />
        </mesh>

        <group ref={piston3Ref}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.45, 0.45, 0.4, 16]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
          <group ref={connRod3Ref}>
            <mesh position={[0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.07, 1.2, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
          </group>
        </group>
      </group>

      {/* CYLINDER 4 (Bottom Right, position X > 0) */}
      <group position={[1.7, -0.5, 0.5]}>
        <mesh 
          rotation={[0, 0, -Math.PI / 2]}
          onClick={(e) => { e.stopPropagation(); setSelectedPart('cylinders'); }}
          onPointerOver={(e) => { e.stopPropagation(); setHovered('cylinders'); }}
          onPointerOut={() => setHovered(null)}
        >
          <cylinderGeometry args={[0.52, 0.52, 1.6, 16]} />
          <meshStandardMaterial {...getMaterialProperties('cylinders', '#1e293b')} opacity={0.65} transparent />
        </mesh>

        <group ref={piston4Ref}>
          <mesh rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.45, 0.45, 0.4, 16]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
          <group ref={connRod4Ref}>
            <mesh position={[-0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.07, 1.2, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ================= 4. OIL SUMP (Bottom Reservoir) ================= */}
      <mesh
        position={[0, -1.15, 0]}
        onClick={(e) => { e.stopPropagation(); setSelectedPart('oil_system'); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered('oil_system'); }}
        onPointerOut={() => setHovered(null)}
      >
        <boxGeometry args={[1.6, 0.5, 1.4]} />
        <meshStandardMaterial {...getMaterialProperties('oil_system', '#78350f')} />
      </mesh>

      {/* ================= 5. FUEL EFI RAIL (Top Distribution) ================= */}
      <mesh
        position={[0, 1.1, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); setSelectedPart('fuel_system'); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered('fuel_system'); }}
        onPointerOut={() => setHovered(null)}
      >
        <cylinderGeometry args={[0.08, 0.08, 3.4, 8]} />
        <meshStandardMaterial {...getMaterialProperties('fuel_system', '#0891b2')} />
      </mesh>

      {/* Small fuel pipe linkages to Cylinders */}
      <mesh position={[-1.2, 0.9, 0.25]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
        <meshStandardMaterial color="#0891b2" />
      </mesh>
      <mesh position={[1.2, 0.9, -0.25]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
        <meshStandardMaterial color="#0891b2" />
      </mesh>

      {/* ================= 6. GRID OVERLAYS / HELPERS ================= */}
      <gridHelper args={[20, 20, '#00e5ff', '#1e293b']} position={[0, -2, 0]} opacity={0.15} transparent />
    </group>
  );
};

// Main Export Component incorporating 3D Canvas
const EngineModel3D = () => {
  return (
    <div className="w-full h-80 bg-slate-950/80 border border-slate-900 rounded-xl relative shadow-inner overflow-hidden">
      
      {/* 3D Canvas */}
      <Canvas shadows gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[0, 2.5, 4.5]} fov={50} />
        
        {/* Dynamic Canvas Objects */}
        <EngineGeometry />
        
        <OrbitControls 
          enableZoom={true} 
          enablePan={true} 
          maxPolarAngle={Math.PI / 2 + 0.1} 
          minDistance={2} 
          maxDistance={10} 
        />
      </Canvas>

      {/* Overlay controls legend */}
      <div className="absolute bottom-3 left-3 font-mono text-[9px] text-slate-500 bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 rounded-lg flex flex-col gap-0.5">
        <span className="text-cyan-400 font-bold">3D SYNOPTIC TWIN ACTIVE</span>
        <span>• Left Click + Drag to rotate camera</span>
        <span>• Scroll to zoom • Click parts to inspect</span>
      </div>
    </div>
  );
};

export default EngineModel3D;
