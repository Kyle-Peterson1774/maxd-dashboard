// ============================================================
// SUPABASE CLIENT
//
// Config is read from Vite environment variables baked in at
// build time. Set these in Vercel → Settings → Environment
// Variables (and locally in .env.local):
//
//   VITE_SUPABASE_URL    = https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY = eyJ...
//
// The anon key is safe to expose to the browser — Supabase
// designed it this way. RLS policies + user JWTs protect data.
//
// All data requests include the user's JWT in Authorization so
// RLS can identify the user and restrict data to their org.
// ============================================================

function getConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return { url: url.replace(/\/$/, ''), key }
}

function headers(cfg, accessToken, extra = {}) {
  return {
    'apikey': cfg.key,
    'Authorization': `Bearer ${accessToken || cfg.key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...extra,
  }
}

export function isSupabaseConfigured() {
  return getConfig() !== null
}


// ── Auth ──────────────────────────────────────────────────────────────────────

export async function supabaseSignIn(email, password) {
  const cfg = getConfig()
  if (!cfg) return { error: 'Platform not configured — contact support.' }
  try {
    const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': cfg.key },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error_description || data.msg || 'Sign in failed. Check your email and password.' }
    return { data }
  } catch { return { error: 'Network error — check your connection.' } }
}

export async function supabaseSignUp(email, password, name) {
  const cfg = getConfig()
  if (!cfg) return { error: 'Platform not configured — contact support.' }
  try {
    const res = await fetch(`${cfg.url}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': cfg.key },
      body: JSON.stringify({ email, password, data: { name } }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error_description || data.msg || 'Sign up failed.' }
    return { data }
  } catch { return { error: 'Network error — check your connection.' } }
}

export async function supabaseRequestPasswordReset(email) {
  const cfg = getConfig()
  if (!cfg) return { error: 'Platform not configured — contact support.' }
  try {
    const redirectTo = window.location.origin + '/'
    const res = await fetch(`${cfg.url}/auth/v1/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': cfg.key },
      body: JSON.stringify({ email, redirect_to: redirectTo }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { error: data.error_description || data.msg || 'Failed to send reset email.' }
    }
    return { data: true }
  } catch { return { error: 'Network error — check your connection.' } }
}

export async function supabaseUpdatePassword(accessToken, newPassword) {
  const cfg = getConfig()
  if (!cfg) return { error: 'Platform not configured — contact support.' }
  try {
    const res = await fetch(`${cfg.url}/auth/v1/user`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'apikey': cfg.key, 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ password: newPassword }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data.error_description || data.msg || 'Failed to update password.' }
    return { data }
  } catch { return { error: 'Network error — check your connection.' } }
}

export async function supabaseSignOut(accessToken) {
  const cfg = getConfig()
  if (!cfg || !accessToken) return
  fetch(`${cfg.url}/auth/v1/logout`, {
    method: 'POST',
    headers: { 'apikey': cfg.key, 'Authorization': `Bearer ${accessToken}` },
  }).catch(() => {})
}


// ── Organizations ─────────────────────────────────────────────────────────────

export async function createOrg(name, accessToken) {
  const cfg = getConfig()
  if (!cfg) return { error: 'Platform not configured.' }
  try {
    const res = await fetch(`${cfg.url}/rest/v1/organizations`, {
      method: 'POST',
      headers: headers(cfg, accessToken),
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (!res.ok) return { error: (data.message || data.hint || 'Failed to create organization.') }
    return { data: Array.isArray(data) ? data[0] : data }
  } catch (e) { return { error: e.message } }
}

export async function getOrgMembership(accessToken) {
  const cfg = getConfig()
  if (!cfg) return null
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/org_members?select=*&status=eq.active&limit=1`,
      { headers: headers(cfg, accessToken) }
    )
    if (!res.ok) return null
    const rows = await res.json()
    return rows.length > 0 ? rows[0] : null
  } catch { return null }
}


// ── Team Members ──────────────────────────────────────────────────────────────

export async function getOrgMembers(orgId, accessToken) {
  const cfg = getConfig()
  if (!cfg) return []
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/org_members?org_id=eq.${orgId}&order=created_at.asc`,
      { headers: headers(cfg, accessToken) }
    )
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export async function upsertOrgMember(orgId, member, accessToken) {
  const cfg = getConfig()
  if (!cfg) return { error: 'Platform not configured.' }
  try {
    const res = await fetch(`${cfg.url}/rest/v1/org_members`, {
      method: 'POST',
      headers: headers(cfg, accessToken, { 'Prefer': 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify({ org_id: orgId, ...member }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.message || data.hint || 'Failed to save member.' }
    return { data: Array.isArray(data) ? data[0] : data }
  } catch (e) { return { error: e.message } }
}

export async function deleteOrgMember(orgId, memberEmail, accessToken) {
  const cfg = getConfig()
  if (!cfg) return false
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/org_members?org_id=eq.${orgId}&email=eq.${encodeURIComponent(memberEmail)}`,
      { method: 'DELETE', headers: headers(cfg, accessToken, { 'Prefer': 'return=minimal' }) }
    )
    return res.ok
  } catch { return false }
}


// ── Credentials ───────────────────────────────────────────────────────────────

export async function fetchOrgCredentials(orgId, accessToken) {
  const cfg = getConfig()
  if (!cfg) return {}
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/org_credentials?org_id=eq.${orgId}&select=service,data`,
      { headers: headers(cfg, accessToken) }
    )
    if (!res.ok) return {}
    const rows = await res.json()
    return Object.fromEntries(rows.map(r => [r.service, r.data]))
  } catch { return {} }
}

export async function saveOrgCredential(orgId, service, data, accessToken) {
  const cfg = getConfig()
  if (!cfg) return false
  try {
    const res = await fetch(`${cfg.url}/rest/v1/org_credentials`, {
      method: 'POST',
      headers: headers(cfg, accessToken, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ org_id: orgId, service, data, updated_at: new Date().toISOString() }),
    })
    return res.ok
  } catch { return false }
}

export async function deleteOrgCredential(orgId, service, accessToken) {
  const cfg = getConfig()
  if (!cfg) return false
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/org_credentials?org_id=eq.${orgId}&service=eq.${encodeURIComponent(service)}`,
      { method: 'DELETE', headers: headers(cfg, accessToken, { 'Prefer': 'return=minimal' }) }
    )
    return res.ok
  } catch { return false }
}


// ── App Data ──────────────────────────────────────────────────────────────────

export async function getOrgData(orgId, key, accessToken, fallback = null) {
  const cfg = getConfig()
  if (!cfg) return fallback
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/org_data?org_id=eq.${orgId}&key=eq.${encodeURIComponent(key)}&select=value&limit=1`,
      { headers: headers(cfg, accessToken) }
    )
    if (!res.ok) return fallback
    const rows = await res.json()
    return rows.length > 0 ? rows[0].value : fallback
  } catch { return fallback }
}

export async function setOrgData(orgId, key, value, accessToken) {
  const cfg = getConfig()
  if (!cfg) return false
  try {
    const res = await fetch(`${cfg.url}/rest/v1/org_data`, {
      method: 'POST',
      headers: headers(cfg, accessToken, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ org_id: orgId, key, value, updated_at: new Date().toISOString() }),
    })
    return res.ok
  } catch { return false }
}

export async function getAllOrgData(orgId, accessToken) {
  const cfg = getConfig()
  if (!cfg) return {}
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/org_data?org_id=eq.${orgId}&select=key,value`,
      { headers: headers(cfg, accessToken) }
    )
    if (!res.ok) return {}
    const rows = await res.json()
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  } catch { return {} }
}
