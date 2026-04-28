// ============================================================
// SUPABASE CLIENT
//
// Reads the Supabase project URL and anon key directly from
// localStorage (these are public values — Supabase is designed
// for the anon key to be exposed to the client; RLS policies
// protect the actual data).
//
// All data requests use the user's JWT (access token) in the
// Authorization header so RLS policies can identify the user
// and restrict data to their organization.
// ============================================================

const SUPABASE_CRED_KEY = 'maxd_cred_supabase'

function getConfig() {
  try {
    const raw = localStorage.getItem(SUPABASE_CRED_KEY)
    if (!raw) return null
    const { projectUrl, anonKey } = JSON.parse(raw)
    if (!projectUrl || !anonKey) return null
    return { url: projectUrl.replace(/\/$/, ''), key: anonKey }
  } catch { return null }
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
  if (!cfg) return { error: 'Supabase not configured' }
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
  if (!cfg) return { error: 'Supabase not configured' }
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

export async function supabaseSignOut(accessToken) {
  const cfg = getConfig()
  if (!cfg || !accessToken) return
  fetch(`${cfg.url}/auth/v1/logout`, {
    method: 'POST',
    headers: { 'apikey': cfg.key, 'Authorization': `Bearer ${accessToken}` },
  }).catch(() => {})
}


// ── Organizations ─────────────────────────────────────────────────────────────

// Create a new organization (called on first-ever signup)
export async function createOrg(name, accessToken) {
  const cfg = getConfig()
  if (!cfg) return { error: 'Supabase not configured' }
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

// Load the current user's org membership (org_id, role, pages, status)
export async function getOrgMembership(accessToken) {
  const cfg = getConfig()
  if (!cfg) return null
  try {
    // No join to organizations — avoids RLS cross-table issues
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

// Invite a new member or update an existing one (upsert by org_id + email)
export async function upsertOrgMember(orgId, member, accessToken) {
  const cfg = getConfig()
  if (!cfg) return { error: 'Supabase not configured' }
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

// Fetch all integration credentials for the org (returns { shopify: {...}, klaviyo: {...}, ... })
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

// Save one integration's credentials (upsert by org_id + service)
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

// Remove one integration's credentials
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
