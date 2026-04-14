import { useTexture, Float, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useAtom } from 'jotai';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import type { Song } from '../../services/musicService';
import { currentSongAtom, isPlayingAtom } from '../../store/atoms';

interface PlanetProps {
  song: Song;
  position: [number, number, number];
}

export function Planet({ song, position }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [currentSong, setCurrentSong] = useAtom(currentSongAtom);
  const [isPlaying] = useAtom(isPlayingAtom);
  const [hovered, setHovered] = useState(false);


  const isActive = currentSong?.id === song.id;
  
  // Safe texture loading
  const imageUrl = song.image?.[song.image.length - 1]?.link || 'https://via.placeholder.com/300';
  const texture = useTexture(imageUrl);

  useFrame((state) => {
    if (meshRef.current) {
      // Rotation speed increases if playing and active
      const speed = isActive && isPlaying ? 0.8 : 0.2;
      meshRef.current.rotation.y += speed * 0.01;
    }
    
    if (ringRef.current && isActive) {
      ringRef.current.rotation.z += 0.02;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      ringRef.current.scale.set(scale, scale, scale);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setCurrentSong(song);
  };

  return (
    <group position={position}>
      <Float speed={isActive ? 0 : 2} rotationIntensity={isActive ? 0 : 1} floatIntensity={isActive ? 0 : 1}>
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          scale={isActive ? 2 : 1}
        >
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial 
            map={texture} 
            emissive={isActive ? new THREE.Color('#00d2ff') : new THREE.Color('#000000')}
            emissiveIntensity={isActive ? 0.5 : 0}
            roughness={0.3}
            metalness={0.8}
          />
          
          {/* Active Highlight Ring */}
          {isActive && (
            <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.2, 1.3, 64]} />
              <meshBasicMaterial color="#00d2ff" transparent opacity={0.8} side={THREE.DoubleSide} />
            </mesh>
          )}

          {/* Label */}
          <Html position={[0, -1.5, 0]} center style={{ pointerEvents: 'none' }}>
            <div className={`planet-label ${isActive ? 'active' : ''} ${hovered ? 'visible' : ''}`}>
              <p className="song-name">{song.name}</p>
              <p className="artist-name">{song.primaryArtists}</p>
            </div>
          </Html>
        </mesh>
      </Float>

      {/* Glow Effect when active */}
      {isActive && (
        <pointLight intensity={2} distance={10} color="#00d2ff" />
      )}
    </group>
  );
}
