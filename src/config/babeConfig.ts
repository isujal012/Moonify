/**
 * Configuration module for Babe Voice Assistant APIs.
 * The OpenAI key never reaches the browser: transcription goes through the
 * server-side /api/transcribe endpoint. Only a boolean flag is bundled.
 */

export const babeConfig = {
  hasOpenAI: __HAS_OPENAI__,
  hasPicovoice: !!import.meta.env.VITE_PICOVOICE_ACCESS_KEY,

  keys: {
    picovoice: import.meta.env.VITE_PICOVOICE_ACCESS_KEY || ''
  }
};
