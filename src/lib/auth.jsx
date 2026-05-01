import { createContext, useContext, useState } from 'react'
import {
  supabaseSignIn,
  supabaseSignUp,
  supabaseSignOut,
  supabaseRequestPasswordReset,
  supabaseUpdatePassword,
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
// hasAccess(page) checks user.pages[] — set per-member in Supabase
// so admins can configure exactly what each team member sees.
// ============================================================

const AuthContext = createContext(null)
const SESSION_KEY = 'maxd_session'

// Default page sets by role — used when creating a new member
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


// ── Helpers ────────────────────────────────────────────────────────────────────

function parseRecoveryToken() {
  try {
    const hash = window.location.hash
    if (!hash.includes('type=recovery') || !hash.includes('access_token=')) return null
    return new URLSearchParams(hash.substring(1)).get('access_token')
  } catch { return null }
}


// ── Login Page ─────────────────────────────────────────────────────────────────

function LoginPage({ onLogin }) {
  const recoveryToken             = parseRecoveryToken()
  const [mode, setMode]           = useState(recoveryToken ? 'recover' : 'login')
  const [email, setEmail]         = useState('')
  const [password, setPass]       = useState('')
  const [newPassword, setNewPass] = useState('')
  const [confirmPass, setConfirm] = useState('')
  const [name, setName]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [successMsg, setSuccess]  = useState('')

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

    if (mode === 'signup') {
      const result = await supabaseSignUp(email, password, name)
      setLoading(false)
      if (result.error) { setError(result.error); return }

      const session = result.data
      const accessToken = session?.access_token || session?.session?.access_token

      if (!accessToken) {
        setSuccess('Account created — check your email to confirm, then sign in.')
        setMode('login'); return
      }

      await _finalizeLogin(email, name, accessToken, true)
      return
    }

    const result = await supabaseSignIn(email, password)
    setLoading(false)
    if (result.error) { setError(result.error); return }

    const session   = result.data
    const accessToken = session?.access_token
    const userMeta  = session?.user?.user_metadata || {}

    await _finalizeLogin(email, userMeta.name || name, accessToken, false)

    async function _finalizeLogin(email, displayName, accessToken, isNewSignup) {
      let membership = await getOrgMembership(accessToken)

      if (!membership && isNewSignup) {
        const orgName   = (displayName || email.split('@')[0]) + "'s Workspace"
        const orgResult = await createOrg(orgName, accessToken)
        if (orgResult.error) {
          setError('Account created but could not set up your workspace: ' + orgResult.error)
          setLoading(false); return
        }
        membership = await getOrgMembership(accessToken)
      }

      if (!membership) {
        setError('Your account is not linked to any workspace. Ask your admin to invite you.')
        setLoading(false); return
      }

      const orgId     = membership.org_id
      const role      = membership.role || 'content'
      const pages     = membership.pages?.length ? membership.pages : (PERMISSIONS[role] || PERMISSIONS.content)
      const finalName = displayName || membership.name || email.split('@')[0]
      const canManage = role === 'admin' || !!membership.can_manage

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

  const inp  = { display: 'block', width: '100%', marginTop: 4, padding: '0.6rem 0.75rem', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none' }
  const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.75rem' }
  const btn  = { marginTop: '1.25rem', width: '100%', padding: '0.7rem', background: '#E21B4D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', letterSpacing: '0.02em', fontFamily: 'Oswald, sans-serif', opacity: loading ? 0.7 : 1 }
  const link = { background: 'none', border: 'none', color: '#E21B4D', cursor: 'pointer', fontSize: 13, padding: 0 }

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

  // ── Recover password mode ─────────────────────────────────────────────────
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

  // ── Forgot password mode ──────────────────────────────────────────────────
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

  // ── Login / Signup mode ───────────────────────────────────────────────────
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
              Your first sign-up creates a new workspace. If you were invited by an admin, sign up with the exact email they used.
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
      </div>
    </div>
  )
}


// ── Auth Provider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
      if (stored?.orgId && stored?.accessToken) {
        initDb(stored.orgId, stored.accessToken)
        fetchOrgCredentials(stored.orgId, stored.accessToken)
          .then(creds => initCredentials(stored.orgId, stored.accessToken, creds))
          .catch(() => {})
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

  const hasAccess = (page) => {
    if (!user) return false
    return user.pages?.includes(page) ?? false
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
