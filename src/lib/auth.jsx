import { createContext, useContext, useState, useEffect } from 'react'
import {
  supabaseSignIn,
  supabaseSignUp,
  supabaseSignOut,
  supabaseRequestPasswordReset,
  supabaseUpdatePassword,
  isSupabaseConfigured,
  createOrg,
  getOrgMembership,
  fetchOrgCredentials,
} from './supabase.js'
import { initCredentials, clearCredentialStore } from './credentials.js'
import { initDb } from './db.js'

// ============================================================
// AUTH
//
// Login flow:
//   1. User enters email + password
//   2. Supabase Auth validates credentials → returns JWT
//   3. Load org membership from org_members using the JWT
//   4. If no org exists yet (first-ever signup), create one
//   5. Load integration credentials from org_credentials
//   6. Hydrate credentials store and db layer with org context
//   7. Set user context: { email, name, role, pages, orgId, accessToken }
//
// hasAccess(page) checks user.pages[] — set by the admin and
// stored per-member in org_members, not hardcoded in the app.
//
// Fallback: if Supabase is not yet configured, a simple local
// auth is used (email checked against an approved list in
// localStorage). This lets the owner set up Supabase first.
// ============================================================

const AuthContext = createContext(null)

const SESSION_KEY   = 'maxd_session'
const APPROVED_KEY  = 'maxd_approved_users'
const OWNER_EMAIL   = 'kyle@trymaxd.com'

// Default page sets by role — used when creating a new member
// and when falling back to local auth
export const PERMISSIONS = {
  admin:     ['dashboard','social','scripts','content','launches','ads','products','analytics','sales','marketing','finance','operations','ai','queue','settings'],
  content:   ['dashboard','social','scripts','content','analytics','ai','queue'],
  marketing: ['dashboard','social','marketing','ads','analytics','sales','queue'],
  ops:       ['dashboard','operations','sales','launches','queue'],
}

export const ROLE_LABELS = {
  admin:     'Admin — full access',
  content:   'Content — scripts, content, social, AI',
  marketing: 'Marketing — campaigns, ads, analytics',
  ops:       'Operations — inventory, orders, launches',
}


// ── Local approved-user list (fallback when Supabase not configured) ──────────

export function getApprovedUsers() {
  try {
    const raw = localStorage.getItem(APPROVED_KEY)
    const stored = raw ? JSON.parse(raw) : []
    const hasOwner = stored.some(u => u.email.toLowerCase() === OWNER_EMAIL.toLowerCase())
    if (!hasOwner) return [{ email: OWNER_EMAIL, role: 'admin', name: 'Kyle Peterson' }, ...stored]
    return stored
  } catch { return [{ email: OWNER_EMAIL, role: 'admin', name: 'Kyle Peterson' }] }
}

export function saveApprovedUsers(list) {
  localStorage.setItem(APPROVED_KEY, JSON.stringify(list))
}

function isApproved(email) {
  return getApprovedUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null
}


// ── Login Page ────────────────────────────────────────────────────────────────

function parseRecoveryToken() {
  try {
    const hash = window.location.hash
    if (!hash.includes('type=recovery') || !hash.includes('access_token=')) return null
    return new URLSearchParams(hash.substring(1)).get('access_token')
  } catch { return null }
}

const SUPABASE_CRED_KEY = 'maxd_cred_supabase'

function saveSupabaseConfig(projectUrl, anonKey) {
  localStorage.setItem(SUPABASE_CRED_KEY, JSON.stringify({ projectUrl: projectUrl.trim(), anonKey: anonKey.trim() }))
}

function LoginPage({ onLogin }) {
  const recoveryToken               = parseRecoveryToken()
  const [mode, setMode]             = useState(recoveryToken ? 'recover' : 'login')
  const [email, setEmail]           = useState('')
  const [password, setPass]         = useState('')
  const [newPassword, setNewPass]   = useState('')
  const [confirmPass, setConfirm]   = useState('')
  const [name, setName]             = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [successMsg, setSuccess]    = useState('')
  const [hasSupabase, setHasSupabase] = useState(isSupabaseConfigured())

  // Cloud setup state
  const [projectUrl, setProjectUrl] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SUPABASE_CRED_KEY) || '{}').projectUrl || '' } catch { return '' }
  })
  const [anonKey, setAnonKey] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SUPABASE_CRED_KEY) || '{}').anonKey || '' } catch { return '' }
  })

  const handleCloudSave = () => {
    if (!projectUrl.trim() || !anonKey.trim()) { setError('Both fields are required'); return }
    if (!projectUrl.includes('supabase.co') && !projectUrl.startsWith('http')) { setError('Project URL should be your Supabase project URL (e.g. https://xxx.supabase.co)'); return }
    saveSupabaseConfig(projectUrl, anonKey)
    setHasSupabase(true)
    setError(''); setSuccess('Cloud connected! You can now sign in.')
    setMode('login')
  }

  const handleForgot = async () => {
    if (!email) { setError('Enter your email address'); return }
    setLoading(true); setError(''); setSuccess('')
    const result = await supabaseRequestPasswordReset(email)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setSuccess('Check your email — a password reset link is on its way.')
  }

  const handleRecover = async () => {
    if (!newPassword) { setError('Enter a new password'); return }
    if (newPassword !== confirmPass) { setError('Passwords do not match'); return }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const result = await supabaseUpdatePassword(recoveryToken, newPassword)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setSuccess('Password updated! You can now sign in.')
    setMode('login')
  }

  const handle = async () => {
    if (!email || !password) { setError('Email and password required'); return }
    setLoading(true); setError(''); setSuccess('')

    // ── Fallback: no Supabase configured ──
    if (!hasSupabase) {
      const approved = isApproved(email)
      if (!approved) {
        setError('Your email is not on the access list. Contact your admin to get added.')
        setLoading(false); return
      }
      const pages = PERMISSIONS[approved.role] || PERMISSIONS.content
      onLogin({
        email,
        name: approved.name || name || email.split('@')[0],
        role: approved.role,
        pages,
        orgId: null,
        accessToken: null,
        local: true,
      })
      setLoading(false); return
    }

    // ── Sign Up ──
    if (mode === 'signup') {
      const result = await supabaseSignUp(email, password, name)
      setLoading(false)
      if (result.error) { setError(result.error); return }

      const session = result.data
      const accessToken = session?.access_token || session?.session?.access_token

      if (!accessToken) {
        setError('Account created — check your email to confirm, then sign in.')
        setMode('login'); return
      }

      await _finalizeLogin(email, name, accessToken, true)
      return
    }

    // ── Sign In ──
    const result = await supabaseSignIn(email, password)
    setLoading(false)
    if (result.error) { setError(result.error); return }

    const session = result.data
    const accessToken = session?.access_token
    const userMeta    = session?.user?.user_metadata || {}

    await _finalizeLogin(email, userMeta.name || name, accessToken, false)

    async function _finalizeLogin(email, displayName, accessToken, isNewSignup) {
      // Load org membership using the user's JWT
      let membership = await getOrgMembership(accessToken)

      // First-ever signup: no org exists yet — create one
      if (!membership && isNewSignup) {
        const orgName = (displayName || email.split('@')[0]) + "'s Workspace"
        const orgResult = await createOrg(orgName, accessToken)
        if (orgResult.error) {
          setError('Account created but could not set up your workspace: ' + orgResult.error)
          setLoading(false); return
        }
        // Re-load membership (trigger auto-added the user as admin)
        membership = await getOrgMembership(accessToken)
      }

      // Still no membership — not invited, not a new org owner
      if (!membership) {
        setError('Your account is not linked to any workspace. Ask your admin to invite you.')
        setLoading(false); return
      }

      const orgId     = membership.org_id
      const role      = membership.role || 'content'
      const pages     = membership.pages?.length ? membership.pages : (PERMISSIONS[role] || PERMISSIONS.content)
      const finalName = displayName || membership.name || email.split('@')[0]
      // Admin role always gets manager access; otherwise check the can_manage flag
      const canManage = role === 'admin' || !!membership.can_manage

      // Load integration credentials into memory
      const cloudCreds = await fetchOrgCredentials(orgId, accessToken)
      initCredentials(orgId, accessToken, cloudCreds)
      initDb(orgId, accessToken)

      onLogin({
        email,
        name:        finalName,
        role,
        pages,
        canManage,
        orgId,
        orgName:     membership.organizations?.name || 'My Workspace',
        accessToken,
        initials:    finalName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      })
    }
  }

  const inp = {
    display: 'block', width: '100%', marginTop: 4,
    padding: '0.6rem 0.75rem',
    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, color: '#fff', fontSize: 14,
    boxSizing: 'border-box', outline: 'none',
  }

  const logoBlock = (
    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <svg width="32" height="24" viewBox="0 0 24 18" fill="none">
          <path d="M0 18 L8 2 L12 9 L14 6 L24 18Z" fill="#E21B4D"/>
          <path d="M12 9 L14 6 L24 18 L12 18Z" fill="rgba(226,27,77,0.45)"/>
        </svg>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '0.15em' }}>MAXD</span>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Operations Dashboard</div>
    </div>
  )

  const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.75rem' }
  const btn  = { marginTop: '1.25rem', width: '100%', padding: '0.7rem', background: '#E21B4D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', letterSpacing: '0.02em', fontFamily: 'Oswald, sans-serif', opacity: loading ? 0.7 : 1 }
  const link = { background: 'none', border: 'none', color: '#E21B4D', cursor: 'pointer', fontSize: 13, padding: 0 }

  // ── Recover mode (arrived via email reset link) ──────────────────────────────
  if (mode === 'recover') return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {logoBlock}
        <div style={card}>
          <h2 style={{ margin: '0 0 1.5rem', color: '#fff', fontSize: 18, fontWeight: 600 }}>Set a new password</h2>
          <div style={{ display: 'grid', gap: '0.875rem' }}>
            <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>New Password
              <input type="password" value={newPassword} onChange={e => setNewPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRecover()} placeholder="Min 8 characters" style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Confirm Password
              <input type="password" value={confirmPass} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRecover()} placeholder="••••••••" style={inp} />
            </label>
          </div>
          {error && <div style={{ marginTop: '1rem', padding: '0.6rem 0.75rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>{error}</div>}
          {successMsg && <div style={{ marginTop: '1rem', padding: '0.6rem 0.75rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, fontSize: 13, color: '#86efac' }}>{successMsg}</div>}
          <button onClick={handleRecover} disabled={loading} style={btn}>{loading ? 'Updating…' : 'Set New Password'}</button>
        </div>
      </div>
    </div>
  )

  // ── Forgot password mode ─────────────────────────────────────────────────────
  if (mode === 'forgot') return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {logoBlock}
        <div style={card}>
          <h2 style={{ margin: '0 0 0.5rem', color: '#fff', fontSize: 18, fontWeight: 600 }}>Reset your password</h2>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>Enter your email and we'll send a reset link.</p>
          <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleForgot()} placeholder="you@company.com" style={inp} />
          </label>
          {error && <div style={{ marginTop: '1rem', padding: '0.6rem 0.75rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>{error}</div>}
          {successMsg && <div style={{ marginTop: '1rem', padding: '0.6rem 0.75rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, fontSize: 13, color: '#86efac' }}>{successMsg}</div>}
          <button onClick={handleForgot} disabled={loading} style={btn}>{loading ? 'Sending…' : 'Send Reset Link'}</button>
          <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            <button onClick={() => { setMode('login'); setError(''); setSuccess('') }} style={link}>Back to sign in</button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Cloud setup mode ─────────────────────────────────────────────────────────
  if (mode === 'cloud') return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {logoBlock}
        <div style={card}>
          <h2 style={{ margin: '0 0 0.4rem', color: '#fff', fontSize: 18, fontWeight: 600 }}>Connect to Cloud</h2>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
            Enter your Supabase project details to enable cloud sync on this device. You only need to do this once per device.
          </p>
          <div style={{ display: 'grid', gap: '0.875rem' }}>
            <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
              Supabase Project URL
              <input
                value={projectUrl}
                onChange={e => setProjectUrl(e.target.value)}
                placeholder="https://xxxxxxxxxxxx.supabase.co"
                style={inp}
              />
            </label>
            <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
              Anon / Public Key
              <input
                value={anonKey}
                onChange={e => setAnonKey(e.target.value)}
                placeholder="eyJhbGci…"
                style={inp}
              />
            </label>
          </div>
          <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, fontSize: 12, color: 'rgba(147,197,253,0.8)', lineHeight: 1.5 }}>
            Find these in your <strong>Supabase Dashboard → Project Settings → API</strong>. The anon key is safe to store here — security comes from Row Level Security policies, not from hiding this key.
          </div>
          {error && <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>{error}</div>}
          {successMsg && <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, fontSize: 13, color: '#86efac' }}>{successMsg}</div>}
          <button onClick={handleCloudSave} style={btn}>Save & Connect</button>
          <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
            <button onClick={() => { setMode('login'); setError(''); setSuccess('') }} style={link}>Back to sign in</button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Login / Signup mode ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {logoBlock}
        <div style={card}>
          <h2 style={{ margin: '0 0 1.5rem', color: '#fff', fontSize: 18, fontWeight: 600 }}>
            {mode === 'login' ? 'Sign in' : 'Create your account'}
          </h2>

          <div style={{ display: 'grid', gap: '0.875rem' }}>
            {mode === 'signup' && (
              <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Your Name
                <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder="First Last" style={inp} />
              </label>
            )}
            <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder="you@company.com" style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Password
              <input type="password" value={password} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder="••••••••" style={inp} />
            </label>
          </div>

          {mode === 'login' && (
            <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
              <button onClick={() => { setMode('forgot'); setError(''); setSuccess('') }} style={{ ...link, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                Forgot password?
              </button>
            </div>
          )}

          {mode === 'signup' && (
            <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, fontSize: 12, color: 'rgba(147,197,253,0.9)', lineHeight: 1.5 }}>
              Your first sign-up creates a new workspace. If you were invited by an admin, sign up with the exact email they invited.
            </div>
          )}

          {!hasSupabase && (
            <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 8, fontSize: 12, color: 'rgba(253,224,71,0.9)', lineHeight: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span>☁️ Not connected to cloud — your data won't sync across devices.</span>
              <button onClick={() => { setMode('cloud'); setError(''); setSuccess('') }} style={{ background: 'rgba(234,179,8,0.2)', border: '1px solid rgba(234,179,8,0.4)', borderRadius: 6, color: 'rgba(253,224,71,1)', fontSize: 11, fontWeight: 700, padding: '3px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Connect
              </button>
            </div>
          )}

          {error && (
            <div style={{ marginTop: '1rem', padding: '0.6rem 0.75rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>
              {error}
            </div>
          )}

          {successMsg && (
            <div style={{ marginTop: '1rem', padding: '0.6rem 0.75rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, fontSize: 13, color: '#86efac' }}>
              {successMsg}
            </div>
          )}

          <button onClick={handle} disabled={loading} style={btn}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            {mode === 'login' ? "Need an account? " : "Already have one? "}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }} style={link}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
          Access is by invitation only
        </div>
      </div>
    </div>
  )
}


// ── Auth Provider ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
      if (stored) {
        // Re-hydrate the db and credentials layers from session storage
        // (credentials won't be in memory on page refresh — reload from Supabase)
        if (stored.orgId && stored.accessToken) {
          initDb(stored.orgId, stored.accessToken)
          // Re-fetch credentials in background; memory is empty until then
          fetchOrgCredentials(stored.orgId, stored.accessToken)
            .then(creds => initCredentials(stored.orgId, stored.accessToken, creds))
            .catch(() => {})
        }
      }
      return stored
    } catch { return null }
  })

  const login = (userData) => {
    setUser(userData)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData))
  }

  const logout = () => {
    if (user?.accessToken) supabaseSignOut(user.accessToken)
    clearCredentialStore()
    setUser(null)
    sessionStorage.removeItem(SESSION_KEY)
  }

  // Check if the current user has access to a given page.
  // Uses user.pages[] (stored per-member in Supabase) so admins
  // can configure exactly what each team member can see.
  const hasAccess = (page) => {
    if (!user) return false
    if (user.pages?.includes(page)) return true
    // Fallback for local auth (no org)
    if (user.local) return PERMISSIONS[user.role]?.includes(page) ?? false
    return false
  }

  const isAdmin   = user?.role === 'admin'
  const canManage = user?.canManage || isAdmin

  if (!user) return <LoginPage onLogin={login} />

  return (
    <AuthContext.Provider value={{ user, hasAccess, logout, isAdmin, canManage }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
