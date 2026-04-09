import { useState, useEffect } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { getTeam } from '../lib/team.js'
import { getCredentials } from '../lib/credentials.js'

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORE_KEY = 'maxd_ads'

function loadAds()  { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]') } catch { return [] } }
function saveAds(d) { localStorage.setItem(STORE_KEY, JSON.stringify(d)) }
function uid()      { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

function EMPTY_AD() {
  return {
    id: uid(),
    name: '',
    platform: '',
    objective: '',
    status: 'draft',
    budget: '',
    startDate: '',
    endDate: '',
    audience: '',
    scriptId: '',
    variants: [{ id: uid(), label: 'Variant A', hook: '', body: '', cta: '', visualNotes: '', isControl: true }],
    performanceNotes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

const DEMO_ADS = [
  {
    id: 'ad1',
    name: 'Creatine Gummies — Awareness Push',
    platform: 'Meta',
    objective: 'Awareness',
    status: 'live',
    budget: '500',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    audience: 'Men 18-35, fitness interest, US',
    scriptId: '',
    variants: [
      { id: 'v1', label: 'Variant A', hook: 'Most people don\'t know creatine gummies exist.', body: 'MAXD Creatine Gummies give you the same performance boost as powder — without the mixing, the taste, or the clumps.', cta: 'Shop Now', visualNotes: 'Open on gym, cut to product', isControl: true },
      { id: 'v2', label: 'Variant B', hook: 'The easiest creatine you\'ve ever taken.', body: 'No powder. No mixing. Just pop 2 gummies and hit your workout. MAXD makes your gains simple.', cta: 'Try MAXD', visualNotes: 'Lifestyle B-roll — outdoor training', isControl: false },
    ],
    performanceNotes: 'Variant A outperforming on click-through. Variant B has higher completion rate.',
    createdAt: '2026-03-15T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'ad2',
    name: 'Retargeting — Website Visitors',
    platform: 'Meta',
    objective: 'Conversion',
    status: 'review',
    budget: '200',
    startDate: '2026-04-15',
    endDate: '',
    audience: 'Website visitors 30-day, lookalike',
    scriptId: '',
    variants: [
      { id: 'v3', label: 'Variant A', hook: 'Still thinking about it?', body: 'You already checked out MAXD. Don\'t leave your gains on the table — grab your first bottle today.', cta: 'Get 10% Off', visualNotes: 'Static product image with discount badge', isControl: true },
    ],
    performanceNotes: '',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
]

function initAds() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const stored = JSON.parse(raw)
      if (stored.length > 0) return stored
    }
  } catch {}
  saveAds(DEMO_ADS)
  return DEMO_ADS
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_PLATFORMS  = ['Meta', 'TikTok', 'YouTube', 'Google', 'Pinterest', 'Snapchat', 'Twitter/X']
const ALL_OBJECTIVES = ['Awareness', 'Traffic', 'Engagement', 'Leads', 'Conversion', 'Retargeting']

const STATUS_META = {
  draft:    { label: 'Draft',    bg: 'var(--border)', text: 'var(--gray-300)' },
  review:   { label: 'In Review',bg: 'var(--amber-bg)',  text: 'var(--amber-text)' },
  live:     { label: 'Live',     bg: 'var(--green-bg)',  text: 'var(--green-text)' },
  paused:   { label: 'Paused',   bg: '#FDE8EE',          text: 'var(--red)' },
  complete: { label: 'Complete', bg: 'var(--border)', text: 'var(--gray-500)' },
}

// ─── AI copy helper ───────────────────────────────────────────────────────────
async function generateAdCopy(ad, variant, platform) {
  const creds = getCredentials('anthropic')
  const apiKey = creds?.apiKey
  if (!apiKey) throw new Error('no_key')

  const prompt = `You are a direct-response ad copywriter for MAXD, a supplement brand selling Creatine Gummies.

Campaign: ${ad.name}
Platform: ${platform || ad.platform || 'Meta'}
Objective: ${ad.objective || 'Conversion'}
Audience: ${ad.audience || 'fitness enthusiasts'}

Write ad copy for this variant. Return ONLY a JSON object with these keys:
- hook: (the attention-grabbing first line, max 10 words)
- body: (main ad copy, 2-3 sentences, benefit-focused)
- cta: (call-to-action button text, max 4 words)
- visualNotes: (brief creative direction for the visual/video, 1 sentence)

JSON only, no explanation.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error('api_error')
  const data = await res.json()
  const text = data.content?.[0]?.text || ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('parse_error')
  return JSON.parse(match[0])
}

// ─── AdCard ───────────────────────────────────────────────────────────────────
function AdCard({ ad, onSelect }) {
  const sm = STATUS_META[ad.status] || STATUS_META.draft
  return (
    <div
      className="card"
      onClick={() => onSelect(ad)}
      style={{ cursor: 'pointer', border: '1px solid var(--border)', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--red)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{ad.name || 'Untitled Campaign'}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
            {[ad.platform, ad.objective].filter(Boolean).join(' · ') || 'No platform set'}
          </div>
        </div>
        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', background: sm.bg, color: sm.text, whiteSpace: 'nowrap' }}>
          {sm.label}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--gray-400)' }}>
        {ad.budget && <span>💰 ${ad.budget}/mo</span>}
        <span>📝 {ad.variants?.length || 0} variant{ad.variants?.length !== 1 ? 's' : ''}</span>
        {ad.audience && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>👥 {ad.audience}</span>}
      </div>
    </div>
  )
}

// ─── VariantEditor ─────────────────────────────────────────────────────────────
function VariantEditor({ variant, ad, onChange, onDelete, canDelete }) {
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState('')

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const copy = await generateAdCopy(ad, variant, ad.platform)
      onChange({ ...variant, ...copy })
    } catch (e) {
      setError(e.message === 'no_key' ? 'Add your Anthropic API key in Settings to use AI.' : 'AI generation failed. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  const fieldStyle = {
    width: '100%', background: 'var(--surface)', border: '1px solid var(--border-mid)',
    borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text-primary)', outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 14, border: '1px solid var(--border)', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input
          value={variant.label}
          onChange={e => onChange({ ...variant, label: e.target.value })}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}
        />
        {variant.isControl && (
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#1e3a5f', color: '#60a5fa', fontWeight: 700 }}>CONTROL</span>
        )}
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{ background: generating ? 'var(--border)' : '#1e1e2e', border: '1px solid var(--gray-600)', borderRadius: 7, color: generating ? 'var(--gray-500)' : '#a78bfa', padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer' }}
        >
          {generating ? '✦ Generating…' : '✦ AI Write'}
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            style={{ background: 'none', border: 'none', color: 'var(--gray-600)', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}
          >✕</button>
        )}
      </div>

      {error && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 8 }}>{error}</div>}

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>HOOK (opening line)</label>
        <input
          value={variant.hook}
          onChange={e => onChange({ ...variant, hook: e.target.value })}
          placeholder="What stops the scroll…"
          style={fieldStyle}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>BODY COPY</label>
        <textarea
          value={variant.body}
          onChange={e => onChange({ ...variant, body: e.target.value })}
          rows={3}
          placeholder="Main ad message…"
          style={{ ...fieldStyle, resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>CALL TO ACTION</label>
          <input
            value={variant.cta}
            onChange={e => onChange({ ...variant, cta: e.target.value })}
            placeholder="e.g. Shop Now"
            style={fieldStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>VISUAL NOTES</label>
          <input
            value={variant.visualNotes}
            onChange={e => onChange({ ...variant, visualNotes: e.target.value })}
            placeholder="Creative direction…"
            style={fieldStyle}
          />
        </div>
      </div>
    </div>
  )
}

// ─── AdEditor ─────────────────────────────────────────────────────────────────
function AdEditor({ ad, onSave, onBack, onDelete }) {
  const [draft, setDraft] = useState({ ...ad })
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))

  function updateVariant(id, updated) {
    setDraft(d => ({ ...d, variants: d.variants.map(v => v.id === id ? updated : v) }))
  }
  function deleteVariant(id) {
    setDraft(d => ({ ...d, variants: d.variants.filter(v => v.id !== id) }))
  }
  function addVariant() {
    const idx = draft.variants.length
    const label = `Variant ${String.fromCharCode(65 + idx)}`
    setDraft(d => ({ ...d, variants: [...d.variants, { id: uid(), label, hook: '', body: '', cta: '', visualNotes: '', isControl: false }] }))
  }

  const fieldStyle = {
    width: '100%', background: 'var(--surface)', border: '1px solid var(--border-mid)',
    borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text-primary)', outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'var(--surface-3)', border: '1px solid var(--border-mid)', borderRadius: 8, color: 'var(--text-secondary)', padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          ← Back
        </button>
        <input
          value={draft.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Campaign name…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--navy)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          {onDelete && (
            <button onClick={onDelete} style={{ background: 'transparent', border: '1px solid var(--border-mid)', borderRadius: 8, color: 'var(--text-muted)', padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Delete
            </button>
          )}
          <button
            onClick={() => onSave({ ...draft, updatedAt: new Date().toISOString() })}
            style={{ background: 'var(--red)', border: 'none', borderRadius: 8, color: 'var(--white)', padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Save
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        {/* Variants */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Ad Variants ({draft.variants.length})
          </div>
          {draft.variants.map(v => (
            <VariantEditor
              key={v.id}
              variant={v}
              ad={draft}
              onChange={updated => updateVariant(v.id, updated)}
              onDelete={() => deleteVariant(v.id)}
              canDelete={draft.variants.length > 1}
            />
          ))}
          <button
            onClick={addVariant}
            style={{ width: '100%', background: 'none', border: '1px dashed var(--gray-700)', borderRadius: 10, color: 'var(--gray-500)', padding: '10px', fontSize: 13, cursor: 'pointer', marginTop: 4 }}
          >
            + Add Variant
          </button>

          {/* Performance notes */}
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              Performance Notes
            </div>
            <textarea
              value={draft.performanceNotes}
              onChange={e => set('performanceNotes', e.target.value)}
              rows={3}
              placeholder="Track what's working, CTR, ROAS, learnings…"
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Campaign Details</div>

            <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>PLATFORM</label>
            <select value={draft.platform} onChange={e => set('platform', e.target.value)} style={{ ...fieldStyle, marginBottom: 10 }}>
              <option value="">Select platform…</option>
              {ALL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>OBJECTIVE</label>
            <select value={draft.objective} onChange={e => set('objective', e.target.value)} style={{ ...fieldStyle, marginBottom: 10 }}>
              <option value="">Select objective…</option>
              {ALL_OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>

            <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>STATUS</label>
            <select value={draft.status} onChange={e => set('status', e.target.value)} style={{ ...fieldStyle, marginBottom: 10 }}>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>

            <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>MONTHLY BUDGET ($)</label>
            <input type="number" value={draft.budget} onChange={e => set('budget', e.target.value)} placeholder="0" style={{ ...fieldStyle, marginBottom: 10 }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>START DATE</label>
                <input type="date" value={draft.startDate} onChange={e => set('startDate', e.target.value)} style={{ ...fieldStyle, colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>END DATE</label>
                <input type="date" value={draft.endDate} onChange={e => set('endDate', e.target.value)} style={{ ...fieldStyle, colorScheme: 'dark' }} />
              </div>
            </div>

            <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>TARGET AUDIENCE</label>
            <textarea
              value={draft.audience}
              onChange={e => set('audience', e.target.value)}
              rows={2}
              placeholder="Age, interests, geography…"
              style={{ ...fieldStyle, resize: 'none' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Ads() {
  const [ads,      setAds]      = useState([])
  const [selected, setSelected] = useState(null)
  const [filter,   setFilter]   = useState('all')

  useEffect(() => { setAds(initAds()) }, [])

  function handleSave(updated) {
    const next = ads.some(a => a.id === updated.id)
      ? ads.map(a => a.id === updated.id ? updated : a)
      : [...ads, updated]
    saveAds(next)
    setAds(next)
    setSelected(updated)
  }

  function handleDelete(id) {
    if (!confirm('Delete this campaign?')) return
    const next = ads.filter(a => a.id !== id)
    saveAds(next)
    setAds(next)
    setSelected(null)
  }

  const filtered = filter === 'all' ? ads : ads.filter(a => a.status === filter)

  // Stats
  const live     = ads.filter(a => a.status === 'live').length
  const inReview = ads.filter(a => a.status === 'review').length
  const totalBudget = ads.filter(a => a.status === 'live').reduce((s, a) => s + (Number(a.budget) || 0), 0)

  if (selected) {
    return (
      <div>
        <PageHeader title="Ad Creative" subtitle="Manage campaigns and copy variants" />
        <AdEditor
          ad={selected}
          onSave={handleSave}
          onBack={() => setSelected(null)}
          onDelete={ads.some(a => a.id === selected.id) ? () => handleDelete(selected.id) : null}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Ad Creative"
        subtitle="Manage campaigns and copy variants"
        actions={
          <button
            onClick={() => setSelected(EMPTY_AD())}
            style={{ background: 'var(--red)', border: 'none', borderRadius: 8, color: 'var(--white)', padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + New Campaign
          </button>
        }
      />

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div className="card">
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total Campaigns</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', fontFamily: 'var(--font-heading)' }}>{ads.length}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Live</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#4ade80', fontFamily: 'var(--font-heading)' }}>{live}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>In Review</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-heading)' }}>{inReview}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Live Budget</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', fontFamily: 'var(--font-heading)' }}>${totalBudget.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: 'var(--gray-500)' }}>per month</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {['all', 'draft', 'review', 'live', 'paused', 'complete'].map(f => {
          const count = f === 'all' ? ads.length : ads.filter(a => a.status === f).length
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? 'var(--navy)' : 'var(--surface-2)',
                border: '1px solid ' + (filter === f ? 'var(--red)' : 'var(--border)'),
                borderRadius: 8, color: filter === f ? 'var(--white)' : 'var(--gray-400)',
                padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              {f === 'all' ? 'All' : STATUS_META[f]?.label || f} {count > 0 && `(${count})`}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📢</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>No campaigns yet</div>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 16 }}>Create ad campaigns with multiple copy variants and AI-generated copy.</div>
          <button
            onClick={() => setSelected(EMPTY_AD())}
            style={{ background: 'var(--red)', border: 'none', borderRadius: 8, color: 'var(--white)', padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Create First Campaign
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map(a => <AdCard key={a.id} ad={a} onSelect={setSelected} />)}
        </div>
      )}
    </div>
  )
}
