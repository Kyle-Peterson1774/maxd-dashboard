// ============================================================
// AI STREAM — /api/ai-stream
//
// Server-sent events streaming proxy for Anthropic.
// Uses Edge runtime so responses stream token-by-token.
// API key never reaches the browser.
//
// Request body: { messages, systemPrompt?, model?, maxTokens? }
// Response:     text/event-stream (Anthropic SSE passthrough)
// ============================================================

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'AI not configured — set ANTHROPIC_API_KEY in Vercel environment variables.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const {
    messages,
    systemPrompt,
    model      = 'claude-haiku-4-5-20251001',
    maxTokens  = 1500,
  } = body

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: 'messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const requestBody = {
    model,
    max_tokens: maxTokens,
    stream:     true,
    messages,
  }
  if (systemPrompt) requestBody.system = systemPrompt

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  })

  if (!upstream.ok) {
    const errData = await upstream.json().catch(() => ({}))
    return new Response(
      JSON.stringify({ error: errData?.error?.message || `Anthropic error ${upstream.status}` }),
      { status: upstream.status, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Pass the Anthropic SSE stream straight through to the client
  return new Response(upstream.body, {
    status:  200,
    headers: {
      'Content-Type':    'text/event-stream',
      'Cache-Control':   'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
