// ============================================================
// PLAID FRONTEND HELPERS
//
// Handles the client-side Plaid Link flow and Supabase reads
// for connected accounts and transactions.
//
// Flow:
//   1. openPlaidLink()     → loads Plaid script, gets link token,
//                            opens bank-login popup
//   2. (user logs into bank inside Plaid popup)
//   3. onSuccess callback  → calls /api/plaid-exchange server-side
//   4. syncPlaidTransactions() → calls /api/plaid-sync
//   5. loadPlaidAccounts() / loadPlaidTransactions()
//                          → reads from Supabase directly
// ============================================================

// Load the Plaid Link JavaScript once and cache
let plaidScriptPromise = null
function loadPlaidScript() {
  if (plaidScriptPromise) return plaidScriptPromise
  plaidScriptPromise = new Promise((resolve, reject) => {
    if (window.Plaid) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    script.onload  = resolve
    script.onerror = () => reject(new Error('Failed to load Plaid Link script.'))
    document.head.appendChild(script)
  })
  return plaidScriptPromise
}

// ── openPlaidLink ─────────────────────────────────────────────────────────────
// Opens the Plaid bank-login popup. On success, automatically exchanges the
// public token server-side and returns the connected accounts.
//
// Options:
//   userId   — stable unique ID for this user (e.g. user email)
//   orgId    — org to attach accounts to
//   onSuccess(data) — called with { institution_name, accounts: [...] }
//   onExit(err)     — called on cancel or error

export async function openPlaidLink({ userId, orgId, onSuccess, onExit }) {
  try {
    // Get link token from our server
    const tokenRes = await fetch('/api/plaid-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(tokenData.error)

    // Load Plaid script
    await loadPlaidScript()

    // Open Plaid Link popup
    const handler = window.Plaid.create({
      token: tokenData.link_token,
      onSuccess: async (publicToken, metadata) => {
        try {
          const exchangeRes = await fetch('/api/plaid-exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicToken, orgId }),
          })
          const data = await exchangeRes.json()
          if (data.error) { onExit?.(data.error); return }
          onSuccess?.(data)
        } catch (err) {
          onExit?.(err.message)
        }
      },
      onExit: (err) => {
        if (err) onExit?.(err.display_message || err.error_message || 'Cancelled')
        else     onExit?.(null)
      },
    })
    handler.open()
  } catch (err) {
    onExit?.(err.message)
  }
}

// ── syncPlaidTransactions ─────────────────────────────────────────────────────
// Pulls new transactions for all linked accounts in the org.

export async function syncPlaidTransactions(orgId) {
  const res = await fetch('/api/plaid-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId }),
  })
  return await res.json()
}

// ── removePlaidItem ───────────────────────────────────────────────────────────
// Disconnects a bank institution from the org.

export async function removePlaidItem(orgId, itemId) {
  const res = await fetch('/api/plaid-remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId, itemId }),
  })
  return await res.json()
}

// ── loadPlaidAccounts ─────────────────────────────────────────────────────────
// Fetches all connected accounts for the org from Supabase.

export async function loadPlaidAccounts(orgId, accessToken) {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return []
  try {
    const res = await fetch(
      `${url}/rest/v1/plaid_accounts?org_id=eq.${orgId}&order=type.asc,name.asc`,
      { headers: { apikey: key, Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

// ── loadPlaidItems ────────────────────────────────────────────────────────────
// Fetches all Plaid items (bank connections) for the org.

export async function loadPlaidItems(orgId, accessToken) {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return []
  try {
    const res = await fetch(
      `${url}/rest/v1/plaid_items?org_id=eq.${orgId}&select=item_id,institution_name,created_at&order=created_at.asc`,
      { headers: { apikey: key, Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

// ── loadPlaidTransactions ─────────────────────────────────────────────────────
// Fetches recent transactions from Supabase.

export async function loadPlaidTransactions(orgId, accessToken, limit = 300) {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return []
  try {
    const res = await fetch(
      `${url}/rest/v1/plaid_transactions?org_id=eq.${orgId}&order=date.desc&limit=${limit}`,
      { headers: { apikey: key, Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

// ── updateTransactionCategory ─────────────────────────────────────────────────
// Updates the AI-assigned category for a single transaction.

export async function updateTransactionCategory(transactionId, category, accessToken) {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return
  await fetch(
    `${url}/rest/v1/plaid_transactions?transaction_id=eq.${encodeURIComponent(transactionId)}`,
    {
      method: 'PATCH',
      headers: { apikey: key, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ category_ai: category }),
    }
  )
}

// ── categorizeBatch ───────────────────────────────────────────────────────────
// Sends a batch of uncategorized transactions to Claude Haiku for fast
// automatic categorization. Returns a map of { index → category }.

export async function categorizeBatch(transactions) {
  if (!transactions.length) return {}
  try {
    const list = transactions
      .map((t, i) => `${i}: "${t.merchant_name || t.name}" $${Math.abs(t.amount).toFixed(2)}`)
      .join('\n')

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 600,
        systemPrompt: [
          'You categorize bank transactions for a DTC supplement brand.',
          'Return ONLY a valid JSON object mapping each index to one category.',
          'Categories: COGS, Marketing, Payroll, Fulfillment, Software, Office, Legal, Travel, Banking, Income, Refund, Transfer, Other',
        ].join(' '),
        prompt: `Categorize:\n${list}\n\nJSON only, e.g. {"0":"Marketing","1":"Software"}`,
      }),
    })
    const { content } = await res.json()
    const match = content?.match(/\{[\s\S]+\}/)
    return match ? JSON.parse(match[0]) : {}
  } catch {
    return {}
  }
}

// ── Display helpers ───────────────────────────────────────────────────────────

export function accountTypeLabel(type, subtype) {
  if (subtype === 'checking')     return 'Checking'
  if (subtype === 'savings')      return 'Savings'
  if (subtype === 'credit card')  return 'Credit Card'
  if (subtype === 'money market') return 'Money Market'
  if (subtype === 'cd')           return 'CD'
  if (type === 'credit')          return 'Credit'
  if (type === 'investment')      return 'Investment'
  if (type === 'loan')            return 'Loan'
  return subtype || type || 'Account'
}

export function accountAccent(type, subtype) {
  if (subtype === 'checking')    return 'var(--blue)'
  if (subtype === 'savings')     return 'var(--green)'
  if (type === 'credit')         return 'var(--amber)'
  if (type === 'investment')     return 'var(--purple)'
  return 'var(--navy)'
}
