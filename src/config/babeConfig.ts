/**
 * Configuration module for Babe Voice Assistant APIs
 * Picovoice key is client-side; OpenAI Whisper runs server-side via /api/transcribe
 */

export const babeConfig = {
  // Whisper transcription is handled server-side via /api/transcribe (Netlify Function)
  hasOpenAI: true,
  hasPicovoice: !!import.meta.env.VITE_PICOVOICE_ACCESS_KEY,

  keys: {
    picovoice: import.meta.env.VITE_PICOVOICE_ACCESS_KEY || ''
  }
};
