import { useState, useEffect, useRef } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { getTeam } from '../lib/team.js'
import { dbSet, dbGet } from '../lib/db.js'

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORE_KEY = 'maxd_launches'

function loadLaunches() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]') } catch { return [] }
}
function saveLaunches(data) {
  dbSet(STORE_KEY, data)
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

function EMPTY_LAUNCH() {
  return {
    id: uid(),
    name: '',
    product: '',
    status: 'planning',
    launchDate: '',
    description: '',
    checklist: [],   // [{ id, phase, text, assignedTo, dueDate, done }]
    contentIds: [],  // linked calendar IDs
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

const PHASES = ['Pre-Launch', 'Launch Day', 'Post-Launch']

const DEMO_CHECKLIST = [
  { id: 'c1', phase: 'Pre-Launch',  text: 'Finalize product photography',     assignedTo: '', dueDate: '', done: false },
  { id: 'c2', phase: 'Pre-Launch',  text: 'Write 3 teaser scripts',           assignedTo: '', dueDate: '', done: false },
  { id: 'c3', phase: 'Pre-Launch',  text: 'Build email waitlist sequence',    assignedTo: '', dueDate: '', done: false },
  { id: 'c4', phase: 'Pre-Launch',  text: 'Set up landing page',              assignedTo: '', dueDate: '', done: false },
  { id: 'c5', phase: 'Launch Day',  text: 'Post launch reel across platforms',assignedTo: '', dueDate: '', done: false },
  { id: 'c6', phase: 'Launch Day',  text: 'Send launch email to list',        assignedTo: '', dueDate: '', done: false },
  { id: 'c7', phase: 'Launch Day',  text: 'Run first paid ad',                assignedTo: '', dueDate: '', done: false },
  { id: 'c8', phase: 'Post-Launch', text: 'Collect first week reviews',       assignedTo: '', dueDate: '', done: false },
  { id: 'c9', phase: 'Post-Launch', text: 'Post results / social proof',      assignedTo: '', dueDate: '', done: false },
]

const DEMO_LAUNCHES = [
  {
    id: 'launch1',
    name: 'MAXD Creatine Gummies — Spring Launch',
    product: 'Creatine Gummies (Original)',
    status: 'active',
    launchDate: '2026-05-01',
    description: 'Full go-to-market push for the flagship creatine gummy product across social, email, and paid.',
    checklist: DEMO_CHECKLIST.map(c => ({ ...c, id: uid() })),
    contentIds: [],
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
]

function initLaunches() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw !== null) {
      const stored = JSON.parse(raw)
      if (Array.isArray(stored)) return stored   // return even if empty — respect intentional clears
    }
  } catch {}
  saveLaunches(DEMO_LAUNCHES)
  return DEMO_LAUNCHES
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return ''
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function daysUntil(str) {
  if (!str) return null
  return Math.ceil((new Date(str + 'T00:00:00') - new Date(new Date().toISOString().split('T')[0] + 'T00:00:00')) / 86400000)
}

const STATUS_META = {
  planning: { label: 'Planning',  bg: 'var(--border)', text: 'var(--gray-300)' },
  active:   { label: 'Active',    bg: 'var(--amber-bg)',  text: 'var(--amber-text)' },
  complete: { label: 'Complete',  bg: 'var(--green-bg)',  text: 'var(--green-text)' },
}

// ─── LaunchCard ───────────────────────────────────────────────────────────────
function LaunchCard({ launch, onSelect }) {
  const total = launch.checklist.length
  const done  = launch.checklist.filter(c => c.done).length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0
  const du    = daysUntil(launch.launchDate)
  const sm    = STATUS_META[launch.status] || STATUS_META.planning

  return (
    <div
      className="card"
      onClick={() => onSelect(launch)}
      style={{ cursor: 'pointer', transition: 'border-color 0.15s', border: '1px solid var(--border)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--red)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{launch.name || 'Untitled Launch'}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{launch.product || 'No product'}</div>
        </div>
        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', background: sm.bg, color: sm.text, whiteSpace: 'nowrap' }}>
          {sm.label}
        </span>
      </div>

      {launch.launchDate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>🚀 {fmtDate(launch.launchDate)}</span>
          {du !== null && (
            <span style={{ fontSize: 11, color: du <= 7 && du >= 0 ? 'var(--red)' : 'var(--gray-500)', fontWeight: 500 }}>
              {du < 0 ? `${Math.abs(du)}d ago` : du === 0 ? '· Today!' : `· ${du}d`}
            </span>
          )}
        </div>
      )}

      {total > 0 && (
        <>
          <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#4ade80' : 'var(--red)', borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{done}/{total} tasks · {pct}% complete</div>
        </>
      )}
    </div>
  )
}

// ─── ChecklistItem ────────────────────────────────────────────────────────────
function ChecklistItem({ item, team, onChange, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 8, marginBottom: 4, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
        <input
          type="checkbox"
          checked={item.done}
          onChange={e => onChange({ ...item, done: e.target.checked })}
          style={{ width: 15, height: 15, flexShrink: 0, accentColor: 'var(--red)', cursor: 'pointer' }}
        />
        <input
          value={item.text}
          onChange={e => onChange({ ...item, text: e.target.value })}
          placeholder="Task description…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: item.done ? 'var(--gray-500)' : 'var(--white)', textDecoration: item.done ? 'line-through' : 'none' }}
        />
        <button
          onClick={() => setExpanded(x => !x)}
          style={{ background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer', fontSize: 11, padding: '2px 4px' }}
        >
          {expanded ? '▲' : '▼'}
        </button>
        <button
          onClick={onDelete}
          style={{ background: 'none', border: 'none', color: 'var(--gray-600)', cursor: 'pointer', fontSize: 13, padding: '2px 4px' }}
        >✕</button>
      </div>
      {expanded && (
        <div style={{ padding: '0 10px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 0 }}>
          <div>
            <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>ASSIGNED TO</label>
            <select
              value={item.assignedTo || ''}
              onChange={e => onChange({ ...item, assignedTo: e.target.value })}
              style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border-mid)', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--text-primary)', outline: 'none' }}
            >
              <option value="">Unassigned</option>
              {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>DUE DATE</label>
            <input
              type="date"
              value={item.dueDate || ''}
              onChange={e => onChange({ ...item, dueDate: e.target.value })}
              style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border-mid)', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--text-primary)', outline: 'none', colorScheme: 'dark' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── LaunchEditor ─────────────────────────────────────────────────────────────
function LaunchEditor({ launch, team, onSave, onBack, onDelete }) {
  const [draft, setDraft] = useState({ ...launch })
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))

  // Auto-save to localStorage whenever draft changes (skip initial render)
  const skipFirst = useRef(true)
  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return }
    if (!draft.id) return
    const t = setTimeout(() => {
      try {
        const list = JSON.parse(localStorage.getItem(STORE_KEY) || '[]')
        const next = list.map(l => l.id === draft.id ? { ...draft, updatedAt: new Date().toISOString() } : l)
        if (next.some(l => l.id === draft.id)) saveLaunches(next)
      } catch {}
    }, 600)
    return () => clearTimeout(t)
  }, [draft])

  function updateCheckItem(id, updated) {
    setDraft(d => ({ ...d, checklist: d.checklist.map(c => c.id === id ? updated : c) }))
  }
  function deleteCheckItem(id) {
    setDraft(d => ({ ...d, checklist: d.checklist.filter(c => c.id !== id) }))
  }
  function addCheckItem(phase) {
    const item = { id: uid(), phase, text: '', assignedTo: '', dueDate: '', done: false }
    setDraft(d => ({ ...d, checklist: [...d.checklist, item] }))
  }

  const phaseItems = (phase) => draft.checklist.filter(c => c.phase === phase)

  function handleSave() {
    onSave({ ...draft, updatedAt: new Date().toISOString() })
  }

  const total = draft.checklist.length
  const done  = draft.checklist.filter(c => c.done).length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button
          onClick={onBack}
          style={{ background: 'var(--surface-3)', border: '1px solid var(--border-mid)', borderRadius: 8, color: 'var(--text-secondary)', padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <input
            value={draft.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Launch name…"
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--navy)', letterSpacing: '0.04em' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onDelete && (
            <button
              onClick={onDelete}
              style={{ background: 'transparent', border: '1px solid var(--border-mid)', borderRadius: 8, color: 'var(--text-muted)', padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
            >
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            style={{ background: 'var(--red)', border: 'none', borderRadius: 8, color: 'var(--white)', padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Save
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Checklist */}
        <div>
          {/* Progress bar */}
          {total > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Overall Progress</span>
                <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{done}/{total} tasks · {pct}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#4ade80' : 'var(--red)', borderRadius: 4, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {PHASES.map(phase => {
            const items = phaseItems(phase)
            const phaseDone = items.filter(i => i.done).length
            const phaseColors = { 'Pre-Launch': '#2563EB', 'Launch Day': 'var(--red)', 'Post-Launch': '#059669' }
            return (
              <div key={phase} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: phaseColors[phase], flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{phase}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{phaseDone}/{items.length}</div>
                </div>
                {items.map(item => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    team={team}
                    onChange={updated => updateCheckItem(item.id, updated)}
                    onDelete={() => deleteCheckItem(item.id)}
                  />
                ))}
                <button
                  onClick={() => addCheckItem(phase)}
                  style={{ marginTop: 4, background: 'none', border: '1px dashed var(--gray-700)', borderRadius: 8, color: 'var(--gray-500)', padding: '7px 12px', fontSize: 12, cursor: 'pointer', width: '100%', textAlign: 'left' }}
                >
                  + Add task to {phase}
                </button>
              </div>
            )
          })}
        </div>

        {/* Details sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Launch Details</div>

            <label style={{ fontSize: 11, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>PRODUCT</label>
            <input
              value={draft.product}
              onChange={e => set('product', e.target.value)}
              placeholder="e.g. Creatine Gummies"
              style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border-mid)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
            />

            <label style={{ fontSize: 11, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>STATUS</label>
            <select
              value={draft.status}
              onChange={e => set('status', e.target.value)}
              style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border-mid)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', marginBottom: 12 }}
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="complete">Complete</option>
            </select>

            <label style={{ fontSize: 11, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>LAUNCH DATE</label>
            <input
              type="date"
              value={draft.launchDate}
              onChange={e => set('launchDate', e.target.value)}
              style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border-mid)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', marginBottom: 12, boxSizing: 'border-box', colorScheme: 'dark' }}
            />

            <label style={{ fontSize: 11, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>DESCRIPTION</label>
            <textarea
              value={draft.description}
              onChange={e => set('description', e.target.value)}
              rows={4}
              placeholder="What is this launch about?"
              style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border-mid)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          {/* Task summary by phase */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Task Summary</div>
            {PHASES.map(phase => {
              const items = draft.checklist.filter(c => c.phase === phase)
              const d = items.filter(i => i.done).length
              const phaseColors = { 'Pre-Launch': '#2563EB', 'Launch Day': 'var(--red)', 'Post-Launch': '#059669' }
              return (
                <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: phaseColors[phase] }} />
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--gray-300)' }}>{phase}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{d}/{items.length}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Launches() {
  const [launches, setLaunches] = useState([])
  const [selected, setSelected] = useState(null)
  const [filter, setFilter]     = useState('all')
  const team = getTeam()

  useEffect(() => {
    setLaunches(initLaunches())
    dbGet(STORE_KEY).then(d => { if (d) setLaunches(d) })
  }, [])

  function handleSave(updated) {
    const next = launches.some(l => l.id === updated.id)
      ? launches.map(l => l.id === updated.id ? updated : l)
      : [...launches, updated]
    saveLaunches(next)
    setLaunches(next)
    setSelected(updated)
  }

  function handleDelete(id) {
    if (!confirm('Delete this launch?')) return
    const next = launches.filter(l => l.id !== id)
    saveLaunches(next)
    setLaunches(next)
    setSelected(null)
  }

  function handleNew() {
    const nl = EMPTY_LAUNCH()
    setSelected(nl)
  }

  const filtered = filter === 'all' ? launches : launches.filter(l => l.status === filter)

  if (selected) {
    return (
      <div>
        <PageHeader title="Launch Planner" subtitle="Plan and track your product launches" />
        <LaunchEditor
          launch={selected}
          team={team}
          onSave={handleSave}
          onBack={() => setSelected(null)}
          onDelete={launches.some(l => l.id === selected.id) ? () => handleDelete(selected.id) : null}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Launch Planner"
        subtitle="Plan and track your product launches"
        actions={
          <button
            onClick={handleNew}
            style={{ background: 'var(--red)', border: 'none', borderRadius: 8, color: 'var(--white)', padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + New Launch
          </button>
        }
      />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {['all', 'planning', 'active', 'complete'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? 'var(--red)' : 'var(--navy-light)',
              border: '1px solid ' + (filter === f ? 'var(--red)' : 'var(--border)'),
              borderRadius: 8, color: filter === f ? 'var(--white)' : 'var(--gray-400)',
              padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
            }}
          >
            {f === 'all' ? `All (${launches.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--white)', marginBottom: 6 }}>No launches yet</div>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 16 }}>Plan your next product launch with checklists, timelines, and team assignments.</div>
          <button
            onClick={handleNew}
            style={{ background: 'var(--red)', border: 'none', borderRadius: 8, color: 'var(--white)', padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Plan Your First Launch
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(l => <LaunchCard key={l.id} launch={l} onSelect={setSelected} />)}
        </div>
      )}
    </div>
  )
}
