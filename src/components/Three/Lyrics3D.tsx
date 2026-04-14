import { Float, Billboard, Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useAtom } from 'jotai';
import { useMemo, useState, useEffect } from 'react';
import { currentTimeAtom, lyricsAtom } from '../../store/atoms';
import * as THREE from 'three';

interface LyricLine {
  time: number;
  text: string;
}

export function Lyrics3D() {
  const { camera } = useThree();
  const [currentTime] = useAtom(currentTimeAtom);
  const [lyrics] = useAtom(lyricsAtom);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [pos, setPos] = useState<[number, number, number]>([0, 0, -20]);

  const parsedLyrics = useMemo(() => {
    if (!lyrics) return [];
    
    const lines = lyrics.split('\n');
    const syncLines: LyricLine[] = [];
    
    // Global offset support [offset:N]
    let globalOffset = 0;
    const offsetRegex = /\[offset:(-?\d+)\]/i;
    
    // Multi-timestamp regex: [mm:ss.xx] or [m:ss.x] or [mm:ss]
    const timeRegex = /\[(\d+):(\d{2})(?:[.:](\d+))?\]/g;
    
    for (const line of lines) {
      // Check for offset tag
      const offsetMatch = offsetRegex.exec(line);
      if (offsetMatch) {
        globalOffset = parseInt(offsetMatch[1]) / 1000;
        continue;
      }

      // Extract all timestamps from the line
      const matches = [...line.matchAll(timeRegex)];
      if (matches.length > 0) {
        // Extract the text by removing all [time] tags
        const text = line.replace(/\[\d+:\d{2}(?:[.:]\d+)?\]/g, '').trim();
        
        for (const match of matches) {
          const mins = parseInt(match[1]);
          const secs = parseInt(match[2]);
          let ms = 0;
          if (match[3]) {
            const msText = match[3];
            // Normalize ms length to 3 digits (e.g. .5 -> .500, .45 -> .450)
            ms = parseInt(msText.padEnd(3, '0')) / 1000;
          }
          
          const time = mins * 60 + secs + ms + globalOffset;
          syncLines.push({ time, text });
        }
      }
    }
    
    // LRC files aren't always chronologically ordered if multiple timestamps are used
    return syncLines.sort((a, b) => a.time - b.time);
  }, [lyrics]);

  // Handle position re-rolls when lines change based on camera position
  useEffect(() => {
    if (parsedLyrics.length === 0) return;
    
    // Find the current active line
    let index = -1;
    for (let i = parsedLyrics.length - 1; i >= 0; i--) {
      if (currentTime >= parsedLyrics[i].time) {
        index = i;
        break;
      }
    }
    
    // Re-roll position only when line changes
    if (index !== -1 && index !== currentLineIndex) {
      setCurrentLineIndex(index);
      
      // Calculate a position directly in front of the camera regardless of orbit angle
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      
      // Distance from camera to spawn lyrics (15 units)
      const dist = 15;
      const basePos = camera.position.clone().add(dir.multiplyScalar(dist));
      
      // Calculate up and right vectors to offset text safely around the center viewport
      const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();
      const up = new THREE.Vector3().crossVectors(right, dir).normalize();
      
      const isLeft = Math.random() > 0.5;
      // random horizontal offset: 4 to 8 units to the left or right
      const offsetX = isLeft ? -4 - Math.random() * 4 : 4 + Math.random() * 4; 
      // random vertical offset: -3 to +3 units
      const offsetY = (Math.random() - 0.5) * 6; 
      
      basePos.add(right.multiplyScalar(offsetX));
      basePos.add(up.multiplyScalar(offsetY));
      
      setPos([basePos.x, basePos.y, basePos.z]);
    }
  }, [currentTime, parsedLyrics, currentLineIndex, camera]);

  const displayedText = useMemo(() => {
    if (currentLineIndex === -1 || !parsedLyrics[currentLineIndex]) return '';
    
    const line = parsedLyrics[currentLineIndex];
    if (!line.text) return ''; // Handled instrumental gap
    
    const nextLine = parsedLyrics[currentLineIndex + 1];
    
    const endTime = nextLine ? nextLine.time : line.time + 5;
    const duration = endTime - line.time > 0 ? endTime - line.time : 5;
    const elapsed = currentTime - line.time;
    
    // Typewriter reveal (character by character) over a natural duration
    const desiredTypingDuration = line.text.length / 25; // 25 characters typed per second
    const actualTypingDuration = Math.min(desiredTypingDuration, duration * 0.85); // Cap at 85% of line length
    
    if (actualTypingDuration <= 0) return line.text;

    const typeProgress = Math.max(0, Math.min(1, elapsed / actualTypingDuration));
    const charsToShow = Math.ceil(typeProgress * line.text.length);
    
    return line.text.substring(0, charsToShow);
  }, [currentTime, currentLineIndex, parsedLyrics]);

  const highlightedText = useMemo(() => {
    if (!displayedText) return null;
    
    const tokens = displayedText.split(/(\s+)/);
    const cosmicColors = ['#00e5ff', '#ff4081', '#b388ff', '#69f0ae'];
    
    return tokens.map((token, i) => {
      const isWord = token.trim().length > 0;
      const isMainWord = isWord && token.trim().length > 4;
      
      if (isMainWord) {
        // Consistent color assignment based on word length and first char
        const colorIdx = (token.length + token.charCodeAt(0)) % cosmicColors.length;
        return (
          <span 
            key={i} 
            className="lyric-word"
            style={{ 
              color: cosmicColors[colorIdx], 
              textShadow: `0 0 10px ${cosmicColors[colorIdx]}`,
              fontWeight: '500',
              animation: `wordPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, wordDance 2s ease-in-out infinite ${0.35 + (i % 4) * 0.15}s`
            }}
          >
            {token}
          </span>
        );
      }
      return (
        <span 
          key={i} 
          className="lyric-word" 
          style={{ 
            color: '#ffffff',
            animation: `wordPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, wordDance 2s ease-in-out infinite ${0.35 + (i % 4) * 0.15}s`
          }}
        >
          {token}
        </span>
      );
    });
  }, [displayedText]);

  if (!lyrics || currentLineIndex === -1 || !displayedText) return null;

  return (
    <Billboard position={pos}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <Html transform center distanceFactor={15} zIndexRange={[100, 0]}>
          <style>
            {`
              @import url('https://fonts.googleapis.com/css2?family=Lugrasimo&display=swap');
              
              @keyframes wordPop {
                0% { transform: scale(0.2) translateY(5px) rotate(-5deg); opacity: 0; }
                50% { transform: scale(1.15) translateY(-2px) rotate(2deg); opacity: 1; }
                100% { transform: scale(1) translateY(0) rotate(0deg); opacity: 1; }
              }
              
              @keyframes wordDance {
                0% { transform: scale(1) translateY(0) rotate(0deg); }
                25% { transform: scale(1.05) translateY(-3px) rotate(2deg); }
                50% { transform: scale(1) translateY(0) rotate(0deg); }
                75% { transform: scale(0.95) translateY(3px) rotate(-2deg); }
                100% { transform: scale(1) translateY(0) rotate(0deg); }
              }
              
              .lyric-word {
                display: inline-block;
                transform-origin: bottom center;
                white-space: pre-wrap;
              }
            `}
          </style>
          <div 
            style={{ 
              width: 'max-content',
              maxWidth: '300px',
              textAlign: 'center',
              fontSize: '26px', // Scaled way back down
              fontFamily: "'Lugrasimo', cursive",
              letterSpacing: '1px',
              lineHeight: '1.2',
              textShadow: '0px 2px 4px rgba(0,0,0,0.8), 0 0 15px rgba(255,255,255,0.4)'
            }}
          >
            {highlightedText}
          </div>
        </Html>
      </Float>
    </Billboard>
  );
}
