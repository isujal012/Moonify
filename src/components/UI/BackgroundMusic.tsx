import { useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { audioAnalyserAtom, initAnalyser } from '../../store/audioStore';
import { userAtom } from '../../store/atoms';

// Global single instance of the background audio
const bgAudio = typeof window !== 'undefined' ? new Audio('/audio/bg-music.mp3') : null;
if (bgAudio) {
  bgAudio.loop = true;
  bgAudio.volume = 0.4;
  bgAudio.crossOrigin = "anonymous";
}

let fadeOutInterval: any = null;

export function BackgroundMusic() {
  const user = useAtomValue(userAtom);
  const [, setAnalyser] = useAtom(audioAnalyserAtom);

  useEffect(() => {
    if (!bgAudio) return;

    // SCENARIO: User is NOT logged in - Start/Resume music
    if (!user) {
      console.log('BackgroundMusic: No user detected, checking playback status...');
      
      // Clear any pending fade-outs
      if (fadeOutInterval) {
        clearInterval(fadeOutInterval);
        fadeOutInterval = null;
      }

      // Restore volume
      bgAudio.volume = 0.4;

      const startPlayback = async () => {
        try {
          // Only attempt play if not already playing
          if (bgAudio.paused) {
            console.log('BackgroundMusic: Attempting playback...');
            await bgAudio.play();
            console.log('BackgroundMusic: Playing.');
          }
          const analyser = initAnalyser(bgAudio);
          setAnalyser(analyser);
        } catch (err) {
          console.log('BackgroundMusic: Autoplay blocked, waiting for interaction.');
        }
      };

      const handleInteraction = () => {
        console.log('BackgroundMusic: User interaction detected.');
        bgAudio.play().then(() => {
          const analyser = initAnalyser(bgAudio);
          setAnalyser(analyser);
        }).catch(e => console.error('BackgroundMusic: Interaction play failed:', e));
        
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
      };

      document.addEventListener('click', handleInteraction);
      document.addEventListener('keydown', handleInteraction);

      startPlayback();
    } 
    // SCENARIO: User IS logged in - Fade out and stop
    else {
      console.log('BackgroundMusic: User logged in, starting fade out.');
      if (fadeOutInterval) clearInterval(fadeOutInterval);
      
      fadeOutInterval = setInterval(() => {
        if (bgAudio.volume > 0.05) {
          bgAudio.volume -= 0.05;
        } else {
          bgAudio.pause();
          console.log('BackgroundMusic: Background audio stopped (logged in).');
          clearInterval(fadeOutInterval);
          fadeOutInterval = null;
          setAnalyser(null);
        }
      }, 100);
    }

    // Note: We deliberately don't return a cleanup that pauses audio here,
    // because we want the audio to survive React re-mounts if the user is still !user.
    // The fade-out logic above handles the intentional stopping.
  }, [user, setAnalyser]);

  return null;
}
