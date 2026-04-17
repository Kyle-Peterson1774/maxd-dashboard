import { useState, useMemo, useEffect } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { fetchLiveFollowerSnapshot } from '../lib/liveData.js'
import { dbSet, dbGet } from '../lib/db.js'

const STORE_KEY = 'maxd_social'

const PLATFORMS = {
  instagram: { label: 'Instagram', icon: '📸', color: '#E1306C', url: 'https://instagram.com' },
  tiktok:    { label: 'TikTok',    icon: '🎵', color: '#010101', url: 'https://tiktok.com'   },
  youtube:   { label: 'YouTube',   icon: '▶',  color: '#FF0000', url: 'https://youtube.com'  },
  facebook:  { label: 'Facebook',  icon: '👍', color: '#1877F2', url: 'https://facebook.com' },
}

const POST_TYPES = ['Reel', 'TikTok', 'Short', 'Story', 'Post', 'Carousel', 'Live']

const DEMO = {
  snapshots: [
    { id: 's1', date: '2026-04-01', instagram: 2840, tiktok: 1120, youtube: 430,  facebook: 650  },
    { id: 's2', date: '2026-04-07', instagram: 2910, tiktok: 1280, youtube: 448,  facebook: 661  },
    { id: 's3', date: '2026-04-09', instagram: 2975, tiktok: 1350, youtube: 455,  facebook: 668  },
  ],
  posts: [
    { id: 'p1', date: '2026-04-01', platform: 'instagram', type: 'Reel',    title: 'Why Gummies?',          views: 14200, likes: 620, comments: 84, shares: 210, saves: 340 },
    { id: 'p2', date: '2026-04-02', platform: 'tiktok',    type: 'TikTok',  title: 'Story: BTS Building',   views: 8900,  likes: 430, comments: 31, shares: 88,  saves: 0   },
    { id: 'p3', date: '2026-04-03', platform: 'instagram', type: 'Reel',    title: '3-Min Flow',            views: 22400, likes: 980, comments: 112, shares: 445, saves: 560 },
    { id: 'p4', date: '2026-04-06', platform: 'tiktok',    type: 'TikTok',  title: 'One Day vs 100 Days',   views: 31000, likes: 2100, comments: 198, shares: 820, saves: 0  },
    { id: 'p5', date: '2026-04-07', platform: 'youtube',   type: 'Short',   title: 'Why I Started MAXD',    views: 3200,  likes: 180, comments: 22, shares: 45,  saves: 0   },
    { id: 'p6', date: '2026-04-08', platform: 'instagram', type: 'Carousel',title: 'Creatine: 20yr Science',views: 9800,  likes: 710, comments: 65, shares: 320, saves: 890 },
  ],
}

const EMPTY_DATA = { snapshots: [], posts: [] }

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? JSON.parse(raw) : EMPTY_DATA
  } catch { return EMPTY_DATA }
}
function save(data) { dbSet(STORE_KEY, data) }
function nid() { return `i_${Date.now()}_${Math.random().toString(36).slice(2,5)}` }
function fmt(n) { return n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n) }
function pct(a, b) { if (!b) return '—'; const d = ((a-b)/b*100); return (d >= 0 ? '+' : '') + d.toFixed(1) + '%' }

// ── Snapshot modal ─────────────────────────────────────────────────────────
function SnapshotModal({ snapshot, onClose, onSave, onDelete }) {
  const isNew = !snapshot?.id
  const [form, setForm] = useState(snapshot || { date: new Date().toISOString().split('T')[0], instagram: '', tiktok: '', youtube: '', facebook: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = () => { onSave({ ...form, id: form.id || nid() }); onClose() }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div style={{ background: 'var(--navy)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--white)', fontSize: 14, letterSpacing: '0.05em' }}>{isNew ? 'LOG FOLLOWER COUNTS' : 'EDIT SNAPSHOT'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, letterSpacing: '0.04em' }}>DATE</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-2)', outline: 'none' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {Object.entries(PLATFORMS).map(([key, p]) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, letterSpacing: '0.04em' }}>{p.icon} {p.label.toUpperCase()}</label>
                <input type="number" value={form[key] || ''} onChange={e => set(key, Number(e.target.value))} placeholder="0"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: `1.5px solid var(--border-mid)`, borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-2)', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = p.color} onBlur={e => e.target.style.borderColor = 'var(--border-mid)'} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--surface-3)', display: 'flex', justifyContent: 'space-between' }}>
          <div>{!isNew && <button onClick={() => { onDelete(form.id); onClose() }} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px solid #fca5a5', background: 'var(--surface-2)', color: '#dc2626', cursor: 'pointer' }}>Delete</button>}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border-mid)', background: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} style={{ fontSize: 12, padding: '7px 20px', borderRadius: 6, border: 'none', background: 'var(--navy)', color: 'var(--white)', cursor: 'pointer', fontWeight: 700 }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Post modal ─────────────────────────────────────────────────────────────
function PostModal({ post, onClose, onSave, onDelete }) {
  const isNew = !post?.id
  const [form, setForm] = useState(post || { date: new Date().toISOString().split('T')[0], platform: 'instagram', type: 'Reel', title: '', views: '', likes: '', comments: '', shares: '', saves: '', url: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = () => { onSave({ ...form, id: form.id || nid() }); onClose() }
  const p = PLATFORMS[form.platform]

  const numField = (key, label) => (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, letterSpacing: '0.04em' }}>{label}</label>
      <input type="number" value={form[key] || ''} onChange={e => set(key, Number(e.target.value))} placeholder="0"
        style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-2)', outline: 'none' }} />
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'var(--navy)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--white)', fontSize: 14, letterSpacing: '0.05em' }}>{isNew ? 'LOG POST' : 'EDIT POST'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, letterSpacing: '0.04em' }}>DATE</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-2)', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, letterSpacing: '0.04em' }}>PLATFORM</label>
              <select value={form.platform} onChange={e => set('platform', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-2)', outline: 'none' }}>
                {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, letterSpacing: '0.04em' }}>TYPE</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-2)', outline: 'none' }}>
                {POST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, letterSpacing: '0.04em' }}>TITLE / DESCRIPTION</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Post title or brief description"
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-2)', outline: 'none' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 12 }}>
            {numField('views', '👁 VIEWS')}
            {numField('likes', '❤ LIKES')}
            {numField('comments', '💬 COMMENTS')}
            {numField('shares', '↗ SHARES')}
            {form.platform === 'instagram' ? numField('saves', '🔖 SAVES') : <div />}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, letterSpacing: '0.04em' }}>POST URL (optional)</label>
            <input value={form.url || ''} onChange={e => set('url', e.target.value)} placeholder="https://..."
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-2)', outline: 'none' }} />
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--surface-3)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>{!isNew && <button onClick={() => { onDelete(form.id); onClose() }} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px solid #fca5a5', background: 'var(--surface-2)', color: '#dc2626', cursor: 'pointer' }}>Delete</button>}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border-mid)', background: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} style={{ fontSize: 12, padding: '7px 20px', borderRadius: 6, border: 'none', background: p?.color || 'var(--navy)', color: 'var(--white)', cursor: 'pointer', fontWeight: 700 }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Growth bar chart (pure CSS) ────────────────────────────────────────────
function GrowthBars({ snapshots }) {
  if (snapshots.length < 2) return <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>Log at least 2 snapshots to see growth trend.</div>
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date)).slice(-8)
  const allVals = sorted.flatMap(s => Object.keys(PLATFORMS).map(k => s[k] || 0))
  const max = Math.max(...allVals) || 1

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 16, paddingBottom: 8, minWidth: 'max-content' }}>
        {sorted.map((snap, i) => (
          <div key={snap.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 80 }}>
              {Object.entries(PLATFORMS).map(([key, p]) => {
                const val = snap[key] || 0
                const h = Math.max((val / max) * 80, val > 0 ? 4 : 0)
                return (
                  <div key={key} title={`${p.label}: ${val.toLocaleString()}`} style={{ width: 12, height: h, background: p.color, borderRadius: '3px 3px 0 0', transition: 'height 0.3s', opacity: 0.85 }} />
                )
              })}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {new Date(snap.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {Object.entries(PLATFORMS).map(([key, p]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
            {p.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Social() {
  const [data, setData]       = useState(load)
  const [snapModal, setSnapModal] = useState(null)
  const [postModal, setPostModal] = useState(null)
  const [platFilter, setPlatFilter] = useState('all')
  const [tab, setTab]         = useState('overview')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)

  // Refresh from Supabase when page opens
  useEffect(() => {
    dbGet(STORE_KEY).then(d => { if (d) setData(d) })
  }, [])

  const persist = (d) => { save(d); setData(d) }

  // Sync live follower counts from connected platforms
  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    const snap = await fetchLiveFollowerSnapshot()
    setSyncing(false)
    if (snap) {
      setSnapModal(snap)   // pre-fills SnapshotModal with live data for review
      setSyncMsg(null)
    } else {
      setSyncMsg('No platforms connected yet — go to Settings to add Instagram, YouTube, or Facebook.')
      setTimeout(() => setSyncMsg(null), 5000)
    }
  }

  const saveSnapshot = (s) => {
    const idx = data.snapshots.findIndex(x => x.id === s.id)
    persist({ ...data, snapshots: idx >= 0 ? data.snapshots.map(x => x.id === s.id ? s : x) : [...data.snapshots, s] })
  }
  const deleteSnapshot = (id) => persist({ ...data, snapshots: data.snapshots.filter(x => x.id !== id) })
  const savePost = (p) => {
    const idx = data.posts.findIndex(x => x.id === p.id)
    persist({ ...data, posts: idx >= 0 ? data.posts.map(x => x.id === p.id ? p : x) : [p, ...data.posts] })
  }
  const deletePost = (id) => persist({ ...data, posts: data.posts.filter(x => x.id !== id) })

  const sorted = useMemo(() => [...data.snapshots].sort((a, b) => b.date.localeCompare(a.date)), [data.snapshots])
  const latest  = sorted[0] || {}
  const prev    = sorted[1] || {}

  const totalFollowers = Object.keys(PLATFORMS).reduce((s, k) => s + (latest[k] || 0), 0)
  const prevTotal      = Object.keys(PLATFORMS).reduce((s, k) => s + (prev[k] || 0), 0)

  const filteredPosts = platFilter === 'all' ? data.posts : data.posts.filter(p => p.platform === platFilter)
  const sortedPosts   = [...filteredPosts].sort((a, b) => b.date.localeCompare(a.date))

  const totalViews = data.posts.reduce((s, p) => s + (p.views || 0), 0)
  const totalEngagement = data.posts.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0)
  const avgEngRate = totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(1) + '%' : '—'

  return (
    <div>
      <PageHeader title="Social Growth" subtitle="Instagram · TikTok · YouTube · Facebook">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={handleSync} disabled={syncing} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--border-mid)', color: syncing ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: syncing ? 'default' : 'pointer', fontWeight: 600 }}>
            {syncing ? '⟳ Syncing…' : '⟳ Sync Live Followers'}
          </button>
          <button onClick={() => setSnapModal({})} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--border-mid)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
            + Log Followers
          </button>
          <button onClick={() => setPostModal({})} style={{ fontSize: 12, padding: '8px 16px', borderRadius: 'var(--radius)', background: 'var(--red)', border: 'none', color: 'var(--white)', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.04em' }}>
            + Log Post
          </button>
        </div>
      </PageHeader>

      {syncMsg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#92400E', fontSize: 13, marginBottom: '1rem' }}>
          {syncMsg}
        </div>
      )}

      {/* Platform stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid var(--navy)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 4 }}>TOTAL FOLLOWERS</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)', lineHeight: 1 }}>{fmt(totalFollowers)}</div>
          <div style={{ fontSize: 10, color: totalFollowers > prevTotal ? '#059669' : 'var(--text-muted)', marginTop: 2 }}>{pct(totalFollowers, prevTotal)} vs prev</div>
        </div>
        {Object.entries(PLATFORMS).map(([key, p]) => (
          <div key={key} className="card" style={{ padding: '12px 14px', borderLeft: `3px solid ${p.color}` }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 4 }}>{p.icon} {p.label.toUpperCase()}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: p.color, lineHeight: 1 }}>{fmt(latest[key] || 0)}</div>
            <div style={{ fontSize: 10, color: (latest[key] || 0) > (prev[key] || 0) ? '#059669' : 'var(--text-muted)', marginTop: 2 }}>{pct(latest[key] || 0, prev[key] || 0)}</div>
          </div>
        ))}
        <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid #D97706' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 4 }}>AVG ENG. RATE</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#D97706', lineHeight: 1 }}>{avgEngRate}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>target: 3%+</div>
        </div>
        <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid #7C3AED' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 4 }}>TOTAL VIEWS</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#7C3AED', lineHeight: 1 }}>{fmt(totalViews)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{data.posts.length} posts tracked</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 8, padding: 3, gap: 2, marginBottom: '1.25rem', width: 'fit-content' }}>
        {[{ key: 'overview', label: '📊 Overview' }, { key: 'posts', label: '📋 Post Log' }, { key: 'growth', label: '📈 Growth' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '7px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: tab === t.key ? 'var(--surface-2)' : 'transparent', border: 'none', cursor: 'pointer', color: tab === t.key ? 'var(--navy)' : 'var(--text-muted)', boxShadow: tab === t.key ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {Object.entries(PLATFORMS).map(([key, p]) => {
            const platformPosts = data.posts.filter(x => x.platform === key)
            const topPost = [...platformPosts].sort((a, b) => (b.views || 0) - (a.views || 0))[0]
            const totalV = platformPosts.reduce((s, x) => s + (x.views || 0), 0)
            return (
              <div key={key} className="card" style={{ padding: '1rem 1.25rem', borderTop: `3px solid ${p.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{p.label}</div>
                      <div style={{ fontSize: 12, color: p.color, fontWeight: 700 }}>{fmt(latest[key] || 0)} followers</div>
                    </div>
                  </div>
                  <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: `${p.color}15`, color: p.color, textDecoration: 'none', fontWeight: 600 }}>Open ↗</a>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 10 }}>
                  <div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>POSTS LOGGED</div><div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{platformPosts.length}</div></div>
                  <div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>TOTAL VIEWS</div><div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(totalV)}</div></div>
                </div>
                {topPost ? (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>TOP POST</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{topPost.title}</div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                      <span>👁 {fmt(topPost.views || 0)}</span>
                      <span>❤ {fmt(topPost.likes || 0)}</span>
                      <span>💬 {fmt(topPost.comments || 0)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No posts logged yet</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Post log */}
      {tab === 'posts' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', flexWrap: 'wrap' }}>
            {[{ key: 'all', label: 'All' }, ...Object.entries(PLATFORMS).map(([k, p]) => ({ key: k, label: `${p.icon} ${p.label}` }))].map(f => (
              <button key={f.key} onClick={() => setPlatFilter(f.key)}
                style={{ fontSize: 11, padding: '5px 11px', borderRadius: 20, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${platFilter === f.key ? 'var(--navy)' : 'var(--border)'}`, background: platFilter === f.key ? 'var(--navy)' : 'var(--surface-2)', color: platFilter === f.key ? 'var(--white)' : 'var(--text-muted)' }}>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 100px 70px 70px 70px 70px', padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              <span>DATE</span><span>TITLE</span><span>PLATFORM</span><span>VIEWS</span><span>LIKES</span><span>COMMENTS</span><span>SHARES</span>
            </div>
            {sortedPosts.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No posts logged yet. Hit "+ Log Post" to start tracking.</div>
            )}
            {sortedPosts.map((post, i) => {
              const p = PLATFORMS[post.platform]
              return (
                <div key={post.id} onClick={() => setPostModal(post)} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 100px 70px 70px 70px 70px', padding: '11px 16px', alignItems: 'center', borderBottom: i < sortedPosts.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(post.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{post.title || '—'}</div>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: `${p?.color}15`, color: p?.color, fontWeight: 600 }}>{post.type}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 14 }}>{p?.icon}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p?.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(post.views || 0)}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmt(post.likes || 0)}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmt(post.comments || 0)}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmt(post.shares || 0)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Growth chart */}
      {tab === 'growth' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sorted.length} snapshots logged</div>
            <button onClick={() => setSnapModal({})} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, border: '1.5px solid var(--border-mid)', background: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>+ Log Today's Counts</button>
          </div>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 16 }}>FOLLOWER GROWTH</div>
            <GrowthBars snapshots={data.snapshots} />
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>SNAPSHOT HISTORY</div>
            {sorted.map((snap, i) => (
              <div key={snap.id} onClick={() => setSnapModal(snap)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', width: 100 }}>
                  {new Date(snap.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <div style={{ display: 'flex', gap: 20 }}>
                  {Object.entries(PLATFORMS).map(([key, p]) => (
                    <div key={key} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{p.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: p.color }}>{fmt(snap[key] || 0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {sorted.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No snapshots yet. Log your current follower counts to start tracking growth.</div>}
          </div>
        </div>
      )}

      {snapModal !== null && <SnapshotModal snapshot={snapModal?.id ? snapModal : null} onClose={() => setSnapModal(null)} onSave={saveSnapshot} onDelete={deleteSnapshot} />}
      {postModal !== null && <PostModal post={postModal?.id ? postModal : null} onClose={() => setPostModal(null)} onSave={savePost} onDelete={deletePost} />}
    </div>
  )
}
