import { useTexture, Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useAtom } from 'jotai';
import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { currentSongAtom, isPlayingAtom, isDashboardOpenAtom } from '../../store/atoms';
import { audioAnalyserAtom } from '../../store/audioStore';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D moonTexture;
  uniform sampler2D albumTexture;
  uniform float mixFactor;
  uniform float pulseIntensity;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    float dimming = 0.5; // Low light filter
    vec4 moonColor = texture2D(moonTexture, vUv) * dimming;
    vec4 albumColor = texture2D(albumTexture, vUv) * dimming;
    
    // Project album art but keep moon craters visible (holographic look)
    vec4 finalColor = mix(moonColor, albumColor * 1.5, mixFactor * 0.7);
    
    // Fresnel glow - keep this bright to define shape in low light
    float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    finalColor += vec4(0.0, 0.8, 1.0, 1.0) * fresnel * (0.6 + pulseIntensity * 0.4);
    
    gl_FragColor = finalColor;
  }
`;

export function Moon() {
  const [currentSong] = useAtom(currentSongAtom);
  const [isPlaying] = useAtom(isPlayingAtom);
  const [isDashOpen] = useAtom(isDashboardOpenAtom);
  const [analyser] = useAtom(audioAnalyserAtom);
  
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const dataArray = new Uint8Array(128);

  // Transition state for cinematic mode
  const moonState = useMemo(() => ({
    scale: 1,
    z: 0
  }), []);

  useEffect(() => {
    if (isDashOpen) {
      gsap.to(moonState, { scale: 1, z: 0, duration: 1.5, ease: "power2.inOut" });
    } else {
      gsap.to(moonState, { scale: 0.6, z: 0, duration: 2, ease: "power3.inOut" });
    }
  }, [isDashOpen]);

  // Use a high-quality NASA Moon texture as the base for stability
  const HUD_MOON_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg';
  
  const moonTex = useTexture(HUD_MOON_URL);
  const albumUrl = currentSong?.image?.[currentSong.image.length - 1]?.link || HUD_MOON_URL;
  const albumTex = useTexture(albumUrl);

  const uniforms = useMemo(() => ({
    moonTexture: { value: moonTex },
    albumTexture: { value: albumTex },
    mixFactor: { value: 0 },
    pulseIntensity: { value: 0 }
  }), []);

  useEffect(() => {
    uniforms.moonTexture.value = moonTex;
    uniforms.albumTexture.value = albumTex;
    
    if (currentSong) {
      gsap.to(uniforms.mixFactor, { value: 1, duration: 2, ease: "power2.inOut" });
    } else {
      gsap.to(uniforms.mixFactor, { value: 0, duration: 2, ease: "power2.inOut" });
    }
  }, [currentSong, albumTex, moonTex]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      // Main rotation - slowed down for a more cinematic feel
      meshRef.current.rotation.y = t * (isPlaying ? 0.04 : 0.01);
      // Subtle wobble/libration
      meshRef.current.rotation.x = Math.sin(t * 0.5) * 0.05;
      meshRef.current.rotation.z = Math.cos(t * 0.3) * 0.03;
    }
    
    if (analyser) {
      analyser.getByteFrequencyData(dataArray);
      const average = Array.from(dataArray).slice(0, 32).reduce((a, b) => a + b, 0) / 32;
      uniforms.pulseIntensity.value = (average / 255) * 1.5; // Boosted intensity
      
      const baseScale = moonState.scale;
      const bounce = baseScale + (average / 255) * 0.1;
      if (meshRef.current) meshRef.current.scale.set(bounce, bounce, bounce);
    } else {
      const baseScale = moonState.scale;
      if (meshRef.current) meshRef.current.scale.set(baseScale, baseScale, baseScale);
    }

    if (groupRef.current) {
      groupRef.current.position.z = moonState.z;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[12, 128, 128]} />
          <shaderMaterial 
            uniforms={uniforms}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
          />
        </mesh>
      </Float>
      
      {/* Dynamic point light synced with music - boosted intensity for visual feedback */}
      <pointLight 
        position={[20, 20, 20]} 
        intensity={2 + uniforms.pulseIntensity.value * 8} 
        color="#00d2ff" 
      />
    </group>
  );
}
