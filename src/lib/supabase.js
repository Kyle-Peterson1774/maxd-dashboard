// ============================================
// SUPABASE SYNC LAYER
// Uses Supabase REST API directly (no SDK needed).
// Falls back to localStorage when not configured.
// ============================================

import { getCredentials } from './credentials.js'

function getConfig() {
  const creds = getCredentials('supabase')
  if (!creds?.projectUrl || !creds?.anonKey) return null
  const url = creds.projectUrl.replace(/\/$/, '')
  return { url, key: creds.anonKey }
}

function headers(cfg, extra = {}) {
  return {
    'apikey': cfg.key,
    'Authorization': `Bearer ${cfg.key}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

// Get a single key's value from Supabase
export async function sbGet(key) {
  const cfg = getConfig()
  if (!cfg) return null
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/app_data?key=eq.${encodeURIComponent(key)}&select=value&limit=1`,
      { headers: headers(cfg) }
    )
    if (!res.ok) return null
    const rows = await res.json()
    return rows.length > 0 ? rows[0].value : null
  } catch { return null }
}

// Upsert a key's value to Supabase (fire-and-forget friendly)
export async function sbSet(key, value) {
  const cfg = getConfig()
  if (!cfg) return false
  try {
    const res = await fetch(`${cfg.url}/rest/v1/app_data`, {
      method: 'POST',
      headers: headers(cfg, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
    })
    return res.ok
  } catch { return false }
}

// Pull ALL keys from Supabase into localStorage — call once on app start
export async function syncAllFromCloud() {
  const cfg = getConfig()
  if (!cfg) return false
  try {
    const res = await fetch(`${cfg.url}/rest/v1/app_data?select=key,value`, {
      headers: headers(cfg),
    })
    if (!res.ok) return false
    const rows = await res.json()
    rows.forEach(row => {
      try { localStorage.setItem(row.key, JSON.stringify(row.value)) } catch {}
    })
    return rows.length > 0
  } catch { return false }
}

export function isSupabaseConfigured() {
  return getConfig() !== null
}
