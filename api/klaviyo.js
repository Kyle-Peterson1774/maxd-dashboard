// ─── Klaviyo API proxy ─────────────────────────────────────────────────────────
// Klaviyo's private API requires server-side requests (no CORS for browsers).
// This edge function proxies requests using the key the client passes in.
// ──────────────────────────────────────────────────────────────────────────────
export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let body
  try { body = await req.json() } catch { return new Response('Invalid JSON', { status: 400 }) }

  const { apiKey, endpoint } = body
  if (!apiKey) return new Response(JSON.stringify({ error: 'Missing apiKey' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  if (!endpoint) return new Response(JSON.stringify({ error: 'Missing endpoint' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  // Prevent SSRF — only allow Klaviyo API hostname
  if (!endpoint.startsWith('campaigns') && !endpoint.startsWith('metrics') && !endpoint.startsWith('campaign-send-jobs')) {
    return new Response(JSON.stringify({ error: 'Endpoint not allowed' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }

  const url = `https://a.klaviyo.com/api/${endpoint}`
  try {
    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'revision': '2024-06-15',
        'Accept': 'application/json',
      },
    })
    const data = await upstream.text()
    return new Response(data, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
