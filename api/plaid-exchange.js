// ============================================================
// POST /api/plaid-exchange
//
// After the user completes Plaid Link, the frontend receives a
// short-lived public_token. This endpoint exchanges it for a
// permanent access_token, fetches the linked accounts, and
// stores everything in Supabase.
//
// Required Vercel env vars:
//   PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV
//   SUPABASE_URL              — same host as VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY — from Supabase → Settings → API
//
// Request body: { publicToken, orgId }
// Response:     { institution_name, accounts: [...] }
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
  const supaUrl  = process.env.SUPABASE_URL
  const supaKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!clientId || !secret) return res.status(500).json({ error: 'Plaid not configured.' })
  if (!supaUrl || !supaKey) return res.status(500).json({ error: 'Supabase server config missing — add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Vercel env vars.' })

  const { publicToken, orgId } = req.body || {}
  if (!publicToken || !orgId) return res.status(400).json({ error: 'publicToken and orgId are required.' })

  const plaid = `https://${env}.plaid.com`
  const supa  = { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

  try {
    // 1. Exchange public_token → access_token
    const exchangeRes = await fetch(`${plaid}/item/public_token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, secret, public_token: publicToken }),
    })
    const exchangeData = await exchangeRes.json()
    if (!exchangeData.access_token) {
      return res.status(502).json({ error: exchangeData.error_message || 'Token exchange failed.' })
    }
    const { access_token, item_id } = exchangeData

    // 2. Get institution info
    const itemRes = await fetch(`${plaid}/item/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, secret, access_token }),
    })
    const itemData = await itemRes.json()
    const institutionId = itemData.item?.institution_id

    let institutionName = 'Bank'
    if (institutionId) {
      const instRes = await fetch(`${plaid}/institutions/get_by_id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, secret, institution_id: institutionId, country_codes: ['US'] }),
      })
      const instData = await instRes.json()
      institutionName = instData.institution?.name || 'Bank'
    }

    // 3. Store plaid_item in Supabase
    await fetch(`${supaUrl}/rest/v1/plaid_items`, {
      method: 'POST',
      headers: { ...supa, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ org_id: orgId, item_id, access_token, institution_id: institutionId, institution_name: institutionName }),
    })

    // 4. Fetch accounts from Plaid
    const acctRes = await fetch(`${plaid}/accounts/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, secret, access_token }),
    })
    const acctData = await acctRes.json()
    const accounts = acctData.accounts || []

    // 5. Store accounts in Supabase
    for (const acct of accounts) {
      await fetch(`${supaUrl}/rest/v1/plaid_accounts`, {
        method: 'POST',
        headers: { ...supa, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          org_id: orgId,
          item_id,
          account_id: acct.account_id,
          name: acct.name,
          official_name: acct.official_name,
          type: acct.type,
          subtype: acct.subtype,
          mask: acct.mask,
          current_balance:   acct.balances.current,
          available_balance: acct.balances.available,
          currency_code:     acct.balances.iso_currency_code || 'USD',
          last_synced_at:    new Date().toISOString(),
        }),
      })
    }

    return res.status(200).json({
      success: true,
      institution_name: institutionName,
      accounts: accounts.map(a => ({
        account_id:       a.account_id,
        name:             a.name,
        official_name:    a.official_name,
        type:             a.type,
        subtype:          a.subtype,
        mask:             a.mask,
        current_balance:  a.balances.current,
        available_balance: a.balances.available,
        institution_name: institutionName,
      })),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
