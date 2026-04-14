import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Float } from '@react-three/drei';

export function Satellite() {
  const satelliteRef = useRef<THREE.Group>(null);
  const signalRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (satelliteRef.current) {
      // Slow orbital drift
      satelliteRef.current.position.x = Math.sin(t * 0.1) * 30;
      satelliteRef.current.position.z = Math.cos(t * 0.1) * 30 - 30;
      satelliteRef.current.position.y = Math.cos(t * 0.15) * 5 + 10;
      
      // Self rotation
      satelliteRef.current.rotation.y = t * 0.2;
      satelliteRef.current.rotation.x = Math.sin(t * 0.1) * 0.2;
    }

    if (signalRef.current) {
      // Blinking signal light
      signalRef.current.intensity = Math.sin(t * 8) > 0.8 ? 5 : 0;
    }
  });

  return (
    <group ref={satelliteRef}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        {/* Main Body - Gold foil look */}
        <mesh>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshStandardMaterial 
            color="#ffd700" 
            metalness={1} 
            roughness={0.2} 
            emissive="#b8860b" 
            emissiveIntensity={0.2} 
          />
        </mesh>

        {/* Solar Panels - Wings */}
        <group position={[0, 0, 0]}>
          {/* Left Panel */}
          <mesh position={[-3, 0, 0]}>
            <boxGeometry args={[4, 0.05, 1.5]} />
            <meshStandardMaterial color="#001a4d" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Right Panel */}
          <mesh position={[3, 0, 0]}>
            <boxGeometry args={[4, 0.05, 1.5]} />
            <meshStandardMaterial color="#001a4d" metalness={0.8} roughness={0.3} />
          </mesh>
          
          {/* Panel Supports */}
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 6]} />
            <meshStandardMaterial color="#444444" metalness={1} />
          </mesh>
        </group>

        {/* Parabolic Dish */}
        <mesh position={[0, 0.7, 0]} rotation={[-Math.PI / 4, 0, 0]}>
          <coneGeometry args={[0.6, 0.3, 32, 1, true]} />
          <meshStandardMaterial color="#888888" metalness={1} side={THREE.DoubleSide} />
        </mesh>
        {/* Dish Antenna Feed */}
        <mesh position={[0, 1, 0.3]} rotation={[-Math.PI / 4, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.6]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>

        {/* Blinking Signal Light */}
        <mesh position={[0.5, 0.5, 0.6]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
          <pointLight ref={signalRef} color="#ff0000" distance={5} />
        </mesh>

        {/* Rim Highlights - Point lights to make it pop */}
        <pointLight position={[2, 2, 2]} intensity={2} color="#00d2ff" distance={10} />
      </Float>
    </group>
  );
}
