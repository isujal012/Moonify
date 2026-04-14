import { useFrame } from '@react-three/fiber';
import { useAtom } from 'jotai';
import { useRef } from 'react';
import * as THREE from 'three';
import { audioAnalyserAtom } from '../../store/audioStore';

export function EnergyRings() {
  const [analyser] = useAtom(audioAnalyserAtom);
  const groupRef = useRef<THREE.Group>(null);
  const dataArray = new Uint8Array(128);

  useFrame(() => {
    if (analyser && groupRef.current) {
      analyser.getByteFrequencyData(dataArray);
      const averageArr = Array.from(dataArray).slice(0, 32);
      const average = averageArr.reduce((a, b) => a + b, 0) / averageArr.length;
      const intensity = average / 255;

      groupRef.current.children.forEach((mesh, i) => {
        const ring = mesh as THREE.Mesh;
        const scale = 1 + (intensity * (i + 1) * 0.5);
        ring.scale.set(scale, scale, scale);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - scale / 10) * intensity;
        ring.rotation.z += 0.01 * (i + 1);
      });
    }
  });

  return (
    <group ref={groupRef}>
      {[...Array(5)].map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[12.5 + i * 2, 12.7 + i * 2, 64]} />
          <meshBasicMaterial color="#00d2ff" transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
