// Server-side proxy for OpenAI Whisper transcription.
// Keeps the OpenAI API key on the server so it never ends up in the client bundle.

const OPENAI_BASE_URL = 'https://api.openai.com/v1'

function getOpenAIConfig() {
  // Prefer the project's own key (OPENAI_SECRET_KEY, or the legacy VITE_OPENAI_API_KEY name).
  const ownKey = process.env.OPENAI_SECRET_KEY || process.env.VITE_OPENAI_API_KEY
  if (ownKey) return { apiKey: ownKey, baseURL: OPENAI_BASE_URL }
  // Fall back to credentials injected by Netlify AI Gateway, if any.
  if (process.env.OPENAI_API_KEY) {
    return { apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL || OPENAI_BASE_URL }
  }
  return null
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export default async (request) => {
  const { pathname } = new URL(request.url)

  if (pathname !== '/api/transcribe') return json({ error: 'Not found' }, 404)

  const config = getOpenAIConfig()

  if (request.method === 'GET') return json({ enabled: Boolean(config) })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!config) return json({ error: 'Transcription is not configured' }, 503)

  let incoming
  try {
    incoming = await request.formData()
  } catch {
    return json({ error: 'Expected multipart form data' }, 400)
  }

  const file = incoming.get('file')
  if (!file || typeof file === 'string') return json({ error: 'Missing audio file' }, 400)
  if (file.size > 5 * 1024 * 1024) return json({ error: 'Audio file too large' }, 413)

  const form = new FormData()
  form.append('file', file, 'command.webm')
  form.append('model', 'whisper-1')
  form.append('language', 'en')

  try {
    const res = await fetch(`${config.baseURL}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return json({ error: data?.error?.message || 'Transcription failed' }, res.status)
    return json({ text: data.text || '' })
  } catch {
    return json({ error: 'Could not reach transcription service' }, 502)
  }
}

export const config = {
  path: '/api/transcribe',
}
