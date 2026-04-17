import { createContext, useContext, useState, useEffect } from 'react'
import { getCredentials } from './credentials.js'

// ============================================
// AUTH — Supabase email/password + approved-email
//        access control. Only emails on the
//        approved list can create accounts.
// Roles: admin | content | marketing | ops
// ============================================

const AuthContext = createContext(null)

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

const SESSION_KEY  = 'maxd_session'
const APPROVED_KEY = 'maxd_approved_users'

// ── Approved users list ─────────────────────────────────────────────────────
// Always includes the owner. Others are added via Settings → Team Access.
const OWNER_EMAIL = 'kyle@trymaxd.com'

export function getApprovedUsers() {
  try {
    const raw = localStorage.getItem(APPROVED_KEY)
    const stored = raw ? JSON.parse(raw) : []
    // Owner is always in the list as admin
    const hasOwner = stored.some(u => u.email.toLowerCase() === OWNER_EMAIL.toLowerCase())
    if (!hasOwner) return [{ email: OWNER_EMAIL, role: 'admin', name: 'Kyle Peterson' }, ...stored]
    return stored
  } catch { return [{ email: OWNER_EMAIL, role: 'admin', name: 'Kyle Peterson' }] }
}

export function saveApprovedUsers(list) {
  localStorage.setItem(APPROVED_KEY, JSON.stringify(list))
  // Sync to Supabase in background
  import('./db.js').then(({ dbSet }) => dbSet(APPROVED_KEY, list)).catch(() => {})
}

function isApproved(email) {
  const approved = getApprovedUsers()
  return approved.find(u => u.email.toLowerCase() === email.toLowerCase()) || null
}

// ── Supabase helpers ────────────────────────────────────────────────────────
function getSupabaseAuthConfig() {
  const creds = getCredentials('supabase')
  if (!creds?.projectUrl || !creds?.anonKey) return null
  return { url: creds.projectUrl.replace(/\/$/, ''), key: creds.anonKey }
}

async function supabaseSignIn(email, password) {
  const cfg = getSupabaseAuthConfig()
  if (!cfg) return { error: 'Supabase not configured' }
  try {
    const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': cfg.key },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error_description || data.msg || 'Sign in failed. Check your email and password.' }
    return { session: data }
  } catch { return { error: 'Network error — check your connection' } }
}

async function supabaseSignUp(email, password, role, name) {
  const cfg = getSupabaseAuthConfig()
  if (!cfg) return { error: 'Supabase not configured' }
  try {
    const res = await fetch(`${cfg.url}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': cfg.key },
      body: JSON.stringify({ email, password, data: { role, name } }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error_description || data.msg || 'Sign up failed' }
    return { session: data }
  } catch { return { error: 'Network error — check your connection' } }
}

async function supabaseSignOut(accessToken) {
  const cfg = getSupabaseAuthConfig()
  if (!cfg || !accessToken) return
  fetch(`${cfg.url}/auth/v1/logout`, {
    method: 'POST',
    headers: { 'apikey': cfg.key, 'Authorization': `Bearer ${accessToken}` },
  }).catch(() => {})
}

// ── Login Page ──────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hasSupabase = !!getSupabaseAuthConfig()

  const handle = async () => {
    if (!email || !password) { setError('Email and password required'); return }
    setLoading(true); setError('')

    // ── No Supabase: simple local auth ──
    if (!hasSupabase) {
      const approved = isApproved(email)
      if (!approved) {
        setError('Your email is not on the access list. Contact your admin to get added.')
        setLoading(false)
        return
      }
      onLogin({ email, name: approved.name || name || email.split('@')[0], role: approved.role, initials: (approved.name || email).slice(0,2).toUpperCase(), local: true })
      setLoading(false)
      return
    }

    // ── Sign Up ──
    if (mode === 'signup') {
      const approved = isApproved(email)
      if (!approved) {
        setError('Your email is not on the access list. Contact your admin to get added.')
        setLoading(false)
        return
      }
      const result = await supabaseSignUp(email, password, approved.role, approved.name || name)
      setLoading(false)
      if (result.error) { setError(result.error); return }
      const session = result.session
      onLogin({
        email,
        name: approved.name || name || email.split('@')[0],
        role: approved.role,
        initials: (approved.name || name || email).slice(0,2).toUpperCase(),
        accessToken: session?.access_token,
      })
      return
    }

    // ── Sign In ──
    const result = await supabaseSignIn(email, password)
    setLoading(false)
    if (result.error) { setError(result.error); return }

    // Check approved list on sign-in too
    const approved = isApproved(email)
    if (!approved) {
      setError('Your account is not on the access list. Contact your admin.')
      return
    }
    const session = result.session
    const userMeta = session?.user?.user_metadata || {}
    onLogin({
      email,
      name: approved.name || userMeta.name || email.split('@')[0],
      role: approved.role || userMeta.role || 'content',
      initials: (approved.name || userMeta.name || email).slice(0,2).toUpperCase(),
      accessToken: session?.access_token,
    })
  }

  const inp = { display: 'block', width: '100%', marginTop: 4, padding: '0.6rem 0.75rem', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none' }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
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

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.75rem' }}>
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
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder="you@trymaxd.com" style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Password
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder="••••••••" style={inp} />
            </label>
          </div>

          {mode === 'signup' && (
            <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, fontSize: 12, color: 'rgba(147,197,253,0.9)', lineHeight: 1.5 }}>
              🔒 Your email must be on the approved access list. Your role will be assigned by your admin.
            </div>
          )}

          {error && (
            <div style={{ marginTop: '1rem', padding: '0.6rem 0.75rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>
              {error}
            </div>
          )}

          <button onClick={handle} disabled={loading} style={{ marginTop: '1.25rem', width: '100%', padding: '0.7rem', background: '#E21B4D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', letterSpacing: '0.02em', fontFamily: 'Oswald, sans-serif', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            {mode === 'login' ? "Need an account? " : "Already have one? "}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} style={{ background: 'none', border: 'none', color: '#E21B4D', cursor: 'pointer', fontSize: 13, padding: 0 }}>
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

// ── Auth Provider ───────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
  })

  // Sync approved users list from Supabase on mount
  useEffect(() => {
    import('./db.js').then(({ dbGet }) => {
      dbGet(APPROVED_KEY).then(list => {
        if (list && Array.isArray(list)) {
          const hasOwner = list.some(u => u.email.toLowerCase() === OWNER_EMAIL.toLowerCase())
          const full = hasOwner ? list : [{ email: OWNER_EMAIL, role: 'admin', name: 'Kyle Peterson' }, ...list]
          localStorage.setItem(APPROVED_KEY, JSON.stringify(full))
        }
      })
    }).catch(() => {})
  }, [])

  const login = (userData) => {
    setUser(userData)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData))
  }

  const logout = () => {
    if (user?.accessToken) supabaseSignOut(user.accessToken)
    setUser(null)
    sessionStorage.removeItem(SESSION_KEY)
  }

  const hasAccess = (page) => {
    if (!user) return false
    return PERMISSIONS[user.role]?.includes(page) ?? false
  }

  if (!user) return <LoginPage onLogin={login} />

  return (
    <AuthContext.Provider value={{ user, hasAccess, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
