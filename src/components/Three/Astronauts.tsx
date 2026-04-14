import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Float, Text } from '@react-three/drei';

function HeartEmote({ position }: any) {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const t = (state.clock.getElapsedTime() % 4) / 4; // 4s cycle
      meshRef.current.position.y = position[1] + t * 1.5;
      meshRef.current.scale.setScalar(Math.sin(t * Math.PI) * 1);
      (meshRef.current.children[0] as any).opacity = 1 - t;
    }
  });

  return (
    <group ref={meshRef}>
      <Text
        fontSize={0.4}
        color="#ff0066"
        anchorX="center"
        anchorY="middle"
      >
        ❤️
      </Text>
    </group>
  );
}

function Astronaut({ position, rotation, color = "#ffffff" }: any) {
  return (
    <group position={position} rotation={rotation} scale={3.5}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <HeartEmote position={[0, 0.8, 0]} />
        {/* Helmet */}
        <mesh position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0, 0.6, 0.15]}>
          <sphereGeometry args={[0.18, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.5]} />
          <meshStandardMaterial color="#222222" metalness={0.9} roughness={0.1} />
        </mesh>
        
        {/* Body */}
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.4, 0.5, 0.25]} />
          <meshStandardMaterial color={color} />
        </mesh>
        
        {/* Backpack */}
        <mesh position={[0, 0.2, -0.18]}>
          <boxGeometry args={[0.3, 0.4, 0.15]} />
          <meshStandardMaterial color={color} />
        </mesh>

        {/* Arms */}
        <mesh position={[0.25, 0.3, 0]} rotation={[0, 0, -0.2]}>
          <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[-0.25, 0.3, 0]} rotation={[0, 0, 0.2]}>
          <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>

        {/* Legs */}
        <mesh position={[0.12, -0.15, 0]} rotation={[0, 0, 0.1]}>
          <capsuleGeometry args={[0.09, 0.3, 4, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[-0.12, -0.15, 0]} rotation={[0, 0, -0.1]}>
          <capsuleGeometry args={[0.09, 0.3, 4, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </Float>
    </group>
  );
}

export function Astronauts() {
  const groupRef = useRef<THREE.Group>(null);
  const heartRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      // Rotating around each other
      groupRef.current.rotation.y = t * 0.08;
      groupRef.current.position.y = Math.sin(t * 0.5) * 1.5;
    }
    if (heartRef.current) {
      // central Heart pulsing
      const s = 2.5 + Math.sin(t * 4) * 0.5;
      heartRef.current.scale.set(s, s, s);
      (heartRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(t * 4) * 0.3;
    }
  });

  return (
    <group position={[-25, 15, -30]}>
      <group ref={groupRef}>
        {/* The Lovers */}
        <Astronaut position={[4, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <Astronaut position={[-4, 0, 0]} rotation={[0, Math.PI / 2, 0]} color="#f0f0f5" />
        
        {/* Heart Light between them */}
        <mesh ref={heartRef} position={[0, 0.5, 0]} rotation={[0, 0, 0]}>
          <octahedronGeometry args={[0.4, 0]} />
          <meshBasicMaterial color="#ff0066" transparent opacity={0.6} />
          <pointLight intensity={5} color="#ff0066" distance={25} />
        </mesh>
      </group>
    </group>
  );
}
