// ============================================================
// DATABASE ABSTRACTION LAYER
//
// All reads/writes are scoped to the current user's org.
// Data is stored in Supabase org_data and cached locally
// in sessionStorage (org-scoped keys) for fast synchronous
// reads (used in useState initializers across the app).
//
// initDb(orgId, accessToken) — called by auth.jsx on login.
// dbGetSync(key, fallback)   — synchronous, from session cache.
// dbGet(key, fallback)       — async, fetches from Supabase.
// dbSet(key, value)          — writes to cache + Supabase.
// syncAllFromCloud()         — bulk pull all org data on startup.
// ============================================================

import { getOrgData, setOrgData, getAllOrgData } from './supabase.js'

// ── Module-level session state ────────────────────────────────────────────────

let _orgId = null
let _accessToken = null

// Called by auth.jsx immediately after login
export function initDb(orgId, accessToken) {
  _orgId = orgId
  _accessToken = accessToken
}

// ── Session cache helpers ─────────────────────────────────────────────────────
// Uses sessionStorage (cleared when tab closes) with org-scoped keys so
// multiple orgs can never bleed data into each other, even on shared devices.

function cacheKey(key) {
  return _orgId ? `org:${_orgId}:${key}` : key
}

function cacheGet(key, fallback = null) {
  try {
    const raw = sessionStorage.getItem(cacheKey(key))
    return raw !== null ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function cacheSet(key, value) {
  try { sessionStorage.setItem(cacheKey(key), JSON.stringify(value)) } catch {}
}


// ── Public API ────────────────────────────────────────────────────────────────

// Synchronous read from the session cache — safe to use in useState initializers
export function dbGetSync(key, fallback = null) {
  return cacheGet(key, fallback)
}

// Async read — fetches from Supabase and updates the local cache
export async function dbGet(key, fallback = null) {
  if (!_orgId) return cacheGet(key, fallback)
  const cloud = await getOrgData(_orgId, key, _accessToken, null)
  if (cloud !== null) {
    cacheSet(key, cloud)
    return cloud
  }
  return cacheGet(key, fallback)
}

// Write — updates session cache immediately, syncs to Supabase in the background
export function dbSet(key, value) {
  cacheSet(key, value)
  if (_orgId && _accessToken) {
    setOrgData(_orgId, key, value, _accessToken).catch(() => {})
  }
}

// Pull all org data from Supabase into the session cache — call once on app start
export async function syncAllFromCloud() {
  if (!_orgId || !_accessToken) return false
  try {
    const all = await getAllOrgData(_orgId, _accessToken)
    Object.entries(all).forEach(([key, value]) => cacheSet(key, value))
    return true
  } catch { return false }
}

export { isSupabaseConfigured } from './supabase.js'
