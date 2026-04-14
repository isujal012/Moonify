import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { useAtom } from 'jotai';
import { currentSongAtom } from '../../store/atoms';
import { SpaceBackground } from './SpaceBackground';
import { Moon } from './Moon';
import { EnergyRings } from './EnergyRings';
import { Debris } from './Debris';
import { Astronauts } from './Astronauts';
import { Satellite } from './Satellite';
import { Snowfall } from './Snowfall';
import { Lyrics3D } from './Lyrics3D';
import { Suspense, useEffect } from 'react';
import gsap from 'gsap';

function CameraController() {
  const { camera } = useThree();
  const [currentSong] = useAtom(currentSongAtom);

  useEffect(() => {
    if (currentSong) {
      // Zoom in and orbit when song is playing
      gsap.to(camera.position, {
        x: 0,
        y: 5,
        z: 35,
        duration: 2.5,
        ease: "power3.inOut"
      });
    } else {
      // Pull back for overview
      gsap.to(camera.position, {
        x: 10,
        y: 25,
        z: 60,
        duration: 3,
        ease: "power2.inOut"
      });
    }
  }, [currentSong, camera]);

  return null;
}

export function GalaxyScene() {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}>
      <Canvas shadows gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault fov={50} />
        <CameraController />
        
        <Suspense fallback={null}>
          <SpaceBackground />
          <Snowfall count={1500} />
          <Environment preset="city" />
          
          <EnergyRings />
          <Debris />
          <Astronauts />
          <Satellite />
        </Suspense>

        <Suspense fallback={null}>
          <Moon />
        </Suspense>
        
        <Suspense fallback={null}>
          <Lyrics3D />
        </Suspense>
        
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          maxDistance={150}
          minDistance={20}
          autoRotate={true}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
