// ============================================================
// POST /api/plaid-remove
//
// Disconnects a bank account. Notifies Plaid that we're done
// with the item, then removes the item (and cascades to all
// associated accounts and transactions) from Supabase.
//
// Request body: { orgId, itemId }
// Response:     { success: true }
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
  if (!supaUrl || !supaKey) return res.status(500).json({ error: 'Supabase server config missing.' })

  const { orgId, itemId } = req.body || {}
  if (!orgId || !itemId) return res.status(400).json({ error: 'orgId and itemId are required.' })

  const plaid = `https://${env}.plaid.com`
  const supa  = { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}`, 'Content-Type': 'application/json' }

  try {
    // Fetch access_token for this item (verify it belongs to the org)
    const itemRes = await fetch(
      `${supaUrl}/rest/v1/plaid_items?org_id=eq.${orgId}&item_id=eq.${encodeURIComponent(itemId)}&select=access_token`,
      { headers: supa }
    )
    const items = await itemRes.json()
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(404).json({ error: 'Item not found for this org.' })
    }

    // Remove from Plaid (best effort — don't fail if Plaid returns an error)
    await fetch(`${plaid}/item/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, secret, access_token: items[0].access_token }),
    }).catch(() => {})

    // Remove from Supabase — cascade deletes plaid_accounts + plaid_transactions
    await fetch(
      `${supaUrl}/rest/v1/plaid_items?org_id=eq.${orgId}&item_id=eq.${encodeURIComponent(itemId)}`,
      { method: 'DELETE', headers: { ...supa, 'Prefer': 'return=minimal' } }
    )

    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
