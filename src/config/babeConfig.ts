/**
 * Configuration module for Babe Voice Assistant APIs.
 *
 * The OpenAI key is NOT exposed to the browser. Whisper transcription is
 * proxied through the server endpoint at /api/transcribe, which holds the key.
 */

export const TRANSCRIBE_ENDPOINT = '/api/transcribe';

export const babeConfig = {
  // Set at runtime once the server confirms transcription is available.
  hasOpenAI: false,
  hasPicovoice: !!import.meta.env.VITE_PICOVOICE_ACCESS_KEY,

  keys: {
    picovoice: import.meta.env.VITE_PICOVOICE_ACCESS_KEY || ''
  }
};

// Ask the server whether Whisper transcription is configured.
fetch(TRANSCRIBE_ENDPOINT)
  .then((res) => (res.ok ? res.json() : { enabled: false }))
  .then((data: { enabled?: boolean }) => { babeConfig.hasOpenAI = Boolean(data?.enabled); })
  .catch(() => { babeConfig.hasOpenAI = false; });
