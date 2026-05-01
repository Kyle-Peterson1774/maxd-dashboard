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

  // ── Shared styles ──────────────────────────────────────────────────────────
  const S = {
    page:  { minHeight: '100vh', background: '#0B111E', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'Inter, system-ui, sans-serif' },
    wrap:  { width: '100%', maxWidth: 420 },
    card:  { background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '2rem' },
    inp:   { display: 'block', width: '100%', marginTop: 6, padding: '0.65rem 0.875rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s', fontFamily: 'Inter, sans-serif' },
    label: { display: 'block', fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.02em' },
    btn:   { marginTop: '1.25rem', width: '100%', padding: '0.75rem', background: '#E21B4D', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', letterSpacing: '0.02em', fontFamily: 'Inter, sans-serif', opacity: loading ? 0.7 : 1, transition: 'background 0.15s, transform 0.1s', boxShadow: '0 2px 12px rgba(226,27,77,0.3)' },
    link:  { background: 'none', border: 'none', color: '#E21B4D', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'Inter, sans-serif' },
    err:   { marginTop: '1rem', padding: '0.65rem 0.875rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: '#fca5a5', lineHeight: 1.5 },
    ok:    { marginTop: '1rem', padding: '0.65rem 0.875rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: 13, color: '#86efac', lineHeight: 1.5 },
  }

  const Logo = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
      <svg width="30" height="22" viewBox="0 0 24 18" fill="none">
        <path d="M0 18 L8 2 L12 9 L14 6 L24 18Z" fill="#E21B4D" opacity="0.95"/>
        <path d="M12 9 L14 6 L24 18 L12 18Z" fill="#E21B4D" opacity="0.42"/>
      </svg>
      <span style={{ fontFamily: 'Oswald, sans-serif', color: '#fff', fontSize: 21, fontWeight: 700, letterSpacing: '0.14em' }}>MAXD</span>
    </div>
  )

  const Field = ({ label, ...props }) => (
    <label style={{ display: 'block' }}>
      <span style={S.label}>{label}</span>
      <input {...props} style={{ ...S.inp, marginTop: 6 }}
        onFocus={e => { e.target.style.borderColor = 'rgba(226,27,77,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(226,27,77,0.12)' }}
        onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
      />
    </label>
  )

  // ── Recover password ────────────────────────────────────────────────────────
  if (mode === 'recover') return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Logo />
        <div style={S.card}>
          <h2 style={{ margin: '0 0 0.375rem', color: '#fff', fontSize: 20, fontWeight: 600, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.04em' }}>Set a new password</h2>
          <p style={{ margin: '0 0 1.5rem', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>Choose a strong password for your account.</p>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <Field label="New Password" type="password" value={newPassword} onChange={e => setNewPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRecover()} placeholder="Min 8 characters" />
            <Field label="Confirm Password" type="password" value={confirmPass} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRecover()} placeholder="••••••••" />
          </div>
          {error && <div style={S.err}>{error}</div>}
          {successMsg && <div style={S.ok}>{successMsg}</div>}
          <button onClick={handleRecover} disabled={loading} style={S.btn}>{loading ? 'Updating…' : 'Set New Password'}</button>
        </div>
      </div>
    </div>
  )

  // ── Forgot password ─────────────────────────────────────────────────────────
  if (mode === 'forgot') return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Logo />
        <div style={S.card}>
          <h2 style={{ margin: '0 0 0.375rem', color: '#fff', fontSize: 20, fontWeight: 600, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.04em' }}>Reset your password</h2>
          <p style={{ margin: '0 0 1.5rem', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>Enter your email and we'll send a reset link.</p>
          <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleForgot()} placeholder="you@company.com" />
          {error && <div style={S.err}>{error}</div>}
          {successMsg && <div style={S.ok}>{successMsg}</div>}
          <button onClick={handleForgot} disabled={loading} style={S.btn}>{loading ? 'Sending…' : 'Send Reset Link'}</button>
          <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
            <button onClick={() => { setMode('login'); setError(''); setSuccess('') }} style={{ ...S.link, color: 'rgba(255,255,255,0.35)', fontSize: 12.5 }}>← Back to sign in</button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Login / Signup ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0B111E', display: 'flex', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Left panel — brand (hidden on small screens) */}
      <div style={{ flex: '0 0 420px', background: 'linear-gradient(160deg, #0F1929 0%, #141F36 60%, #1a1040 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem', borderRight: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }} className="login-panel">
        {/* Subtle grid bg */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '3.5rem' }}>
            <svg width="32" height="24" viewBox="0 0 24 18" fill="none">
              <path d="M0 18 L8 2 L12 9 L14 6 L24 18Z" fill="#E21B4D" opacity="0.95"/>
              <path d="M12 9 L14 6 L24 18 L12 18Z" fill="#E21B4D" opacity="0.42"/>
            </svg>
            <span style={{ fontFamily: 'Oswald, sans-serif', color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '0.14em' }}>MAXD</span>
          </div>

          <div style={{ marginBottom: '3rem' }}>
            <h1 style={{ fontFamily: 'Oswald, sans-serif', fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1.15, letterSpacing: '0.02em', margin: '0 0 1rem' }}>
              Your brand,<br />fully in control.
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>
              One platform for content, growth, operations, and AI — built for DTC brands that move fast.
            </p>
          </div>

          {[
            { icon: '✦', label: 'AI Studio', desc: 'Generate copy, run agents, automate workflows' },
            { icon: '◈', label: 'Live Analytics', desc: 'Shopify, Meta Ads, Klaviyo — all in one view' },
            { icon: '◻', label: 'Content Engine', desc: 'Calendar, scripts, and social scheduling' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', gap: 14, marginBottom: '1.25rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(226,27,77,0.12)', border: '1px solid rgba(226,27,77,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#E21B4D', flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ position: 'relative', fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>
          © {new Date().getFullYear()} MAXD Wellness. All rights reserved.
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo */}
          <div style={{ display: 'none', alignItems: 'center', gap: 10, marginBottom: '2rem' }} className="login-mobile-logo">
            <svg width="28" height="21" viewBox="0 0 24 18" fill="none">
              <path d="M0 18 L8 2 L12 9 L14 6 L24 18Z" fill="#E21B4D" opacity="0.95"/>
              <path d="M12 9 L14 6 L24 18 L12 18Z" fill="#E21B4D" opacity="0.42"/>
            </svg>
            <span style={{ fontFamily: 'Oswald, sans-serif', color: '#fff', fontSize: 20, fontWeight: 700, letterSpacing: '0.14em' }}>MAXD</span>
          </div>

          <h2 style={{ margin: '0 0 0.375rem', color: '#fff', fontSize: 22, fontWeight: 600, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.04em' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ margin: '0 0 1.75rem', fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
            {mode === 'login' ? 'Sign in to your workspace.' : 'Your first sign-up creates a new workspace.'}
          </p>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {mode === 'signup' && (
              <Field label="Full Name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder="First Last" />
            )}
            <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder="you@company.com" />
            <div>
              <Field label="Password" type="password" value={password} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder="••••••••" />
              {mode === 'login' && (
                <div style={{ marginTop: 6, textAlign: 'right' }}>
                  <button onClick={() => { setMode('forgot'); setError(''); setSuccess('') }} style={{ ...S.link, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && <div style={S.err}>{error}</div>}
          {successMsg && <div style={S.ok}>{successMsg}</div>}

          <button onClick={handle} disabled={loading} style={S.btn}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            {mode === 'login' ? 'New to MAXD? ' : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }} style={S.link}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-panel { display: none !important; }
          .login-mobile-logo { display: flex !important; }
        }
      `}</style>
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
