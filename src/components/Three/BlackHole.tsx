import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function BlackHole() {
  const diskRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    // Spin the accretion disk super fast to simulate intense gravity!
    if (diskRef.current) {
      diskRef.current.rotation.z -= 0.02; // Fast spin
      
      // Heartbeat pulse effect on the glowing material
      const material = diskRef.current.material as THREE.MeshStandardMaterial;
      if (material) {
        material.emissiveIntensity = 3 + Math.sin(state.clock.elapsedTime * 3) * 1.5;
      }
    }

    // Slow majestic wobble for the whole black hole
    if (groupRef.current) {
      groupRef.current.position.y = 20 + Math.sin(state.clock.elapsedTime * 0.5) * 2;
    }
  });

  return (
    // Placed far off in the background distance so it looks massive and ominous
    <group ref={groupRef} position={[60, 20, -80]} scale={1.5}>
      {/* Event Horizon (Pure Black Core absorbing everything) */}
      <mesh>
        <sphereGeometry args={[10, 64, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Accretion Disk (Inner Bright Glowing Ring) */}
      <mesh ref={diskRef} rotation={[Math.PI / 2.4, 0.3, 0]}>
        <torusGeometry args={[16, 2.5, 32, 100]} />
        <meshStandardMaterial 
          color="#ffffff"
          emissive="#ff3300"
          emissiveIntensity={3}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Outer Faint Energy Ring (Additive Blending for Space Magic) */}
      <mesh rotation={[Math.PI / 2.4, 0.3, 0]}>
        <ringGeometry args={[19, 32, 64]} />
        <meshBasicMaterial 
          color="#ff0044"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
