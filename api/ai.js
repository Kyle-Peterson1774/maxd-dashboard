// ============================================================
// AI PROXY — /api/ai
//
// Server-side Anthropic API proxy. The API key never reaches
// the browser. Set ANTHROPIC_API_KEY in Vercel environment
// variables (Settings → Environment Variables).
//
// Request body: { prompt, systemPrompt?, model?, maxTokens? }
// Response:     { content: string }
// ============================================================

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'AI not configured — set ANTHROPIC_API_KEY in Vercel environment variables.' })
  }

  const {
    prompt,
    systemPrompt,
    model = 'claude-haiku-4-5-20251001',
    maxTokens = 1024,
  } = req.body || {}

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' })
  }

  try {
    const body = {
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }
    if (systemPrompt) body.system = systemPrompt

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || `Anthropic API error ${response.status}`,
      })
    }

    return res.status(200).json({ content: data.content?.[0]?.text || '' })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
