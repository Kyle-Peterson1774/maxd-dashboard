// ============================================================
// POST /api/plaid-link
//
// Creates a Plaid Link token. The frontend uses this token to
// open the Plaid bank-login popup. The actual bank credentials
// never touch our servers — Plaid handles that entirely.
//
// Required Vercel env vars:
//   PLAID_CLIENT_ID   — from Plaid dashboard
//   PLAID_SECRET      — from Plaid dashboard (sandbox or production)
//   PLAID_ENV         — sandbox | development | production
//
// Request body: { userId }
// Response:     { link_token }
// ============================================================

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientId = process.env.PLAID_CLIENT_ID
  const secret   = process.env.PLAID_SECRET
  const env      = process.env.PLAID_ENV || 'sandbox'

  if (!clientId || !secret) {
    return res.status(500).json({
      error: 'Plaid not configured — add PLAID_CLIENT_ID and PLAID_SECRET to your Vercel environment variables.',
    })
  }

  const { userId } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'userId is required' })

  try {
    const plaidRes = await fetch(`https://${env}.plaid.com/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        client_name: 'MAXD Dashboard',
        country_codes: ['US'],
        language: 'en',
        user: { client_user_id: userId },
        products: ['transactions'],
      }),
    })

    const data = await plaidRes.json()

    if (!plaidRes.ok) {
      return res.status(502).json({
        error: data.error_message || `Plaid error: ${data.error_code || plaidRes.status}`,
      })
    }

    return res.status(200).json({ link_token: data.link_token })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
