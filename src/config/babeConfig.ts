/**
 * Configuration module for Babe Voice Assistant APIs
 * These keys should be securely managed and stored in your .env file
 */

export const babeConfig = {
  // Check if keys are available in the environment variables
  hasOpenAI: !!import.meta.env.VITE_OPENAI_API_KEY,
  hasPicovoice: !!import.meta.env.VITE_PICOVOICE_ACCESS_KEY,

  keys: {
    openai: import.meta.env.VITE_OPENAI_API_KEY || '',
    picovoice: import.meta.env.VITE_PICOVOICE_ACCESS_KEY || ''
  }
};
