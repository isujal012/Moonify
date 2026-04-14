import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Snowfall({ count = 2500 }) {
  const points = useRef<THREE.Points>(null);
  
  // Generate random positions spanning a wide 3D volume
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 120; // x: wide spread
        positions[i * 3 + 1] = Math.random() * 100 - 50;    // y: height from -50 to +50
        positions[i * 3 + 2] = (Math.random() - 0.5) * 120; // z: depth
    }
    return positions;
  }, [count]);

  // Generate individual falling speeds and swaying characteristics
  const particleData = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        velocity: 0.05 + Math.random() * 0.05,       // downward speed
        swaySpeed: 0.5 + Math.random() * 1.5,        // how fast it drifts horizontally
        swayAmount: 0.02 + Math.random() * 0.06,     // how wide it drifts
        startX: particlesPosition[i * 3]             // natural anchor
      });
    }
    return data;
  }, [count, particlesPosition]);

  useFrame((state) => {
    if (points.current) {
      const positions = points.current.geometry.attributes.position.array as Float32Array;
      const time = state.clock.elapsedTime;
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const data = particleData[i];
        
        // Move downwards
        positions[i3 + 1] -= data.velocity;
        
        // Gentle side-to-side oscillation mimicking snowflakes
        positions[i3 + 0] = data.startX + Math.sin(time * data.swaySpeed) * data.swayAmount * 100;
        
        // Loop back to the top seamlessly when it falls below Y = -50
        if (positions[i3 + 1] < -50) {
          positions[i3 + 1] = 50;
        }
      }
      points.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particlesPosition, 3]}
        />
      </bufferGeometry>
      {/* 
        Using AdditiveBlending makes the snow glow organically when overlapping 
        with the bloom post-processing, giving a magical space-snow feel.
      */}
      <pointsMaterial
        size={0.2}
        color="#ffffff"
        transparent={true}
        opacity={0.8}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
