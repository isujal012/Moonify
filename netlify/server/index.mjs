// Server-side proxy for OpenAI Whisper transcription.
// The OpenAI key stays on the server and never reaches the browser bundle.

const OPENAI_URL = 'https://api.openai.com/v1/audio/transcriptions'
const MAX_AUDIO_BYTES = 5 * 1024 * 1024

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

export default async function handler(request) {
  const url = new URL(request.url)

  if (url.pathname !== '/api/transcribe') {
    return json({ error: 'Not found' }, 404)
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    return json({ error: 'Transcription is not configured' }, 503)
  }

  let incoming
  try {
    incoming = await request.formData()
  } catch {
    return json({ error: 'Expected multipart form data' }, 400)
  }

  const file = incoming.get('file')
  if (!file || typeof file === 'string') {
    return json({ error: 'Missing audio file' }, 400)
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return json({ error: 'Audio file too large' }, 413)
  }

  const form = new FormData()
  form.append('file', file, file.name || 'command.webm')
  form.append('model', 'whisper-1')
  form.append('language', 'en')

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('OpenAI transcription error', res.status, data?.error?.message)
      return json({ error: 'Transcription failed' }, 502)
    }
    return json({ text: data.text ?? '' })
  } catch (err) {
    console.error('OpenAI request failed', err)
    return json({ error: 'Transcription failed' }, 502)
  }
}

export const config = {
  path: '/api/*',
}
