import { Stars, Sparkles, Cloud, Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

export function SpaceBackground() {
  const groupRef = useRef<THREE.Group>(null);
  
  // Symmetrical nebula cloud positions for a balanced "X" formation
  const nebulaPositions = useMemo(() => [
    [25, 20, -50], [-25, 20, -50], // Top corners
    [25, -20, -50], [-25, -20, -50], // Bottom corners
    [40, 0, -60], [-40, 0, -60], // Distant sides
    [0, 30, -70], [0, -30, -70] // Vertical axis
  ], []);

  useFrame((state) => {
    if (groupRef.current) {
      // Extremely slow drift for a more serene feel
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.005;
    }
  });

  return (
    <group ref={groupRef}>
      {/* High-density starfield */}
      <Stars 
        radius={150} 
        depth={60} 
        count={8000} 
        factor={7} 
        saturation={0.5} 
        fade 
        speed={1.5} 
      />
      
      {/* Floating stellar dust */}
      <Sparkles 
        count={400} 
        scale={[120, 120, 120]} 
        size={3} 
        speed={0.3} 
        opacity={0.2} 
        color="#00d2ff"
      />
      
      {/* Animated Nebula Clouds */}
      <group>
        {nebulaPositions.map((pos, i) => (
          <Float key={i} speed={1} rotationIntensity={0.5} floatIntensity={1}>
            <Cloud
              position={pos as [number, number, number]}
              opacity={0.12}
              speed={0.4}
              segments={20}
              color="#f0f0f5" // Light white/ethereal
            />
          </Float>
        ))}
      </group>

      <ambientLight intensity={0.4} />
      <pointLight position={[20, 20, 20]} intensity={1.5} color="#00d2ff" />
      <pointLight position={[-20, -20, -20]} intensity={1} color="#ff00ff" />
    </group>
  );
}
