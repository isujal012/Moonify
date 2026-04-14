import { atom } from 'jotai';

// Share audio frequency data globally
export const audioAnalyserAtom = atom<AnalyserNode | null>(null);
export const audioDataAtom = atom<Uint8Array>(new Uint8Array(0));

// Singleton AudioContext and Source map to prevent "already connected" errors
let globalContext: AudioContext | null = null;
const sourceNodes = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

// Logic to initialize analyser (will be called in Player and BackgroundMusic)
export const initAnalyser = (audio: HTMLAudioElement) => {
  if (!globalContext) {
    globalContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  // Ensure the context is running (browsers suspend it initially)
  if (globalContext.state === 'suspended') {
    globalContext.resume();
  }
  
  // Reuse existing source node if it exists for this audio element
  let source = sourceNodes.get(audio);
  if (!source) {
    source = globalContext.createMediaElementSource(audio);
    sourceNodes.set(audio, source);
  }

  const analyser = globalContext.createAnalyser();
  analyser.fftSize = 256;
  
  // Disconnect any previous connections from the source to avoid stacking analysers
  try {
    source.disconnect();
  } catch (e) {
    // Ignore if not connected
  }
  
  source.connect(analyser);
  analyser.connect(globalContext.destination);
  
  return analyser;
};
