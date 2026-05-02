import { useState, useEffect } from 'react'
import AgentPanel from '../components/ui/AgentPanel.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORE_KEY = 'maxd_analytics'

function loadEntries()  { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]') } catch { return [] } }
function saveEntries(d) { localStorage.setItem(STORE_KEY, JSON.stringify(d)) }
function uid()          { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

function EMPTY_ENTRY() {
  return {
    id: uid(),
    title: '',
    platform: '',
    postType: '',
    postDate: '',
    postUrl: '',
    views:    '',
    likes:    '',
    comments: '',
    shares:   '',
    saves:    '',
    reach:    '',
    clicks:   '',
    notes:    '',
    createdAt: new Date().toISOString(),
  }
}

const DEMO_ENTRIES = [
  { id: 'a1',  title: 'Why Gummies?',                             platform: 'TikTok',    postType: 'Reel',     postDate: '2026-03-10', postUrl: '', views: 8200,  likes: 620,  comments: 58,  shares: 140,  saves: 310,  reach: 7400,  clicks: 95,   notes: 'First viral attempt. Hook "You\'ve been doing creatine wrong" drove shares.' },
  { id: 'a2',  title: 'Why Creatine Gummies Beat Powder',         platform: 'TikTok',    postType: 'Reel',     postDate: '2026-03-15', postUrl: '', views: 42000, likes: 3200, comments: 280, shares: 890,  saves: 1100, reach: 38000, clicks: 540,  notes: 'Best performer to date. Hook "Nobody told you this" drove 8% completion.' },
  { id: 'a3',  title: 'My Morning Routine (ft. MAXD)',            platform: 'Instagram', postType: 'Reel',     postDate: '2026-03-18', postUrl: '', views: 8400,  likes: 620,  comments: 44,  shares: 120,  saves: 380,  reach: 7200,  clicks: 89,   notes: 'Lifestyle angle works well for MOFU audience.' },
  { id: 'a4',  title: '3 Creatine Myths Debunked',               platform: 'TikTok',    postType: 'Reel',     postDate: '2026-03-22', postUrl: '', views: 21000, likes: 1800, comments: 210, shares: 450,  saves: 670,  reach: 18000, clicks: 210,  notes: 'Strong save rate — educational content resonates with this audience.' },
  { id: 'a5',  title: 'Story: BTS Building',                     platform: 'Instagram', postType: 'Story',    postDate: '2026-03-26', postUrl: '', views: 2400,  likes: 0,    comments: 18,  shares: 22,   saves: 0,    reach: 2100,  clicks: 88,   notes: 'BTS stories see strong DM replies. Keep doing these.' },
  { id: 'a6',  title: '3-Min Flow',                              platform: 'Instagram', postType: 'Reel',     postDate: '2026-03-27', postUrl: '', views: 6200,  likes: 490,  comments: 34,  shares: 95,   saves: 210,  reach: 5600,  clicks: 72,   notes: 'Mobility content does well on Instagram. Cross-post to TikTok next time.' },
  { id: 'a7',  title: 'One Day vs 100 Days',                     platform: 'TikTok',    postType: 'Reel',     postDate: '2026-03-29', postUrl: '', views: 18500, likes: 1540, comments: 112, shares: 380,  saves: 590,  reach: 16200, clicks: 220,  notes: 'Consistency angle resonates. High share rate indicates strong shareability.' },
  { id: 'a8',  title: 'The Builder Identity',                    platform: 'TikTok',    postType: 'Reel',     postDate: '2026-03-30', postUrl: '', views: 14800, likes: 1180, comments: 89,  shares: 295,  saves: 410,  reach: 13200, clicks: 175,  notes: 'Founder identity content performing well. Audience connecting with the builder angle.' },
  { id: 'a9',  title: 'Creatine: 20yr Science',                  platform: 'Instagram', postType: 'Carousel', postDate: '2026-04-02', postUrl: '', views: 9800,  likes: 740,  comments: 68,  shares: 180,  saves: 820,  reach: 8700,  clicks: 104,  notes: 'Highest save rate of any carousel. Educational carousels = share + save gold.' },
  { id: 'a10', title: 'Q&A: Does Creatine Cause Hair Loss?',      platform: 'Instagram', postType: 'Reel',     postDate: '2026-04-02', postUrl: '', views: 5600,  likes: 480,  comments: 130, shares: 90,   saves: 240,  reach: 4900,  clicks: 60,   notes: 'High comment volume — controversial hook works. Address this myth more.' },
  { id: 'a11', title: 'Why I Started MAXD',                      platform: 'TikTok',    postType: 'Reel',     postDate: '2026-04-06', postUrl: '', views: 31500, likes: 2600, comments: 195, shares: 640,  saves: 880,  reach: 28000, clicks: 410,  notes: 'Founder story = highest performing content type. Repeat this format monthly.' },
  { id: 'a12', title: 'Why I Started MAXD',                      platform: 'Instagram', postType: 'Reel',     postDate: '2026-04-06', postUrl: '', views: 11200, likes: 890,  comments: 75,  shares: 195,  saves: 490,  reach: 9800,  clicks: 135,  notes: 'Cross-posted from TikTok. Instagram audience smaller but conversion higher.' },
  { id: 'a13', title: 'Story: Mobility Tip',                     platform: 'Instagram', postType: 'Story',    postDate: '2026-04-07', postUrl: '', views: 2900,  likes: 0,    comments: 22,  shares: 30,   saves: 0,    reach: 2500,  clicks: 112,  notes: 'Story link clicks up 27% vs last week. Swipe-up rate improving.' },
  { id: 'a14', title: 'Performance Standard',                    platform: 'Instagram', postType: 'Post',     postDate: '2026-04-11', postUrl: '', views: 4200,  likes: 380,  comments: 28,  shares: 64,   saves: 195,  reach: 3800,  clicks: 52,   notes: 'Static posts outperform reels on saves. Good for evergreen content.' },
  { id: 'a15', title: 'Execution Consistency',                   platform: 'TikTok',    postType: 'Reel',     postDate: '2026-04-10', postUrl: '', views: 24800, likes: 1980, comments: 144, shares: 520,  saves: 730,  reach: 22000, clicks: 310,  notes: 'TOFU consistency content = strong acquisition. 3.2% click-through rate.' },
  { id: 'a16', title: 'Your Circle Standard',                    platform: 'TikTok',    postType: 'Reel',     postDate: '2026-04-13', postUrl: '', views: 38400, likes: 3100, comments: 248, shares: 840,  saves: 1020, reach: 34200, clicks: 490,  notes: 'Second-best performer. Tree quote in hook = very shareable. Follow-up content needed.' },
  { id: 'a17', title: 'Your Circle Standard',                    platform: 'Instagram', postType: 'Reel',     postDate: '2026-04-13', postUrl: '', views: 12600, likes: 940,  comments: 81,  shares: 210,  saves: 530,  reach: 11200, clicks: 148,  notes: 'Cross-post. Instagram showing growth vs prior month +34%.' },
  { id: 'a18', title: 'Longevity Framework',                     platform: 'Instagram', postType: 'Reel',     postDate: '2026-04-14', postUrl: '', views: 7800,  likes: 590,  comments: 52,  shares: 140,  saves: 360,  reach: 6900,  clicks: 88,   notes: 'Longevity angle testing well. 35+ audience spike on this content.' },
]

function initEntries() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw !== null) {
      const stored = JSON.parse(raw)
      if (Array.isArray(stored)) return stored
    }
  } catch {}
  return []   // start clean — no demo data
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_PLATFORMS  = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter/X', 'Pinterest']
const ALL_POST_TYPES = ['Reel', 'Story', 'Post', 'Carousel', 'Video', 'Short', 'Live']
const METRICS        = ['views', 'likes', 'comments', 'shares', 'saves', 'reach', 'clicks']

const PLATFORM_COLORS = {
  Instagram: '#E1306C',
  TikTok:    '#010101',
  YouTube:   '#FF0000',
  Facebook:  '#1877F2',
  'Twitter/X': '#1DA1F2',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function num(v) { return Number(v) || 0 }
function fmt(n) {
  const v = Number(n) || 0
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M'
  if (v >= 1000)    return (v / 1000).toFixed(1) + 'K'
  return v.toLocaleString()
}
function engRate(e) {
  const reach = num(e.reach) || num(e.views)
  if (!reach) return null
  const engaged = num(e.likes) + num(e.comments) + num(e.saves) + num(e.shares)
  return ((engaged / reach) * 100).toFixed(1)
}
function fmtDate(str) {
  if (!str) return ''
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Mini stat card ────────────────────────────────────────────────────────────
function MiniStat({ label, value, sub }) {
  return (
    <div className="card">
      <div style={{
        fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 26, fontWeight: 700, color: 'var(--navy)',
        fontFamily: 'var(--font-heading)', lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ─── Entry Modal ──────────────────────────────────────────────────────────────
function EntryModal({ entry, onSave, onClose, onDelete }) {
  const [draft, setDraft] = useState({ ...entry })
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  const er = engRate(draft)

  const inputStyle = {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--border-mid)',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-body)',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,25,41,0.5)',
        zIndex: 1000, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 20,
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: 16,
          padding: 28,
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'var(--navy)', fontFamily: 'var(--font-heading)', letterSpacing: '0.03em' }}>
            {loadEntries().find(e => e.id === draft.id) ? 'Edit Post' : 'Log New Post'}
          </div>
          {er !== null && (
            <div style={{
              fontSize: 13,
              color: Number(er) >= 5 ? 'var(--green-text)' : Number(er) >= 2 ? 'var(--amber-text)' : 'var(--text-muted)',
              fontWeight: 600,
              background: Number(er) >= 5 ? 'var(--green-bg)' : Number(er) >= 2 ? 'var(--amber-bg)' : 'var(--surface-3)',
              padding: '3px 10px',
              borderRadius: 99,
            }}>
              {er}% eng.
            </div>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1 }}>✕</button>
        </div>

        {/* Title */}
        <input
          value={draft.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Post title / caption…"
          style={{ ...inputStyle, marginBottom: 12, fontSize: 14, fontWeight: 500 }}
        />

        {/* Meta row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[
            { label: 'PLATFORM', key: 'platform', opts: ALL_PLATFORMS },
            { label: 'POST TYPE', key: 'postType', opts: ALL_POST_TYPES },
          ].map(({ label, key, opts }) => (
            <div key={key}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</div>
              <select value={draft[key]} onChange={e => set(key, e.target.value)} style={inputStyle}>
                <option value="">Select…</option>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 5 }}>POST DATE</div>
            <input type="date" value={draft.postDate} onChange={e => set('postDate', e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Metrics */}
        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 10 }}>
          Performance Metrics
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          {METRICS.map(m => (
            <div key={m}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 5 }}>{m.toUpperCase()}</div>
              <input
                type="number"
                value={draft[m] || ''}
                onChange={e => set(m, e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        {/* URL + notes */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 5 }}>POST URL</div>
          <input value={draft.postUrl} onChange={e => set('postUrl', e.target.value)} placeholder="https://…" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 5 }}>NOTES / LEARNINGS</div>
          <textarea
            value={draft.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            placeholder="What worked? What didn't?"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          {onDelete && (
            <button onClick={onDelete} className="btn btn-ghost">Delete</button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button onClick={() => onSave(draft)} className="btn btn-primary">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [entries,  setEntries]  = useState([])
  const [editing,  setEditing]  = useState(null)
  const [platform, setPlatform] = useState('all')
  const [sortBy,   setSortBy]   = useState('postDate')
  const [sortDir,  setSortDir]  = useState('desc')

  useEffect(() => { setEntries(initEntries()) }, [])

  function handleSave(updated) {
    const next = entries.some(e => e.id === updated.id)
      ? entries.map(e => e.id === updated.id ? updated : e)
      : [...entries, updated]
    saveEntries(next)
    setEntries(next)
    setEditing(null)
  }

  function handleDelete(id) {
    if (!confirm('Delete this entry?')) return
    const next = entries.filter(e => e.id !== id)
    saveEntries(next)
    setEntries(next)
    setEditing(null)
  }

  const filtered = entries.filter(e => platform === 'all' || e.platform === platform)
  const sorted   = [...filtered].sort((a, b) => {
    let va = a[sortBy], vb = b[sortBy]
    if (sortBy === 'postDate') { va = va || ''; vb = vb || '' }
    else { va = num(va); vb = num(vb) }
    return sortDir === 'desc' ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1)
  })

  const totalViews = filtered.reduce((s, e) => s + num(e.views), 0)
  const totalLikes = filtered.reduce((s, e) => s + num(e.likes), 0)
  const totalSaves = filtered.reduce((s, e) => s + num(e.saves), 0)
  const totalReach = filtered.reduce((s, e) => s + num(e.reach), 0)
  const avgEng     = filtered.length
    ? (filtered.reduce((s, e) => s + (Number(engRate(e)) || 0), 0) / filtered.length).toFixed(1)
    : '0.0'
  const topPost    = filtered.reduce((best, e) => num(e.views) > num(best?.views) ? e : best, null)

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const thStyle = col => ({
    padding: '10px 12px',
    fontSize: 10.5,
    fontWeight: 700,
    color: sortBy === col ? 'var(--navy)' : 'var(--text-muted)',
    textAlign: col !== 'title' ? 'right' : 'left',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    fontFamily: 'var(--font-body)',
  })

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Track post performance and engagement across platforms">
        <button onClick={() => setEditing(EMPTY_ENTRY())} className="btn btn-primary">
          + Log Post
        </button>
      </PageHeader>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        <MiniStat label="Total Views"   value={fmt(totalViews)} />
        <MiniStat label="Total Likes"   value={fmt(totalLikes)} />
        <MiniStat label="Total Saves"   value={fmt(totalSaves)} />
        <MiniStat label="Total Reach"   value={fmt(totalReach)} />
        <MiniStat label="Avg Eng. Rate" value={`${avgEng}%`} sub={Number(avgEng) >= 5 ? '↑ Strong' : Number(avgEng) >= 2 ? 'Moderate' : 'Needs work'} />
        <MiniStat label="Posts Logged"  value={filtered.length} />
      </div>

      {/* Top performer */}
      {topPost && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--red)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 20 }}>🏆</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Top Performer</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{topPost.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              {topPost.platform} · {fmtDate(topPost.postDate)} · {fmt(topPost.views)} views · {engRate(topPost)}% engagement
            </div>
          </div>
          <button
            onClick={() => setEditing(topPost)}
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '6px 12px' }}
          >
            Edit
          </button>
        </div>
      )}

      {/* Platform filter + sort controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', background: 'var(--surface-3)', padding: 3, borderRadius: 8 }}>
          {['all', ...ALL_PLATFORMS].map(p => {
            const count = p === 'all' ? entries.length : entries.filter(e => e.platform === p).length
            if (count === 0 && p !== 'all') return null
            const active = platform === p
            return (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                style={{
                  background: active ? 'var(--surface-2)' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  boxShadow: active ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.12s ease',
                }}
              >
                {p === 'all' ? 'All' : p} <span style={{ opacity: 0.6 }}>({count})</span>
              </button>
            )
          })}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>Sort by:</span>
          {[['postDate', 'Date'], ['views', 'Views'], ['likes', 'Likes'], ['saves', 'Saves']].map(([col, label]) => {
            const active = sortBy === col
            return (
              <button
                key={col}
                onClick={() => toggleSort(col)}
                style={{
                  background: active ? 'var(--surface-3)' : 'transparent',
                  border: `1px solid ${active ? 'var(--border-mid)' : 'transparent'}`,
                  borderRadius: 6,
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '4px 9px',
                  fontSize: 11.5,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {label} {active ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)', marginBottom: 6, fontFamily: 'var(--font-heading)', letterSpacing: '0.04em' }}>
            No Posts Logged Yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Log your post performance to track what's working across platforms.
          </div>
          <button onClick={() => setEditing(EMPTY_ENTRY())} className="btn btn-primary">
            Log Your First Post
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle('title'), textAlign: 'left' }} onClick={() => toggleSort('title')}>Post</th>
                  {['views', 'likes', 'comments', 'shares', 'saves'].map(col => (
                    <th key={col} onClick={() => toggleSort(col)} style={thStyle(col)}>
                      {col.charAt(0).toUpperCase() + col.slice(1)}
                      {sortBy === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                    </th>
                  ))}
                  <th style={thStyle('engagement')}>Eng %</th>
                  <th onClick={() => toggleSort('postDate')} style={thStyle('postDate')}>
                    Date {sortBy === 'postDate' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </th>
                  <th style={{ ...thStyle(''), cursor: 'default' }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e, i) => {
                  const er = engRate(e)
                  const pc = PLATFORM_COLORS[e.platform] || 'var(--text-muted)'
                  return (
                    <tr
                      key={e.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: i % 2 === 0 ? 'var(--surface-2)' : 'var(--surface)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={el => el.currentTarget.style.background = 'var(--surface-3)'}
                      onMouseLeave={el => el.currentTarget.style.background = i % 2 === 0 ? 'var(--surface-2)' : 'var(--surface)'}
                    >
                      <td style={{ padding: '11px 12px', maxWidth: 240 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: pc, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>
                              {e.title || 'Untitled'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                              {e.platform} · {e.postType}
                            </div>
                          </div>
                        </div>
                      </td>
                      {['views', 'likes', 'comments', 'shares', 'saves'].map(col => (
                        <td key={col} style={{ padding: '11px 12px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {num(e[col]) > 0 ? fmt(e[col]) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                      ))}
                      <td style={{ padding: '11px 12px', fontSize: 12.5, textAlign: 'right', fontWeight: 600 }}>
                        {er !== null ? (
                          <span style={{ color: Number(er) >= 5 ? 'var(--green-text)' : Number(er) >= 2 ? 'var(--amber-text)' : 'var(--text-muted)' }}>
                            {er}%
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 12px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        {fmtDate(e.postDate)}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                        <button
                          onClick={() => setEditing(e)}
                          className="btn btn-ghost"
                          style={{ fontSize: 11, padding: '4px 10px' }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AgentPanel
        module="analytics"
        contextData={{
          totalEntries: entries.length,
        }}
      />
      {editing && (
        <EntryModal
          entry={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
          onDelete={entries.some(e => e.id === editing.id) ? () => handleDelete(editing.id) : null}
        />
      )}
    </div>
  )
}
