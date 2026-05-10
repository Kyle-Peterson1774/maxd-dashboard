// ============================================================
// POST /api/plaid-sync
//
// Fetches new/updated transactions for all Plaid items linked
// to the org. Uses cursor-based sync (/transactions/sync) so
// we only pull what's new since the last call. Also refreshes
// account balances.
//
// Request body: { orgId }
// Response:     { synced, accounts }
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

  const { orgId } = req.body || {}
  if (!orgId) return res.status(400).json({ error: 'orgId is required.' })

  const plaid = `https://${env}.plaid.com`
  const supa  = { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

  try {
    // Load all linked items for this org
    const itemsRes = await fetch(
      `${supaUrl}/rest/v1/plaid_items?org_id=eq.${orgId}&select=item_id,access_token,institution_name,cursor`,
      { headers: supa }
    )
    const items = await itemsRes.json()
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(200).json({ synced: 0, accounts: [] })
    }

    let totalSynced = 0
    const allAccounts = []

    for (const item of items) {
      // ── Sync transactions (cursor-based) ──────────────────────────────────
      let cursor = item.cursor || null
      let added  = []
      let hasMore = true

      while (hasMore) {
        const body = { client_id: clientId, secret, access_token: item.access_token }
        if (cursor) body.cursor = cursor

        const syncRes = await fetch(`${plaid}/transactions/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const syncData = await syncRes.json()

        if (syncData.error_code) {
          // Item may need re-authentication — skip and continue with other items
          console.error('Plaid sync error:', syncData.error_code, syncData.error_message)
          hasMore = false
          break
        }

        added  = [...added, ...(syncData.added || [])]
        cursor = syncData.next_cursor
        hasMore = syncData.has_more || false
      }

      // Save updated cursor
      if (cursor) {
        await fetch(`${supaUrl}/rest/v1/plaid_items?item_id=eq.${encodeURIComponent(item.item_id)}`, {
          method: 'PATCH',
          headers: { ...supa, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ cursor }),
        })
      }

      // ── Refresh account balances ───────────────────────────────────────────
      const balRes = await fetch(`${plaid}/accounts/balance/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, secret, access_token: item.access_token }),
      })
      const balData = await balRes.json()

      for (const acct of (balData.accounts || [])) {
        await fetch(`${supaUrl}/rest/v1/plaid_accounts?account_id=eq.${encodeURIComponent(acct.account_id)}`, {
          method: 'PATCH',
          headers: { ...supa, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            current_balance:   acct.balances.current,
            available_balance: acct.balances.available,
            last_synced_at:    new Date().toISOString(),
          }),
        })
        allAccounts.push({ ...acct, institution_name: item.institution_name })
      }

      // ── Insert new transactions ────────────────────────────────────────────
      for (const tx of added) {
        const category = tx.personal_finance_category
          ? [tx.personal_finance_category.primary, tx.personal_finance_category.detailed].filter(Boolean)
          : (tx.category || [])

        await fetch(`${supaUrl}/rest/v1/plaid_transactions`, {
          method: 'POST',
          headers: { ...supa, 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify({
            org_id:         orgId,
            account_id:     tx.account_id,
            transaction_id: tx.transaction_id,
            date:           tx.date,
            name:           tx.name,
            merchant_name:  tx.merchant_name || null,
            amount:         tx.amount,
            plaid_category: category,
            pending:        tx.pending,
          }),
        })
        totalSynced++
      }
    }

    return res.status(200).json({ synced: totalSynced, accounts: allAccounts })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
