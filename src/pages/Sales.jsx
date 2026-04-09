import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import { getShopifyOrders, getShopifyProducts } from '../lib/api.js'
import { isConnected, getCredentials } from '../lib/credentials.js'

// ── Shopify overview panel ─────────────────────────────────────────────────
function ShopifyPanel() {
  const connected  = isConnected('shopify')
  const creds      = getCredentials('shopify') || {}
  const storeUrl   = creds.storeUrl || ''
  const adminUrl   = storeUrl ? `https://${storeUrl.replace(/^https?:\/\//, '')}/admin` : 'https://admin.shopify.com'

  const [data, setData]   = useState({ orders: [], products: [], loading: false, error: null, loaded: false })

  const load = async () => {
    setData(d => ({ ...d, loading: true, error: null }))
    try {
      const [orders, products] = await Promise.all([getShopifyOrders(20), getShopifyProducts()])
      setData({ orders, products, loading: false, error: null, loaded: true })
    } catch (err) {
      setData(d => ({ ...d, loading: false, error: err.message || 'Failed to load', loaded: false }))
    }
  }

  if (!connected) {
    return (
      <div className="card" style={{ marginBottom: '1.5rem', border: '1.5px dashed var(--gray-200)', textAlign: 'center', padding: '2rem 1.5rem' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🛍</div>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, color: 'var(--navy)', letterSpacing: '0.06em', marginBottom: 6 }}>CONNECT SHOPIFY</div>
        <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 14, lineHeight: 1.6 }}>
          Connect your Shopify store to see orders, revenue, and top products here.
        </div>
        <Link to="/settings" style={{ fontSize: 12, fontWeight: 700, padding: '8px 20px', borderRadius: 6, background: '#639922', color: 'var(--white)', textDecoration: 'none', display: 'inline-block' }}>
          Connect in Settings →
        </Link>
      </div>
    )
  }

  // Connected but not loaded yet
  if (!data.loaded && !data.loading) {
    return (
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🛍</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Shopify Connected</div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{storeUrl || 'Store linked'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={adminUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: '6px 14px', borderRadius: 6, background: '#639922', color: 'var(--white)', textDecoration: 'none', fontWeight: 600 }}>Open Admin ↗</a>
          <button onClick={load} style={{ fontSize: 11, padding: '6px 14px', borderRadius: 6, border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--navy)', cursor: 'pointer', fontWeight: 600 }}>Load Orders</button>
        </div>
      </div>
    )
  }

  if (data.loading) {
    return (
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
        ⟳ Loading Shopify data…
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
        <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>✗ Shopify error: {data.error}</div>
        <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Note: Shopify API requires a backend proxy to avoid CORS. This works once deployed.</div>
        <button onClick={load} style={{ marginTop: 8, fontSize: 11, padding: '4px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: 'var(--white)', color: '#dc2626', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  // Data loaded
  const revenue = data.orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0)
  const avgOrder = data.orders.length ? revenue / data.orders.length : 0
  const topProducts = (data.products || []).slice(0, 3)

  return (
    <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', letterSpacing: '0.08em' }}>🛍 SHOPIFY OVERVIEW</div>
        <a href={adminUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#639922', textDecoration: 'none', fontWeight: 600 }}>Open Admin ↗</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1rem' }}>
        {[
          { label: 'Orders (recent)', value: data.orders.length },
          { label: 'Revenue',         value: `$${revenue.toFixed(2)}` },
          { label: 'Avg Order',       value: `$${avgOrder.toFixed(2)}` },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--gray-400)', letterSpacing: '0.06em', marginBottom: 2 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>{s.value}</div>
          </div>
        ))}
      </div>
      {topProducts.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', letterSpacing: '0.06em', marginBottom: 6 }}>TOP PRODUCTS</div>
          {topProducts.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--gray-100)', color: 'var(--navy)' }}>
              <span>{p.title}</span>
              <span style={{ color: 'var(--gray-400)' }}>{p.variants?.[0]?.price ? `$${p.variants[0].price}` : '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Storage helpers ────────────────────────────────────────────────────────
const STORAGE_KEY = 'maxd_sales_leads'

function loadLeads() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
}
function saveLeads(leads) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads))
}
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

// ── Constants ──────────────────────────────────────────────────────────────
const SOURCES = ['Instagram DM', 'TikTok', 'Email', 'Referral', 'LinkedIn', 'Cold Outreach', 'Inbound', 'Event', 'Other']
const STATUSES = ['New', 'Contacted', 'Follow-up', 'Negotiating', 'Closed Won', 'Closed Lost']
const STATUS_COLORS = {
  'New':          { bg: '#e0f2fe', color: '#0369a1' },
  'Contacted':    { bg: '#fef9c3', color: '#854d0e' },
  'Follow-up':    { bg: '#fef3c7', color: '#92400e' },
  'Negotiating':  { bg: '#ede9fe', color: '#5b21b6' },
  'Closed Won':   { bg: '#dcfce7', color: '#15803d' },
  'Closed Lost':  { bg: '#fee2e2', color: '#b91c1c' },
}
const TEAM = ['Kyle', 'Other']
const STRENGTHS = [1, 2, 3, 4, 5]

const EMPTY_LEAD = {
  name: '', company: '', email: '', phone: '',
  source: 'Instagram DM', assignedTo: 'Kyle',
  status: 'New', strength: 3,
  firstContact: '', lastContact: '',
  touchCount: 0, dealValue: '',
  notes: '', tags: '',
}

// ── Strength stars ─────────────────────────────────────────────────────────
function Stars({ value, onChange, readonly }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {STRENGTHS.map(s => (
        <span
          key={s}
          onClick={() => !readonly && onChange && onChange(s)}
          style={{
            fontSize: 14, cursor: readonly ? 'default' : 'pointer',
            color: s <= value ? '#f59e0b' : 'var(--gray-200)',
            transition: 'color 0.1s',
          }}
        >★</span>
      ))}
    </div>
  )
}

// ── Lead form modal ────────────────────────────────────────────────────────
function LeadModal({ lead, onClose, onSave }) {
  const [form, setForm] = useState(lead ? { ...lead } : { ...EMPTY_LEAD, firstContact: new Date().toISOString().split('T')[0] })
  const isNew = !lead

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = () => {
    if (!form.name.trim()) return
    onSave({
      ...form,
      lastContact: form.lastContact || form.firstContact || new Date().toISOString().split('T')[0],
      id: form.id || newId(),
      createdAt: form.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', border: '1.5px solid var(--gray-200)',
    borderRadius: 6, fontSize: 12, color: 'var(--navy)',
    background: 'var(--white)', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 4, letterSpacing: '0.04em' }
  const fieldStyle = { marginBottom: '0.85rem' }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--white)', borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: 580,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh',
      }}>
        {/* Header */}
        <div style={{ background: 'var(--navy)', padding: '1.1rem 1.5rem', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-heading)', color: 'var(--white)', fontSize: 14, letterSpacing: '0.06em' }}>
            {isNew ? 'ADD LEAD' : 'EDIT LEAD'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gray-400)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>

            <div style={fieldStyle}>
              <label style={labelStyle}>NAME *</label>
              <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>COMPANY / BRAND</label>
              <input style={inputStyle} value={form.company} onChange={e => set('company', e.target.value)} placeholder="Company name" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>EMAIL</label>
              <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>PHONE</label>
              <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>SOURCE</label>
              <select style={inputStyle} value={form.source} onChange={e => set('source', e.target.value)}>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>ASSIGNED TO</label>
              <select style={inputStyle} value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)}>
                {TEAM.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>STATUS</label>
              <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>DEAL VALUE ($)</label>
              <input style={inputStyle} value={form.dealValue} onChange={e => set('dealValue', e.target.value)} placeholder="0.00" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>FIRST CONTACT</label>
              <input style={inputStyle} type="date" value={form.firstContact} onChange={e => set('firstContact', e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>LAST CONTACT</label>
              <input style={inputStyle} type="date" value={form.lastContact} onChange={e => set('lastContact', e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>TIMES CONTACTED</label>
              <input style={inputStyle} type="number" min="0" value={form.touchCount} onChange={e => set('touchCount', parseInt(e.target.value) || 0)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>LEAD STRENGTH</label>
              <div style={{ paddingTop: 6 }}>
                <Stars value={form.strength} onChange={v => set('strength', v)} />
              </div>
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>TAGS (comma separated)</label>
            <input style={inputStyle} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="e.g. retail, bulk, influencer" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>NOTES</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
              value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Context, previous conversations, key info…"
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-600)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={!form.name.trim()} style={{ fontSize: 12, padding: '7px 20px', borderRadius: 6, border: 'none', background: form.name.trim() ? 'var(--red)' : 'var(--gray-200)', color: 'var(--white)', cursor: form.name.trim() ? 'pointer' : 'default', fontWeight: 700 }}>
            {isNew ? 'Add Lead' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Touch log modal ────────────────────────────────────────────────────────
function TouchModal({ lead, onClose, onLog }) {
  const [note, setNote] = useState('')
  const [method, setMethod] = useState('Email')

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ background: 'var(--navy)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--font-heading)', color: 'var(--white)', fontSize: 13, letterSpacing: '0.06em' }}>LOG TOUCHPOINT</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gray-400)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: '0.75rem' }}>{lead.name}</div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 4 }}>METHOD</label>
            <select value={method} onChange={e => setMethod(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--gray-200)', borderRadius: 6, fontSize: 12 }}>
              {['Email', 'DM', 'Phone Call', 'Text', 'In Person', 'Other'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 4 }}>NOTE</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="What happened? What was discussed?" style={{ width: '100%', minHeight: 80, padding: '8px 10px', border: '1.5px solid var(--gray-200)', borderRadius: 6, fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
        </div>
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-600)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => { onLog(lead.id, method, note); onClose() }} style={{ fontSize: 12, padding: '6px 16px', borderRadius: 6, border: 'none', background: 'var(--navy)', color: 'var(--white)', cursor: 'pointer', fontWeight: 700 }}>Log</button>
        </div>
      </div>
    </div>
  )
}

// ── Lead row ───────────────────────────────────────────────────────────────
function LeadRow({ lead, onEdit, onDelete, onTouch, onStatusChange }) {
  const [expanded, setExpanded] = useState(false)
  const sc = STATUS_COLORS[lead.status] || {}

  return (
    <>
      <tr style={{ borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>
          <div>{lead.name}</div>
          {lead.company && <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 400 }}>{lead.company}</div>}
        </td>
        <td style={{ padding: '10px 12px' }}>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'var(--gray-100)', color: 'var(--gray-600)' }}>{lead.source}</span>
        </td>
        <td style={{ padding: '10px 12px' }}>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: sc.bg, color: sc.color, fontWeight: 600 }}>{lead.status}</span>
        </td>
        <td style={{ padding: '10px 12px' }}><Stars value={lead.strength} readonly /></td>
        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--gray-500)' }}>{lead.assignedTo}</td>
        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--gray-500)', textAlign: 'center' }}>{lead.touchCount}</td>
        <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--gray-400)' }}>{lead.lastContact || '—'}</td>
        <td style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => onTouch(lead)} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-600)', cursor: 'pointer' }}>+ Touch</button>
            <button onClick={() => onEdit(lead)} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-600)', cursor: 'pointer' }}>Edit</button>
            <button onClick={() => onDelete(lead.id)} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 4, border: '1px solid #fca5a5', background: 'var(--white)', color: '#dc2626', cursor: 'pointer' }}>✕</button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)' }}>
          <td colSpan={8} style={{ padding: '10px 12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 12 }}>
              {lead.email && <div><span style={{ color: 'var(--gray-400)' }}>Email: </span><a href={`mailto:${lead.email}`} style={{ color: 'var(--navy)' }}>{lead.email}</a></div>}
              {lead.phone && <div><span style={{ color: 'var(--gray-400)' }}>Phone: </span>{lead.phone}</div>}
              {lead.dealValue && <div><span style={{ color: 'var(--gray-400)' }}>Deal value: </span><strong style={{ color: '#15803d' }}>${lead.dealValue}</strong></div>}
              {lead.firstContact && <div><span style={{ color: 'var(--gray-400)' }}>First contact: </span>{lead.firstContact}</div>}
              {lead.tags && <div><span style={{ color: 'var(--gray-400)' }}>Tags: </span>{lead.tags}</div>}
            </div>
            {lead.notes && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gray-600)', lineHeight: 1.6, background: 'var(--white)', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--gray-100)' }}>{lead.notes}</div>}
            {lead.touchLog?.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', letterSpacing: '0.08em', marginBottom: 6 }}>TOUCH HISTORY</div>
                {[...lead.touchLog].reverse().map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 4, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>{t.date}</span>
                    <span style={{ background: 'var(--gray-100)', padding: '1px 6px', borderRadius: 4 }}>{t.method}</span>
                    <span style={{ color: 'var(--gray-600)' }}>{t.note}</span>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main Sales page ────────────────────────────────────────────────────────
export default function Sales() {
  const [leads, setLeads] = useState(loadLeads)
  const [showModal, setShowModal] = useState(false)
  const [editLead, setEditLead] = useState(null)
  const [touchTarget, setTouchTarget] = useState(null)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('updatedAt')

  useEffect(() => saveLeads(leads), [leads])

  const handleSave = (lead) => {
    setLeads(ls => {
      const idx = ls.findIndex(l => l.id === lead.id)
      return idx >= 0 ? ls.map(l => l.id === lead.id ? lead : l) : [lead, ...ls]
    })
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this lead?')) setLeads(ls => ls.filter(l => l.id !== id))
  }

  const handleTouch = (leadId, method, note) => {
    const today = new Date().toISOString().split('T')[0]
    setLeads(ls => ls.map(l => l.id === leadId ? {
      ...l,
      touchCount: (l.touchCount || 0) + 1,
      lastContact: today,
      touchLog: [...(l.touchLog || []), { date: today, method, note }],
      updatedAt: new Date().toISOString(),
    } : l))
  }

  const filtered = leads
    .filter(l => filter === 'All' || l.status === filter)
    .filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.company?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b[sortBy] || '').localeCompare(a[sortBy] || ''))

  // Stats
  const total = leads.length
  const won = leads.filter(l => l.status === 'Closed Won').length
  const pipeline = leads.filter(l => !['Closed Won', 'Closed Lost'].includes(l.status)).length
  const pipelineValue = leads.filter(l => !['Closed Won', 'Closed Lost'].includes(l.status)).reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0)
  const hotLeads = leads.filter(l => l.strength >= 4 && !['Closed Won', 'Closed Lost'].includes(l.status)).length

  return (
    <div>
      <PageHeader title="Sales & Leads" subtitle="Pipeline · CRM · Outreach tracking">
        <button onClick={() => { setEditLead(null); setShowModal(true) }} style={{ fontSize: 12, padding: '8px 18px', borderRadius: 6, border: 'none', background: 'var(--red)', color: 'var(--white)', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.04em' }}>
          + ADD LEAD
        </button>
      </PageHeader>

      {/* Shopify Overview Panel */}
      <ShopifyPanel />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Leads',      value: total,                           sub: 'all time' },
          { label: 'In Pipeline',      value: pipeline,                        sub: 'active leads' },
          { label: 'Hot Leads',        value: hotLeads,                        sub: '4-5 star strength' },
          { label: 'Closed Won',       value: won,                             sub: 'all time' },
          { label: 'Pipeline Value',   value: `$${pipelineValue.toLocaleString()}`, sub: 'potential revenue' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '0.9rem 1rem' }}>
            <div style={{ fontSize: 10, color: 'var(--gray-400)', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)', fontFamily: 'var(--font-heading)' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search leads…"
          style={{ flex: 1, minWidth: 180, padding: '6px 10px', border: '1.5px solid var(--gray-200)', borderRadius: 6, fontSize: 12, outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['All', ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
              border: `1px solid ${filter === s ? 'var(--navy)' : 'var(--gray-200)'}`,
              background: filter === s ? 'var(--navy)' : 'var(--white)',
              color: filter === s ? 'var(--white)' : 'var(--gray-600)',
              fontWeight: filter === s ? 700 : 400,
            }}>{s}</button>
          ))}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ fontSize: 11, padding: '5px 8px', border: '1px solid var(--gray-200)', borderRadius: 6, color: 'var(--gray-600)', outline: 'none' }}>
          <option value="updatedAt">Sort: Recent</option>
          <option value="lastContact">Sort: Last Contact</option>
          <option value="strength">Sort: Strength</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
          <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.3 }}>$</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, letterSpacing: '0.06em', marginBottom: 6 }}>NO LEADS YET</div>
          <div style={{ fontSize: 12 }}>Click "+ Add Lead" to track your first prospect</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--gray-100)', background: 'var(--gray-50)' }}>
                {['Name', 'Source', 'Status', 'Strength', 'Owner', 'Touches', 'Last Contact', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', letterSpacing: '0.08em', textAlign: 'left' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <LeadRow
                  key={lead.id} lead={lead}
                  onEdit={l => { setEditLead(l); setShowModal(true) }}
                  onDelete={handleDelete}
                  onTouch={l => setTouchTarget(l)}
                  onStatusChange={(id, status) => setLeads(ls => ls.map(l => l.id === id ? { ...l, status } : l))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <LeadModal
          lead={editLead}
          onClose={() => { setShowModal(false); setEditLead(null) }}
          onSave={handleSave}
        />
      )}
      {touchTarget && (
        <TouchModal
          lead={touchTarget}
          onClose={() => setTouchTarget(null)}
          onLog={handleTouch}
        />
      )}
    </div>
  )
}
