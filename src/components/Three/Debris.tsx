import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Sparkles } from '@react-three/drei';

function Asteroid({ position, scale, rotation, speed, type }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create a unique rocky shape for each asteroid
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      // Random perturbation to create jaggedness
      const noise = (Math.random() - 0.5) * 0.4;
      pos.setXYZ(i, x + noise, y + noise, z + noise);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.005;
      meshRef.current.rotation.y += 0.002;
      // Drifting movement
      meshRef.current.position.y += Math.sin(state.clock.getElapsedTime() * speed) * 0.005;
      
      if (type === 'comet') {
        meshRef.current.position.x += 0.05; // Comets move faster
        if (meshRef.current.position.x > 100) meshRef.current.position.x = -100;
      }
    }
  });

  return (
    <group position={position}>
      <mesh 
        ref={meshRef} 
        geometry={geometry} 
        scale={scale} 
        rotation={rotation}
      >
        <meshStandardMaterial 
          color="#1a1a1a" 
          roughness={1} 
          metalness={0.2} 
          flatShading 
        />
      </mesh>
      {type === 'comet' && (
        <Sparkles 
          count={50} 
          scale={[1, 1, 5]} 
          size={1} 
          speed={0.5} 
          opacity={0.3} 
          color="#aaaaff" 
        />
      )}
    </group>
  );
}

export function Debris() {
  const count = 50;
  
  const asteroids = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const isComet = Math.random() < 0.1;
      const x = (Math.random() - 0.5) * 150;
      const y = (Math.random() - 0.5) * 100;
      const z = -Math.random() * 80 - 20;
      
      // Some are cigar-shaped (Oumuamua style)
      const isElongated = Math.random() < 0.2;
      const baseScale = Math.random() * 0.8 + 0.4;
      const scale: [number, number, number] = isElongated 
        ? [baseScale * 4, baseScale * 0.8, baseScale * 0.8] 
        : [baseScale, baseScale, baseScale];
        
      const rotation = [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI];
      const speed = Math.random() * 0.2 + 0.05;
      
      temp.push({ position: [x, y, z], scale, rotation, speed, type: isComet ? 'comet' : 'asteroid' });
    }
    return temp;
  }, [count]);

  return (
    <group>
      {asteroids.map((ast, i) => (
        <Asteroid key={i} {...ast} />
      ))}
    </group>
  );
}
