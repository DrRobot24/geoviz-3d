
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { ExcavationDimensions, SurfaceData } from '../types';

interface ExcavationModelProps {
  dimensions: ExcavationDimensions;
  surfaces: SurfaceData[];
  isExploded?: boolean;
}

/**
 * Funzione per generare una texture procedurale che simula il TNT.
 * Crea un pattern di fibre e micro-perforazioni tipiche del tessuto-non-tessuto.
 */
const createTNTTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Sfondo base neutro (bianco sporco per permettere la colorazione successiva)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);

  // Aggiunta di rumore per la granulosità
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const alpha = Math.random() * 0.15;
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // Aggiunta di fibre casuali
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 1500; i++) {
    ctx.beginPath();
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
    ctx.stroke();
  }

  // Aggiunta del pattern a "punti" pressati a caldo tipico del TNT industriale
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  const spacing = 8;
  for (let x = 0; x < 512; x += spacing) {
    for (let y = 0; y < 512; y += spacing) {
      if ((x + y) % (spacing * 2) === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2); // Ripetizione per evitare stiramenti su grandi superfici
  return texture;
};

export const ExcavationModel: React.FC<ExcavationModelProps> = ({ dimensions, surfaces, isExploded = false }) => {
  const { length, width, depth } = dimensions;
  const groupRef = useRef<THREE.Group>(null);

  // Creazione della texture TNT una sola volta
  const tntTexture = useMemo(() => createTNTTexture(), []);

  // Animation constants
  const lerpSpeed = 0.1;

  // Face data extraction
  const bottom = surfaces.find(s => s.id === 'bottom')!;
  const sideLong = surfaces.find(s => s.id === 'sides_long')!;
  const sideShort = surfaces.find(s => s.id === 'sides_short')!;

  // Refs for animation
  const bottomRef = useRef<THREE.Group>(null);
  const wallLong1Ref = useRef<THREE.Group>(null);
  const wallLong2Ref = useRef<THREE.Group>(null);
  const wallShort1Ref = useRef<THREE.Group>(null);
  const wallShort2Ref = useRef<THREE.Group>(null);

  useFrame(() => {
    const targetExplode = isExploded ? 1 : 0;
    
    // Animate walls positions based on explosion state
    if (bottomRef.current) bottomRef.current.position.y = THREE.MathUtils.lerp(bottomRef.current.position.y, -targetExplode * 0.5, lerpSpeed);
    
    if (wallLong1Ref.current) wallLong1Ref.current.position.z = THREE.MathUtils.lerp(wallLong1Ref.current.position.z, -width/2 - targetExplode * 1.5, lerpSpeed);
    if (wallLong2Ref.current) wallLong2Ref.current.position.z = THREE.MathUtils.lerp(wallLong2Ref.current.position.z, width/2 + targetExplode * 1.5, lerpSpeed);
    
    if (wallShort1Ref.current) wallShort1Ref.current.position.x = THREE.MathUtils.lerp(wallShort1Ref.current.position.x, -length/2 - targetExplode * 1.5, lerpSpeed);
    if (wallShort2Ref.current) wallShort2Ref.current.position.x = THREE.MathUtils.lerp(wallShort2Ref.current.position.x, length/2 + targetExplode * 1.5, lerpSpeed);
  });

  const TNTMaterial = (color: string, repeatX: number, repeatY: number) => {
    // Clona la texture per impostare una ripetizione specifica per ogni faccia per mantenere la scala del pattern coerente
    const faceTexture = tntTexture?.clone();
    if (faceTexture) {
      faceTexture.repeat.set(repeatX * 2, repeatY * 2);
      faceTexture.needsUpdate = true;
    }

    return (
      <meshStandardMaterial 
        color={color} 
        map={faceTexture}
        roughness={1.0} // Il TNT è molto opaco
        metalness={0.0} 
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={1}
        transparent
        opacity={0.98}
      />
    );
  };

  // Calcola la dimensione del font in base alla superficie
  const getFontSize = (area: number) => Math.min(0.35, Math.max(0.15, area * 0.025));

  return (
    <group ref={groupRef}>
      {/* 1. BOTTOM FACE - Superficie Inferiore */}
      <group ref={bottomRef} position={[0, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <planeGeometry args={[length, width]} />
          {TNTMaterial(bottom.color, length, width)}
        </mesh>
        <Text 
          position={[0, 0.06, -0.3]} 
          rotation={[-Math.PI / 2, 0, 0]} 
          fontSize={getFontSize(bottom.area) * 0.6} 
          color="white" 
          fontWeight="bold"
          outlineWidth={0.015}
          outlineColor="rgba(0,0,0,0.7)"
        >
          BASE
        </Text>
        <Text 
          position={[0, 0.06, 0.15]} 
          rotation={[-Math.PI / 2, 0, 0]} 
          fontSize={getFontSize(bottom.area)} 
          color="white" 
          fontWeight="bold"
          outlineWidth={0.02}
          outlineColor="rgba(0,0,0,0.7)"
        >
          {`${bottom.area.toFixed(2)} m²`}
        </Text>
        <Text 
          position={[0, 0.06, 0.5]} 
          rotation={[-Math.PI / 2, 0, 0]} 
          fontSize={getFontSize(bottom.area) * 0.5} 
          color="rgba(255,255,255,0.8)" 
          outlineWidth={0.01}
          outlineColor="rgba(0,0,0,0.5)"
        >
          {`${length.toFixed(1)}m × ${width.toFixed(1)}m`}
        </Text>
      </group>

      {/* 2. SIDE LONG WALLS - Pareti Laterali Lunghe */}
      <group ref={wallLong1Ref} position={[0, depth / 2, -width / 2]}>
        <mesh castShadow receiveShadow>
          <planeGeometry args={[length, depth]} />
          {TNTMaterial(sideLong.color, length, depth)}
        </mesh>
        <Text position={[0, 0.3, 0.06]} fontSize={getFontSize(sideLong.area) * 0.5} color="white" fontWeight="bold" outlineWidth={0.015} outlineColor="rgba(0,0,0,0.7)">
          PARETE LUNGA 1
        </Text>
        <Text position={[0, 0, 0.06]} fontSize={getFontSize(sideLong.area)} color="white" fontWeight="bold" outlineWidth={0.02} outlineColor="rgba(0,0,0,0.7)">
          {`${sideLong.area.toFixed(2)} m²`}
        </Text>
        <Text position={[0, -0.35, 0.06]} fontSize={getFontSize(sideLong.area) * 0.45} color="rgba(255,255,255,0.8)" outlineWidth={0.01} outlineColor="rgba(0,0,0,0.5)">
          {`${length.toFixed(1)}m × ${depth.toFixed(1)}m`}
        </Text>
      </group>

      <group ref={wallLong2Ref} position={[0, depth / 2, width / 2]}>
        <mesh castShadow receiveShadow>
          <planeGeometry args={[length, depth]} />
          {TNTMaterial(sideLong.color, length, depth)}
        </mesh>
        <Text position={[0, 0.3, -0.06]} rotation={[0, Math.PI, 0]} fontSize={getFontSize(sideLong.area) * 0.5} color="white" fontWeight="bold" outlineWidth={0.015} outlineColor="rgba(0,0,0,0.7)">
          PARETE LUNGA 2
        </Text>
        <Text position={[0, 0, -0.06]} rotation={[0, Math.PI, 0]} fontSize={getFontSize(sideLong.area)} color="white" fontWeight="bold" outlineWidth={0.02} outlineColor="rgba(0,0,0,0.7)">
          {`${sideLong.area.toFixed(2)} m²`}
        </Text>
        <Text position={[0, -0.35, -0.06]} rotation={[0, Math.PI, 0]} fontSize={getFontSize(sideLong.area) * 0.45} color="rgba(255,255,255,0.8)" outlineWidth={0.01} outlineColor="rgba(0,0,0,0.5)">
          {`${length.toFixed(1)}m × ${depth.toFixed(1)}m`}
        </Text>
      </group>

      {/* 3. SIDE SHORT WALLS - Pareti Laterali Corte */}
      <group ref={wallShort1Ref} position={[-length / 2, depth / 2, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
          <planeGeometry args={[width, depth]} />
          {TNTMaterial(sideShort.color, width, depth)}
        </mesh>
        <Text position={[0.06, 0.3, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={getFontSize(sideShort.area) * 0.5} color="white" fontWeight="bold" outlineWidth={0.015} outlineColor="rgba(0,0,0,0.7)">
          PARETE CORTA 1
        </Text>
        <Text position={[0.06, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={getFontSize(sideShort.area)} color="white" fontWeight="bold" outlineWidth={0.02} outlineColor="rgba(0,0,0,0.7)">
          {`${sideShort.area.toFixed(2)} m²`}
        </Text>
        <Text position={[0.06, -0.35, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={getFontSize(sideShort.area) * 0.45} color="rgba(255,255,255,0.8)" outlineWidth={0.01} outlineColor="rgba(0,0,0,0.5)">
          {`${width.toFixed(1)}m × ${depth.toFixed(1)}m`}
        </Text>
      </group>

      <group ref={wallShort2Ref} position={[length / 2, depth / 2, 0]}>
        <mesh rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
          <planeGeometry args={[width, depth]} />
          {TNTMaterial(sideShort.color, width, depth)}
        </mesh>
        <Text position={[-0.06, 0.3, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={getFontSize(sideShort.area) * 0.5} color="white" fontWeight="bold" outlineWidth={0.015} outlineColor="rgba(0,0,0,0.7)">
          PARETE CORTA 2
        </Text>
        <Text position={[-0.06, 0, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={getFontSize(sideShort.area)} color="white" fontWeight="bold" outlineWidth={0.02} outlineColor="rgba(0,0,0,0.7)">
          {`${sideShort.area.toFixed(2)} m²`}
        </Text>
        <Text position={[-0.06, -0.35, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={getFontSize(sideShort.area) * 0.45} color="rgba(255,255,255,0.8)" outlineWidth={0.01} outlineColor="rgba(0,0,0,0.5)">
          {`${width.toFixed(1)}m × ${depth.toFixed(1)}m`}
        </Text>
      </group>

      {/* 4. OPEN TOP (Dashed Outline) */}
      {!isExploded && (
        <Line
          points={[
            [-length / 2, depth, -width / 2],
            [length / 2, depth, -width / 2],
            [length / 2, depth, width / 2],
            [-length / 2, depth, width / 2],
            [-length / 2, depth, -width / 2],
          ] as [number, number, number][]}
          color="#94a3b8"
          lineWidth={2}
          transparent
          opacity={0.5}
        />
      )}

      {/* Labels & Markers */}
      {!isExploded && (
        <>
            <group position={[0, depth + 0.8, 0]}>
                <Text fontSize={0.3} color="#64748b" fontWeight="bold" outlineWidth={0.02} outlineColor="white">BOCCA DI SCAVO (APERTA)</Text>
            </group>
            
            {/* Dimension Lines */}
            <group position={[0, 0, width / 2 + 0.3]}>
                <Line points={[[-length / 2, 0, 0], [length / 2, 0, 0]] as [number, number, number][]} color="#94a3b8" lineWidth={1} />
                <Text position={[0, -0.2, 0]} fontSize={0.15} color="#94a3b8">{length}m</Text>
            </group>
            <group position={[length / 2 + 0.3, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <Line points={[[-width / 2, 0, 0], [width / 2, 0, 0]] as [number, number, number][]} color="#94a3b8" lineWidth={1} />
                <Text position={[0, -0.2, 0]} fontSize={0.15} color="#94a3b8">{width}m</Text>
            </group>
        </>
      )}
    </group>
  );
};
