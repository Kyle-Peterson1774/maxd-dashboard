import { useState, useMemo, useEffect } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { dbSet, dbGet } from '../lib/db.js'
import { getTeam } from '../lib/team.js'

const STORE_KEY = 'maxd_sales'

// ── Constants ─────────────────────────────────────────────────────────────────
const STAGES = [
  { key: 'prospecting',  label: 'Prospecting',  color: '#64748b' },
  { key: 'contacted',    label: 'Contacted',     color: '#3b82f6' },
  { key: 'qualified',    label: 'Qualified',     color: '#8b5cf6' },
  { key: 'proposal',     label: 'Proposal',      color: '#f59e0b' },
  { key: 'negotiation',  label: 'Negotiation',   color: '#f97316' },
  { key: 'won',          label: 'Closed Won',    color: '#22c55e' },
  { key: 'lost',         label: 'Closed Lost',   color: '#ef4444' },
]

const ACCOUNT_TYPES = ['Gym / Fitness Studio', 'Supplement Retailer', 'Health Food Store', 'Distributor', 'Corporate Wellness', 'Sports Team', 'CrossFit Box', 'Chiropractor / PT', 'Event / Expo', 'Online Retailer', 'Wholesale Buyer', 'Other']
const INDUSTRIES = ['Fitness & Wellness', 'Retail', 'Distribution', 'Healthcare', 'Sports', 'Corporate', 'E-Commerce', 'Hospitality', 'Other']
const LEAD_TEMPS = [
  { key: 'cold', label: 'Cold', color: '#64748b', bg: '#64748b22' },
  { key: 'warm', label: 'Warm', color: '#f59e0b', bg: '#f59e0b22' },
  { key: 'hot',  label: 'Hot',  color: '#ef4444', bg: '#ef444422' },
]
const EVENT_TYPES = ['Trade Show', 'Expo / Convention', 'Fitness Competition', 'Gym Partnership', 'Farmers Market', 'Networking Event', 'Sponsorship', 'Pop-Up', 'Conference', 'Other']
const EVENT_STATUSES = ['Planning', 'Registered', 'Attended', 'Missed', 'Not Pursuing']
const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Demo', 'Follow-Up', 'Proposal Sent', 'Contract Sent', 'Note']

const EMPTY = {
  deals: [],
  accounts: [],
  contacts: [],
  events: [],
  activities: [],
}

const DEMO = {
  accounts: [
    { id: 'a1', name: 'Iron Peak Fitness',       type: 'Gym / Fitness Studio',   industry: 'Fitness & Wellness', city: 'Austin', state: 'TX', website: 'ironpeakfitness.com', phone: '512-555-0110', status: 'active',   notes: 'High-traffic gym, open to retail shelf space',   totalValue: 12000, tags: ['gym','retail'] },
    { id: 'a2', name: 'Gainz Supplement Co.',    type: 'Supplement Retailer',    industry: 'Retail',             city: 'Dallas', state: 'TX', website: 'gainzsupplements.com', phone: '214-555-0222', status: 'prospect', notes: '3 locations in DFW, interested in wholesale',   totalValue: 28000, tags: ['retail','wholesale'] },
    { id: 'a3', name: 'Peak Corporate Wellness', type: 'Corporate Wellness',     industry: 'Corporate',          city: 'Houston', state: 'TX', website: 'peakwellness.io',    phone: '713-555-0333', status: 'prospect', notes: 'B2B wellness packages for employees',           totalValue: 45000, tags: ['corporate'] },
    { id: 'a4', name: 'RXD Athletics',           type: 'CrossFit Box',           industry: 'Fitness & Wellness', city: 'San Antonio', state: 'TX', website: 'rxdathletics.com', phone: '210-555-0444', status: 'customer', notes: 'Current partner, monthly restock',             totalValue: 8400, tags: ['gym','crossfit'] },
  ],
  contacts: [
    { id: 'c1', firstName: 'Marcus', lastName: 'Rivera',  accountId: 'a1', title: 'Owner',             email: 'marcus@ironpeak.com',     phone: '512-555-0111', temp: 'hot',  lastContacted: '2026-04-08', notes: 'Ready to trial 2 SKUs on floor' },
    { id: 'c2', firstName: 'Danielle', lastName: 'Shaw',  accountId: 'a2', title: 'Purchasing Manager', email: 'dshaw@gainzsupps.com',    phone: '214-555-0223', temp: 'warm', lastContacted: '2026-04-05', notes: 'Requested pricing sheet, waiting on approval' },
    { id: 'c3', firstName: 'Ryan', lastName: 'Cho',       accountId: 'a3', title: 'VP of Operations',   email: 'ryan.cho@peakwellness.io', phone: '713-555-0334', temp: 'cold', lastContacted: '2026-03-20', notes: 'Initial call, needs more info on bulk pricing' },
    { id: 'c4', firstName: 'Ashley', lastName: 'Torres',  accountId: 'a4', title: 'Head Coach',         email: 'ashley@rxdathletics.com',  phone: '210-555-0445', temp: 'hot',  lastContacted: '2026-04-09', notes: 'Wants to add Creatine 500g to order' },
  ],
  deals: [
    { id: 'd1', title: 'Iron Peak — Floor Display',      accountId: 'a1', contactId: 'c1', value: 4800,  stage: 'proposal',     probability: 70, closeDate: '2026-04-30', assignedTo: 'Kyle', notes: 'Proposal sent, waiting on sign-off' },
    { id: 'd2', title: 'Gainz — Wholesale Account',      accountId: 'a2', contactId: 'c2', value: 28000, stage: 'qualified',    probability: 45, closeDate: '2026-05-15', assignedTo: 'Kyle', notes: '3-location rollout if approved' },
    { id: 'd3', title: 'Peak Corporate Wellness Pilot',  accountId: 'a3', contactId: 'c3', value: 12000, stage: 'contacted',    probability: 20, closeDate: '2026-06-01', assignedTo: 'Kyle', notes: 'Need case studies and bulk pricing' },
    { id: 'd4', title: 'RXD Monthly Expansion',          accountId: 'a4', contactId: 'c4', value: 1800,  stage: 'negotiation',  probability: 85, closeDate: '2026-04-20', assignedTo: 'Kyle', notes: 'Adding Creatine 500g to monthly order' },
  ],
  events: [
    { id: 'e1', name: 'Arnold Sports Festival',     type: 'Expo / Convention',      location: 'Columbus, OH',   date: '2026-09-01', status: 'Planning',    cost: 4500, expectedValue: 35000, notes: 'Massive booth opportunity, apply early', leads: 0 },
    { id: 'e2', name: 'Austin Fitness Expo',         type: 'Trade Show',             location: 'Austin, TX',     date: '2026-06-15', status: 'Registered',  cost: 1200, expectedValue: 12000, notes: 'Confirmed, need 10x10 display', leads: 3 },
    { id: 'e3', name: 'CrossFit Games 2026',         type: 'Sponsorship',            location: 'Fort Worth, TX', date: '2026-08-10', status: 'Planning',    cost: 8000, expectedValue: 50000, notes: 'Exploring sponsorship tiers', leads: 0 },
    { id: 'e4', name: 'Farmers Market — South Congress', type: 'Farmers Market',    location: 'Austin, TX',     date: '2026-04-19', status: 'Registered',  cost: 150,  expectedValue: 1800,  notes: 'Weekly for awareness + samples', leads: 12 },
  ],
  activities: [
    { id: 'act1', type: 'Call',          date: '2026-04-09', accountId: 'a1', contactId: 'c1', dealId: 'd1', description: 'Marcus confirmed he likes the proposal, checking with partner' },
    { id: 'act2', type: 'Email',         date: '2026-04-08', accountId: 'a2', contactId: 'c2', dealId: 'd2', description: 'Sent wholesale pricing sheet and MOQ breakdown' },
    { id: 'act3', type: 'Meeting',       date: '2026-04-07', accountId: 'a4', contactId: 'c4', dealId: 'd4', description: 'In-person at RXD, discussed expanding SKUs' },
    { id: 'act4', type: 'Follow-Up',     date: '2026-04-05', accountId: 'a3', contactId: 'c3', dealId: 'd3', description: 'Left voicemail for Ryan, will try email next' },
  ],
}

function load() {
  try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : EMPTY } catch { return EMPTY }
}
function save(d) { dbSet(STORE_KEY, d) }
function nid() { return `i_${Date.now()}_${Math.random().toString(36).slice(2,5)}` }
function money(n) { return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }) }
function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000)
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inp = { display: 'block', width: '100%', marginTop: 4, padding: '0.45rem 0.6rem', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }
const btnPrimary = { background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.1rem', fontSize: 14, cursor: 'pointer', fontWeight: 600 }
const btnGhost = { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 1rem', fontSize: 14, cursor: 'pointer' }

function TempBadge({ temp }) {
  const t = LEAD_TEMPS.find(x => x.key === temp) || LEAD_TEMPS[0]
  return <span style={{ background: t.bg, color: t.color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{t.label}</span>
}

function StageBadge({ stage }) {
  const s = STAGES.find(x => x.key === stage) || STAGES[0]
  return <span style={{ background: s.color + '22', color: s.color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{s.label}</span>
}

// ── Deal Modal ─────────────────────────────────────────────────────────────────
function DealModal({ deal, accounts, contacts, onClose, onSave, onDelete }) {
  const isNew = !deal?.id
  const blank = { title: '', accountId: '', contactId: '', value: '', stage: 'prospecting', probability: 50, closeDate: '', assignedTo: '', notes: '' }
  const [form, setForm] = useState(deal || blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const accountContacts = contacts.filter(c => c.accountId === form.accountId)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1.25rem', fontFamily: 'Oswald, sans-serif', color: 'var(--text-primary)' }}>{isNew ? 'New Deal' : 'Edit Deal'}</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Deal Title
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Iron Peak — Floor Display" style={inp} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Account
              <select value={form.accountId} onChange={e => { set('accountId', e.target.value); set('contactId', '') }} style={inp}>
                <option value="">— Select Account —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Contact
              <select value={form.contactId} onChange={e => set('contactId', e.target.value)} style={inp}>
                <option value="">— Select Contact —</option>
                {accountContacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Deal Value ($)
              <input type="number" value={form.value} onChange={e => set('value', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Close Date
              <input type="date" value={form.closeDate} onChange={e => set('closeDate', e.target.value)} style={inp} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Stage
              <select value={form.stage} onChange={e => set('stage', e.target.value)} style={inp}>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Probability %
              <input type="number" min="0" max="100" value={form.probability} onChange={e => set('probability', e.target.value)} style={inp} />
            </label>
          </div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Assigned To
            <select value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              <option value="">— Unassigned —</option>
              {getTeam().map(m => <option key={m.id} value={m.name}>{m.name} ({m.role})</option>)}
            </select>
          </label>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Notes
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button onClick={() => { onSave({ ...form, id: form.id || nid() }); onClose() }} style={btnPrimary}>Save Deal</button>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          {!isNew && <button onClick={() => { onDelete(form.id); onClose() }} style={{ ...btnGhost, marginLeft: 'auto', color: 'var(--red)' }}>Delete</button>}
        </div>
      </div>
    </div>
  )
}

// ── Account Modal ──────────────────────────────────────────────────────────────
function AccountModal({ account, onClose, onSave, onDelete }) {
  const isNew = !account?.id
  const blank = { name: '', type: ACCOUNT_TYPES[0], industry: INDUSTRIES[0], city: '', state: '', website: '', phone: '', status: 'prospect', notes: '', tags: [] }
  const [form, setForm] = useState(account || blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1.25rem', fontFamily: 'Oswald, sans-serif', color: 'var(--text-primary)' }}>{isNew ? 'New Account' : 'Edit Account'}</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Company Name
            <input value={form.name} onChange={e => set('name', e.target.value)} style={inp} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Type
              <select value={form.type} onChange={e => set('type', e.target.value)} style={inp}>
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Industry
              <select value={form.industry} onChange={e => set('industry', e.target.value)} style={inp}>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>City
              <input value={form.city} onChange={e => set('city', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>State
              <input value={form.state} onChange={e => set('state', e.target.value)} maxLength={2} style={inp} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Website
              <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="example.com" style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Phone
              <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} />
            </label>
          </div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Status
            <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
              {['prospect','active','customer','inactive','lost'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Notes
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button onClick={() => { onSave({ ...form, id: form.id || nid() }); onClose() }} style={btnPrimary}>Save Account</button>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          {!isNew && <button onClick={() => { onDelete(form.id); onClose() }} style={{ ...btnGhost, marginLeft: 'auto', color: 'var(--red)' }}>Delete</button>}
        </div>
      </div>
    </div>
  )
}

// ── Contact Modal ──────────────────────────────────────────────────────────────
function ContactModal({ contact, accounts, onClose, onSave, onDelete }) {
  const isNew = !contact?.id
  const blank = { firstName: '', lastName: '', accountId: '', title: '', email: '', phone: '', temp: 'cold', lastContacted: '', notes: '', linkedIn: '' }
  const [form, setForm] = useState(contact || blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1.25rem', fontFamily: 'Oswald, sans-serif', color: 'var(--text-primary)' }}>{isNew ? 'New Contact' : 'Edit Contact'}</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>First Name
              <input value={form.firstName} onChange={e => set('firstName', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Last Name
              <input value={form.lastName} onChange={e => set('lastName', e.target.value)} style={inp} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Account
              <select value={form.accountId} onChange={e => set('accountId', e.target.value)} style={inp}>
                <option value="">— No Account —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Title / Role
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Owner, Buyer" style={inp} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Email
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Phone
              <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Lead Temp
              <select value={form.temp} onChange={e => set('temp', e.target.value)} style={inp}>
                {LEAD_TEMPS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Last Contacted
              <input type="date" value={form.lastContacted} onChange={e => set('lastContacted', e.target.value)} style={inp} />
            </label>
          </div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>LinkedIn URL
            <input value={form.linkedIn} onChange={e => set('linkedIn', e.target.value)} placeholder="linkedin.com/in/..." style={inp} />
          </label>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Notes
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button onClick={() => { onSave({ ...form, id: form.id || nid() }); onClose() }} style={btnPrimary}>Save Contact</button>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          {!isNew && <button onClick={() => { onDelete(form.id); onClose() }} style={{ ...btnGhost, marginLeft: 'auto', color: 'var(--red)' }}>Delete</button>}
        </div>
      </div>
    </div>
  )
}

// ── Event Modal ────────────────────────────────────────────────────────────────
function EventModal({ event, onClose, onSave, onDelete }) {
  const isNew = !event?.id
  const blank = { name: '', type: EVENT_TYPES[0], location: '', date: '', status: 'Planning', cost: '', expectedValue: '', notes: '', leads: '' }
  const [form, setForm] = useState(event || blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1.25rem', fontFamily: 'Oswald, sans-serif', color: 'var(--text-primary)' }}>{isNew ? 'New Event' : 'Edit Event'}</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Event Name
            <input value={form.name} onChange={e => set('name', e.target.value)} style={inp} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Type
              <select value={form.type} onChange={e => set('type', e.target.value)} style={inp}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Status
              <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
                {EVENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Location
              <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="City, ST" style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Date
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inp} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cost ($)
              <input type="number" value={form.cost} onChange={e => set('cost', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Exp. Value ($)
              <input type="number" value={form.expectedValue} onChange={e => set('expectedValue', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Leads
              <input type="number" value={form.leads} onChange={e => set('leads', e.target.value)} style={inp} />
            </label>
          </div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Notes
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button onClick={() => { onSave({ ...form, id: form.id || nid() }); onClose() }} style={btnPrimary}>Save Event</button>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          {!isNew && <button onClick={() => { onDelete(form.id); onClose() }} style={{ ...btnGhost, marginLeft: 'auto', color: 'var(--red)' }}>Delete</button>}
        </div>
      </div>
    </div>
  )
}

// ── Activity Log Modal ─────────────────────────────────────────────────────────
function ActivityModal({ accounts, contacts, deals, onClose, onSave }) {
  const blank = { type: 'Call', date: new Date().toISOString().split('T')[0], accountId: '', contactId: '', dealId: '', description: '' }
  const [form, setForm] = useState(blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const filteredContacts = contacts.filter(c => !form.accountId || c.accountId === form.accountId)
  const filteredDeals = deals.filter(d => !form.accountId || d.accountId === form.accountId)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1.25rem', fontFamily: 'Oswald, sans-serif', color: 'var(--text-primary)' }}>Log Activity</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Type
              <select value={form.type} onChange={e => set('type', e.target.value)} style={inp}>
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Date
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inp} />
            </label>
          </div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Account
            <select value={form.accountId} onChange={e => { set('accountId', e.target.value); set('contactId', ''); set('dealId', '') }} style={inp}>
              <option value="">— Select Account —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Contact
              <select value={form.contactId} onChange={e => set('contactId', e.target.value)} style={inp}>
                <option value="">— Optional —</option>
                {filteredContacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Deal
              <select value={form.dealId} onChange={e => set('dealId', e.target.value)} style={inp}>
                <option value="">— Optional —</option>
                {filteredDeals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </label>
          </div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Description / Notes
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button onClick={() => { onSave({ ...form, id: nid() }); onClose() }} style={btnPrimary}>Log Activity</button>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Pipeline Kanban ────────────────────────────────────────────────────────────
function Pipeline({ deals, accounts, contacts, onEdit, onStageChange }) {
  const activeStages = STAGES.filter(s => s.key !== 'won' && s.key !== 'lost')
  const wonDeals = deals.filter(d => d.stage === 'won')
  const lostDeals = deals.filter(d => d.stage === 'lost')

  const pipelineValue = deals.filter(d => !['won','lost'].includes(d.stage)).reduce((s, d) => s + Number(d.value || 0), 0)
  const weightedValue = deals.filter(d => !['won','lost'].includes(d.stage)).reduce((s, d) => s + Number(d.value || 0) * Number(d.probability || 0) / 100, 0)
  const wonValue = wonDeals.reduce((s, d) => s + Number(d.value || 0), 0)

  return (
    <div>
      {/* Pipeline stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Pipeline Value', value: money(pipelineValue), color: 'var(--navy)' },
          { label: 'Weighted Value', value: money(weightedValue), color: '#8b5cf6' },
          { label: 'Closed Won', value: money(wonValue), color: '#22c55e' },
          { label: 'Open Deals', value: deals.filter(d => !['won','lost'].includes(d.stage)).length },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.875rem', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--text-primary)', fontFamily: 'Oswald, sans-serif' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Kanban columns */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activeStages.length}, minmax(200px, 1fr))`, gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {activeStages.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage.key)
          const stageValue = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0)
          return (
            <div key={stage.key} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.75rem', minHeight: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stage.label}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface-3)', padding: '2px 6px', borderRadius: 4 }}>{stageDeals.length}</span>
              </div>
              {stageValue > 0 && <div style={{ fontSize: 11, color: stage.color, fontWeight: 600, marginBottom: '0.5rem' }}>{money(stageValue)}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {stageDeals.map(deal => {
                  const account = accounts.find(a => a.id === deal.accountId)
                  const contact = contacts.find(c => c.id === deal.contactId)
                  return (
                    <div key={deal.id} onClick={() => onEdit(deal)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${stage.color}`, borderRadius: 7, padding: '0.6rem 0.75rem', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3, lineHeight: 1.3 }}>{deal.title}</div>
                      {account && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{account.name}</div>}
                      {contact && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{contact.firstName} {contact.lastName}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{money(deal.value)}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{deal.probability}%</span>
                      </div>
                      {/* Stage advance buttons */}
                      <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                        {stage.key !== 'negotiation' && (
                          <button onClick={e => { e.stopPropagation(); const nextIdx = STAGES.findIndex(s => s.key === stage.key) + 1; onStageChange(deal.id, STAGES[nextIdx]?.key) }} style={{ flex: 1, padding: '2px 0', fontSize: 10, cursor: 'pointer', background: stage.color + '22', color: stage.color, border: 'none', borderRadius: 4, fontWeight: 600 }}>
                            → Advance
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); onStageChange(deal.id, 'won') }} style={{ padding: '2px 6px', fontSize: 10, cursor: 'pointer', background: '#22c55e22', color: '#22c55e', border: 'none', borderRadius: 4, fontWeight: 600 }}>✓ Won</button>
                        <button onClick={e => { e.stopPropagation(); onStageChange(deal.id, 'lost') }} style={{ padding: '2px 6px', fontSize: 10, cursor: 'pointer', background: '#ef444422', color: '#ef4444', border: 'none', borderRadius: 4, fontWeight: 600 }}>✗ Lost</button>
                      </div>
                    </div>
                  )
                })}
                {stageDeals.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No deals</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Won / Lost summary */}
      {(wonDeals.length > 0 || lostDeals.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
          {[{ label: 'Closed Won', deals: wonDeals, color: '#22c55e' }, { label: 'Closed Lost', deals: lostDeals, color: '#ef4444' }].map(({ label, deals: d, color }) => (
            <div key={label} style={{ background: 'var(--surface-2)', border: `1px solid ${color}33`, borderRadius: 10, padding: '0.75rem' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label} — {d.length} deals</div>
              {d.map(deal => (
                <div key={deal.id} onClick={() => onEdit(deal)} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{deal.title}</span><span style={{ color, fontWeight: 600 }}>{money(deal.value)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Sales() {
  const [data, setData] = useState(load)
  const [tab, setTab] = useState('pipeline')
  const [dealModal, setDealModal] = useState(null)
  const [accountModal, setAccountModal] = useState(null)
  const [contactModal, setContactModal] = useState(null)
  const [eventModal, setEventModal] = useState(null)
  const [activityModal, setActivityModal] = useState(false)
  const [search, setSearch] = useState('')
  const [tempFilter, setTempFilter] = useState('all')
  const [detailAccount, setDetailAccount] = useState(null)

  useEffect(() => {
    dbGet(STORE_KEY).then(d => { if (d) setData(d) })
  }, [])

  const persist = (next) => { setData(next); save(next) }

  const saveDeal = (d) => {
    const list = data.deals.find(x => x.id === d.id) ? data.deals.map(x => x.id === d.id ? d : x) : [d, ...data.deals]
    persist({ ...data, deals: list })
  }
  const deleteDeal = (id) => persist({ ...data, deals: data.deals.filter(x => x.id !== id) })
  const advanceStage = (dealId, stage) => {
    const list = data.deals.map(d => d.id === dealId ? { ...d, stage } : d)
    persist({ ...data, deals: list })
  }

  const saveAccount = (a) => {
    const list = data.accounts.find(x => x.id === a.id) ? data.accounts.map(x => x.id === a.id ? a : x) : [a, ...data.accounts]
    persist({ ...data, accounts: list })
  }
  const deleteAccount = (id) => persist({ ...data, accounts: data.accounts.filter(x => x.id !== id) })

  const saveContact = (c) => {
    const list = data.contacts.find(x => x.id === c.id) ? data.contacts.map(x => x.id === c.id ? c : x) : [c, ...data.contacts]
    persist({ ...data, contacts: list })
  }
  const deleteContact = (id) => persist({ ...data, contacts: data.contacts.filter(x => x.id !== id) })

  const saveEvent = (e) => {
    const list = data.events.find(x => x.id === e.id) ? data.events.map(x => x.id === e.id ? e : x) : [e, ...data.events]
    persist({ ...data, events: list })
  }
  const deleteEvent = (id) => persist({ ...data, events: data.events.filter(x => x.id !== id) })

  const saveActivity = (a) => {
    persist({ ...data, activities: [a, ...(data.activities || [])] })
  }

  const filteredContacts = useMemo(() => {
    return data.contacts.filter(c => {
      if (tempFilter !== 'all' && c.temp !== tempFilter) return false
      if (search && !`${c.firstName} ${c.lastName} ${c.title}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [data.contacts, tempFilter, search])

  const filteredAccounts = useMemo(() => {
    if (!search) return data.accounts
    return data.accounts.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.city?.toLowerCase().includes(search.toLowerCase()) || a.type?.toLowerCase().includes(search.toLowerCase()))
  }, [data.accounts, search])

  const upcomingEvents = useMemo(() => [...data.events].sort((a, b) => new Date(a.date) - new Date(b.date)), [data.events])

  const recentActivities = useMemo(() => [...(data.activities || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10), [data.activities])

  const hotContacts = data.contacts.filter(c => c.temp === 'hot')
  const needsFollowUp = data.contacts.filter(c => { const d = daysSince(c.lastContacted); return d !== null && d >= 7 })

  const tabStyle = (t) => ({
    padding: '0.45rem 1rem', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500,
    background: tab === t ? 'var(--navy)' : 'transparent',
    color: tab === t ? '#fff' : 'var(--text-secondary)',
    border: tab === t ? 'none' : '1px solid var(--border)',
  })

  const addActions = { pipeline: () => setDealModal({}), accounts: () => setAccountModal({}), contacts: () => setContactModal({}), events: () => setEventModal({}) }
  const addLabels = { pipeline: 'New Deal', accounts: 'New Account', contacts: 'New Contact', events: 'New Event' }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader title="Sales" subtitle="Pipeline, accounts, contacts & events" />

      {/* Alert strips */}
      {hotContacts.length > 0 && (
        <div style={{ background: '#fee2e222', border: '1px solid #ef444444', borderRadius: 8, padding: '0.6rem 1rem', marginBottom: '0.75rem', fontSize: 13, color: '#dc2626', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>🔥</span>
          <span><strong>{hotContacts.length} hot lead{hotContacts.length > 1 ? 's' : ''}:</strong> {hotContacts.map(c => `${c.firstName} ${c.lastName}`).join(', ')}</span>
        </div>
      )}
      {needsFollowUp.length > 0 && (
        <div style={{ background: '#fef3c722', border: '1px solid #f59e0b44', borderRadius: 8, padding: '0.6rem 1rem', marginBottom: '1.25rem', fontSize: 13, color: '#d97706', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>⏰</span>
          <span><strong>{needsFollowUp.length} contact{needsFollowUp.length > 1 ? 's' : ''} need follow-up</strong> (7+ days since last touch)</span>
        </div>
      )}

      {/* Tabs + actions */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={tabStyle('pipeline')} onClick={() => setTab('pipeline')}>🎯 Pipeline</button>
        <button style={tabStyle('accounts')} onClick={() => setTab('accounts')}>🏢 Accounts</button>
        <button style={tabStyle('contacts')} onClick={() => setTab('contacts')}>👤 Contacts</button>
        <button style={tabStyle('events')} onClick={() => setTab('events')}>📅 Events</button>
        <button style={tabStyle('activity')} onClick={() => setTab('activity')}>📋 Activity</button>
        {['accounts','contacts'].includes(tab) && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${tab}…`} style={{ padding: '0.4rem 0.7rem', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, width: 180 }} />
        )}
        {tab === 'contacts' && (
          <div style={{ display: 'flex', gap: 4 }}>
            {['all','hot','warm','cold'].map(t => (
              <button key={t} onClick={() => setTempFilter(t)} style={{ padding: '0.3rem 0.65rem', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: tempFilter === t ? 'var(--navy)' : 'var(--surface-3)', color: tempFilter === t ? '#fff' : 'var(--text-secondary)', border: 'none' }}>
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
        )}
        {tab !== 'activity' && (
          <button onClick={addActions[tab]} style={{ marginLeft: 'auto', ...btnPrimary }}>+ {addLabels[tab]}</button>
        )}
        {tab === 'activity' && (
          <button onClick={() => setActivityModal(true)} style={{ marginLeft: 'auto', ...btnPrimary }}>+ Log Activity</button>
        )}
      </div>

      {/* Pipeline */}
      {tab === 'pipeline' && <Pipeline deals={data.deals} accounts={data.accounts} contacts={data.contacts} onEdit={setDealModal} onStageChange={advanceStage} />}

      {/* Accounts */}
      {tab === 'accounts' && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 150px 120px 80px 90px 100px', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            <span>Company</span><span>Type</span><span>Location</span><span>Deals</span><span>Status</span><span>Est. Value</span>
          </div>
          {filteredAccounts.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No accounts yet. Click "New Account" to add one.</div>}
          {filteredAccounts.map(acct => {
            const acctDeals = data.deals.filter(d => d.accountId === acct.id)
            const STATUS_COLORS = { prospect: '#64748b', active: '#3b82f6', customer: '#22c55e', inactive: '#94a3b8', lost: '#ef4444' }
            return (
              <div key={acct.id} onClick={() => setAccountModal(acct)} style={{ display: 'grid', gridTemplateColumns: '2fr 150px 120px 80px 90px 100px', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 14 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{acct.name}</div>
                  {acct.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acct.notes}</div>}
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{acct.type}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{acct.city}{acct.state ? `, ${acct.state}` : ''}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{acctDeals.length}</span>
                <span><span style={{ background: (STATUS_COLORS[acct.status] || '#64748b') + '22', color: STATUS_COLORS[acct.status] || '#64748b', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{acct.status}</span></span>
                <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 13 }}>{acctDeals.length > 0 ? money(acctDeals.reduce((s, d) => s + Number(d.value || 0), 0)) : '—'}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Contacts */}
      {tab === 'contacts' && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 130px 150px 80px 110px 100px', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            <span>Contact</span><span>Account</span><span>Email</span><span>Temp</span><span>Last Touch</span><span>Actions</span>
          </div>
          {filteredContacts.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No contacts match your filters.</div>}
          {filteredContacts.map(c => {
            const account = data.accounts.find(a => a.id === c.accountId)
            const days = daysSince(c.lastContacted)
            const isStale = days !== null && days >= 7
            return (
              <div key={c.id} onClick={() => setContactModal(c)} style={{ display: 'grid', gridTemplateColumns: '1.5fr 130px 150px 80px 110px 100px', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 14 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.firstName} {c.lastName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.title}</div>
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{account?.name || '—'}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email || '—'}</span>
                <span><TempBadge temp={c.temp} /></span>
                <span style={{ color: isStale ? '#f59e0b' : 'var(--text-muted)', fontWeight: isStale ? 600 : 400, fontSize: 12 }}>
                  {days === null ? '—' : days === 0 ? 'Today' : `${days}d ago`}
                  {isStale && ' ⚠️'}
                </span>
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  {c.email && <a href={`mailto:${c.email}`} style={{ fontSize: 11, padding: '3px 7px', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)', textDecoration: 'none' }}>Email</a>}
                  {c.linkedIn && <a href={c.linkedIn.startsWith('http') ? c.linkedIn : `https://${c.linkedIn}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, padding: '3px 7px', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)', textDecoration: 'none' }}>LI</a>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Events */}
      {tab === 'events' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {upcomingEvents.length === 0 && <div style={{ gridColumn: '1/-1', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10 }}>No events yet. Click "New Event" to add one.</div>}
          {upcomingEvents.map(ev => {
            const STATUS_COLORS_EV = { Planning: '#64748b', Registered: '#3b82f6', Attended: '#22c55e', Missed: '#ef4444', 'Not Pursuing': '#94a3b8' }
            const daysTo = ev.date ? Math.ceil((new Date(ev.date) - Date.now()) / 86400000) : null
            const roi = ev.cost && ev.expectedValue ? ((ev.expectedValue - ev.cost) / ev.cost * 100).toFixed(0) : null
            return (
              <div key={ev.id} onClick={() => setEventModal(ev)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-mid)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{ev.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{ev.type} · {ev.location}</div>
                  </div>
                  <span style={{ background: (STATUS_COLORS_EV[ev.status] || '#64748b') + '22', color: STATUS_COLORS_EV[ev.status] || '#64748b', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{ev.status}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <div style={{ textAlign: 'center', background: 'var(--surface-3)', borderRadius: 6, padding: '0.4rem' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: daysTo < 14 ? '#f59e0b' : 'var(--text-primary)' }}>{daysTo !== null ? (daysTo < 0 ? `${Math.abs(daysTo)}d ago` : daysTo === 0 ? 'Today' : `${daysTo}d`) : '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Days out</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'var(--surface-3)', borderRadius: 6, padding: '0.4rem' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{ev.cost ? money(ev.cost) : '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Cost</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'var(--surface-3)', borderRadius: 6, padding: '0.4rem' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>{roi ? `${roi}%` : '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Est. ROI</div>
                  </div>
                </div>
                {ev.leads > 0 && <div style={{ marginTop: '0.5rem', fontSize: 12, color: 'var(--text-muted)' }}>🎯 {ev.leads} leads collected</div>}
                {ev.notes && <div style={{ marginTop: '0.5rem', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.notes}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Activity Log */}
      {tab === 'activity' && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 90px 1.5fr 2fr', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            <span>Type</span><span>Date</span><span>Account</span><span>Notes</span>
          </div>
          {recentActivities.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No activity logged yet. Click "Log Activity" to start tracking touches.</div>}
          {recentActivities.map(act => {
            const account = data.accounts.find(a => a.id === act.accountId)
            const contact = data.contacts.find(c => c.id === act.contactId)
            const TYPE_COLORS = { Call: '#3b82f6', Email: '#8b5cf6', Meeting: '#22c55e', Demo: '#f59e0b', 'Follow-Up': '#f97316', 'Proposal Sent': '#06b6d4', 'Contract Sent': '#10b981', Note: '#64748b' }
            return (
              <div key={act.id} style={{ display: 'grid', gridTemplateColumns: '80px 90px 1.5fr 2fr', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <span style={{ background: (TYPE_COLORS[act.type] || '#64748b') + '22', color: TYPE_COLORS[act.type] || '#64748b', padding: '2px 7px', borderRadius: 99, fontSize: 11, fontWeight: 600, alignSelf: 'flex-start' }}>{act.type}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{act.date}</span>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{account?.name || '—'}</div>
                  {contact && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{contact.firstName} {contact.lastName}</div>}
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.description}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {dealModal !== null && <DealModal deal={Object.keys(dealModal).length ? dealModal : null} accounts={data.accounts} contacts={data.contacts} onClose={() => setDealModal(null)} onSave={saveDeal} onDelete={deleteDeal} />}
      {accountModal !== null && <AccountModal account={Object.keys(accountModal).length ? accountModal : null} onClose={() => setAccountModal(null)} onSave={saveAccount} onDelete={deleteAccount} />}
      {contactModal !== null && <ContactModal contact={Object.keys(contactModal).length ? contactModal : null} accounts={data.accounts} onClose={() => setContactModal(null)} onSave={saveContact} onDelete={deleteContact} />}
      {eventModal !== null && <EventModal event={Object.keys(eventModal).length ? eventModal : null} onClose={() => setEventModal(null)} onSave={saveEvent} onDelete={deleteEvent} />}
      {activityModal && <ActivityModal accounts={data.accounts} contacts={data.contacts} deals={data.deals} onClose={() => setActivityModal(false)} onSave={saveActivity} />}
    </div>
  )
}
