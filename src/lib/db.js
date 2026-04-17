// ============================================
// DATABASE ABSTRACTION LAYER
// Transparent get/set that uses Supabase when
// configured, localStorage otherwise.
// localStorage is always kept as a fast cache.
// ============================================

import { sbGet, sbSet } from './supabase.js'

// Synchronous read from localStorage (for useState initializers)
export function dbGetSync(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

// Async read — tries Supabase first, falls back to localStorage
export async function dbGet(key, fallback = null) {
  const cloud = await sbGet(key)
  if (cloud !== null) {
    // Update local cache with fresh cloud data
    try { localStorage.setItem(key, JSON.stringify(cloud)) } catch {}
    return cloud
  }
  return dbGetSync(key, fallback)
}

// Write — saves to localStorage immediately, syncs to Supabase in background
export function dbSet(key, value) {
  // Synchronous local write (instant)
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
  // Background cloud sync (non-blocking)
  sbSet(key, value).catch(() => {})
}

export { syncAllFromCloud, isSupabaseConfigured } from './supabase.js'
