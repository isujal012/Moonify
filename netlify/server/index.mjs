// Netlify Server: keeps the OpenAI API key server-side.
// The browser posts recorded audio here and this route forwards it to Whisper.

const getOpenAIKey = () => process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || ''

export default async function handler(request) {
  const url = new URL(request.url)

  if (url.pathname !== '/api/transcribe') {
    return new Response('Not found', { status: 404 })
  }
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const apiKey = getOpenAIKey()
  if (!apiKey) {
    return Response.json({ error: 'Transcription is not configured' }, { status: 503 })
  }

  let incoming
  try {
    incoming = await request.formData()
  } catch {
    return Response.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const file = incoming.get('file')
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'Missing audio file' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: 'Audio file too large' }, { status: 413 })
  }

  const form = new FormData()
  form.append('file', file, 'command.webm')
  form.append('model', 'whisper-1')
  form.append('language', 'en')

  try {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('Whisper error:', res.status, data?.error?.message)
      return Response.json({ error: 'Transcription failed' }, { status: 502 })
    }
    return Response.json({ text: data.text ?? '' })
  } catch (e) {
    console.error('Whisper request failed:', e)
    return Response.json({ error: 'Transcription failed' }, { status: 502 })
  }
}

export const config = {
  path: '/api/transcribe',
}
