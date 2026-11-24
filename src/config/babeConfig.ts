/**
 * Configuration module for Babe Voice Assistant APIs.
 *
 * The OpenAI key is NOT available in the browser. Whisper transcription is
 * proxied through the server route at /api/transcribe, which reads the key
 * from server-side environment variables.
 */

export const babeConfig = {
  // Whisper runs through the server proxy; set VITE_ENABLE_WHISPER=false to disable it.
  hasOpenAI: import.meta.env.VITE_ENABLE_WHISPER !== 'false',
  hasPicovoice: !!import.meta.env.VITE_PICOVOICE_ACCESS_KEY,

  transcribeEndpoint: '/api/transcribe',

  keys: {
    // Picovoice runs in the browser and requires a client-side access key.
    picovoice: import.meta.env.VITE_PICOVOICE_ACCESS_KEY || ''
  }
};
