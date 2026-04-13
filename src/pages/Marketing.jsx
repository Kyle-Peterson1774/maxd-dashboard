import { useState, useMemo } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'

const STORE_KEY = 'maxd_marketing'

const AD_PLATFORMS = {
  meta:      { label: 'Meta Ads',      icon: '📘', color: '#1877F2' },
  google:    { label: 'Google Ads',    icon: '🔍', color: '#4285F4' },
  tiktok:    { label: 'TikTok Ads',   icon: '🎵', color: '#010101' },
  pinterest: { label: 'Pinterest Ads', icon: '📌', color: '#E60023' },
  snapchat:  { label: 'Snapchat Ads',  icon: '👻', color: '#FFFC00' },
}

const EMAIL_PLATFORMS = {
  klaviyo:    { label: 'Klaviyo',      icon: '✉️', color: '#00B5AD' },
  mailchimp:  { label: 'Mailchimp',    icon: '🐒', color: '#FFE01B' },
  convertkit: { label: 'ConvertKit',   icon: '📧', color: '#FB6970' },
  hubspot:    { label: 'HubSpot',      icon: '🧡', color: '#FF7A59' },
}

const DEMO = {
  campaigns: [
    { id: 'c1', name: 'Spring Launch — Meta',    platform: 'meta',    status: 'active',  startDate: '2026-04-01', endDate: '2026-04-30', budget: 2500, spend: 840,  revenue: 3200, clicks: 4200,  impressions: 85000,  conversions: 64  },
    { id: 'c2', name: 'Recovery Stack — Google', platform: 'google',  status: 'active',  startDate: '2026-04-01', endDate: '2026-04-30', budget: 1500, spend: 480,  revenue: 1920, clicks: 2100,  impressions: 42000,  conversions: 38  },
    { id: 'c3', name: 'UGC Reel — TikTok',       platform: 'tiktok',  status: 'active',  startDate: '2026-04-03', endDate: '2026-04-20', budget: 1000, spend: 310,  revenue: 880,  clicks: 6800,  impressions: 210000, conversions: 22  },
    { id: 'c4', name: 'Retarget Q1',              platform: 'meta',    status: 'paused',  startDate: '2026-03-15', endDate: '2026-03-31', budget: 800,  spend: 800,  revenue: 2640, clicks: 3100,  impressions: 55000,  conversions: 52  },
    { id: 'c5', name: 'Brand Search',             platform: 'google',  status: 'completed', startDate: '2026-03-01', endDate: '2026-03-31', budget: 600, spend: 592, revenue: 2100, clicks: 1800,  impressions: 22000,  conversions: 41  },
  ],
  emails: [
    { id: 'e1', date: '2026-04-08', subject: 'New: Recovery Gummies Are Here',   platform: 'klaviyo',    sent: 8400, opened: 2184, clicked: 630,  revenue: 1820 },
    { id: 'e2', date: '2026-04-05', subject: 'Last chance — Spring bundle',       platform: 'klaviyo',    sent: 8200, opened: 2132, clicked: 574,  revenue: 2140 },
    { id: 'e3', date: '2026-04-02', subject: 'The science behind creatine',       platform: 'mailchimp',  sent: 5100, opened: 1530, clicked: 255,  revenue: 420  },
    { id: 'e4', date: '2026-03-28', subject: '3 morning habits for better focus', platform: 'klaviyo',    sent: 8000, opened: 2160, clicked: 592,  revenue: 960  },
  ],
}

const EMPTY_DATA = { campaigns: [], emails: [] }

function load() {
  try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : EMPTY_DATA } catch { return EMPTY_DATA }
}
function save(d) { localStorage.setItem(STORE_KEY, JSON.stringify(d)) }
function nid() { return `i_${Date.now()}_${Math.random().toString(36).slice(2,5)}` }
function fmt(n) { return n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n ?? 0) }
function money(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 }) }
function pct(n) { return (Number(n || 0) * 100).toFixed(1) + '%' }

const STATUS_COLORS = { active: '#22c55e', paused: '#f59e0b', completed: '#64748b', draft: '#94a3b8' }

// ── Campaign Modal ──────────────────────────────────────────────────────────
function CampaignModal({ campaign, onClose, onSave, onDelete }) {
  const isNew = !campaign?.id
  const blank = { name: '', platform: 'meta', status: 'active', startDate: new Date().toISOString().split('T')[0], endDate: '', budget: '', spend: '', revenue: '', clicks: '', impressions: '', conversions: '' }
  const [form, setForm] = useState(campaign || blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1.25rem', color: 'var(--text-primary)', fontFamily: 'Oswald, sans-serif' }}>{isNew ? 'Add Campaign' : 'Edit Campaign'}</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Campaign Name
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Spring Launch — Meta" style={inp} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Platform
              <select value={form.platform} onChange={e => set('platform', e.target.value)} style={inp}>
                {Object.entries(AD_PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Status
              <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
                {['active','paused','completed','draft'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Start Date
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>End Date
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} style={inp} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Budget ($)
              <input type="number" value={form.budget} onChange={e => set('budget', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Spend ($)
              <input type="number" value={form.spend} onChange={e => set('spend', e.target.value)} style={inp} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Revenue ($)
              <input type="number" value={form.revenue} onChange={e => set('revenue', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Clicks
              <input type="number" value={form.clicks} onChange={e => set('clicks', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Conversions
              <input type="number" value={form.conversions} onChange={e => set('conversions', e.target.value)} style={inp} />
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button onClick={() => { onSave({ ...form, id: form.id || nid() }); onClose() }} style={btnPrimary}>Save Campaign</button>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          {!isNew && <button onClick={() => { onDelete(form.id); onClose() }} style={{ ...btnGhost, marginLeft: 'auto', color: 'var(--red)' }}>Delete</button>}
        </div>
      </div>
    </div>
  )
}

// ── Email Modal ─────────────────────────────────────────────────────────────
function EmailModal({ email, onClose, onSave, onDelete }) {
  const isNew = !email?.id
  const blank = { subject: '', platform: 'klaviyo', date: new Date().toISOString().split('T')[0], sent: '', opened: '', clicked: '', revenue: '' }
  const [form, setForm] = useState(email || blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1.25rem', color: 'var(--text-primary)', fontFamily: 'Oswald, sans-serif' }}>{isNew ? 'Log Email Send' : 'Edit Email'}</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Subject Line
            <input value={form.subject} onChange={e => set('subject', e.target.value)} style={inp} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Platform
              <select value={form.platform} onChange={e => set('platform', e.target.value)} style={inp}>
                {Object.entries(EMAIL_PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Send Date
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inp} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
            {[['sent','Sent'],['opened','Opened'],['clicked','Clicked'],['revenue','Revenue $']].map(([k,l]) => (
              <label key={k} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{l}
                <input type="number" value={form[k]} onChange={e => set(k, e.target.value)} style={inp} />
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button onClick={() => { onSave({ ...form, id: form.id || nid() }); onClose() }} style={btnPrimary}>Save</button>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          {!isNew && <button onClick={() => { onDelete(form.id); onClose() }} style={{ ...btnGhost, marginLeft: 'auto', color: 'var(--red)' }}>Delete</button>}
        </div>
      </div>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────
const inp = { display: 'block', width: '100%', marginTop: 4, padding: '0.45rem 0.6rem', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }
const btnPrimary = { background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.1rem', fontSize: 14, cursor: 'pointer', fontWeight: 600 }
const btnGhost = { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 1rem', fontSize: 14, cursor: 'pointer' }

// ── Main Component ──────────────────────────────────────────────────────────
export default function Marketing() {
  const [data, setData] = useState(load)
  const [tab, setTab] = useState('campaigns')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [campaignModal, setCampaignModal] = useState(null)
  const [emailModal, setEmailModal] = useState(null)

  const persist = (next) => { setData(next); save(next) }

  const saveCampaign = (c) => {
    const list = data.campaigns.find(x => x.id === c.id)
      ? data.campaigns.map(x => x.id === c.id ? c : x)
      : [c, ...data.campaigns]
    persist({ ...data, campaigns: list })
  }
  const deleteCampaign = (id) => persist({ ...data, campaigns: data.campaigns.filter(x => x.id !== id) })

  const saveEmail = (e) => {
    const list = data.emails.find(x => x.id === e.id)
      ? data.emails.map(x => x.id === e.id ? e : x)
      : [e, ...data.emails]
    persist({ ...data, emails: list })
  }
  const deleteEmail = (id) => persist({ ...data, emails: data.emails.filter(x => x.id !== id) })

  // ── Derived stats ──────────────────────────────────────────────────────────
  const campaignStats = useMemo(() => {
    const active = data.campaigns.filter(c => c.status === 'active')
    const totalSpend = data.campaigns.reduce((s, c) => s + Number(c.spend || 0), 0)
    const totalRevenue = data.campaigns.reduce((s, c) => s + Number(c.revenue || 0), 0)
    const totalConversions = data.campaigns.reduce((s, c) => s + Number(c.conversions || 0), 0)
    const roas = totalSpend ? (totalRevenue / totalSpend).toFixed(2) : '—'
    const cpa = totalConversions ? (totalSpend / totalConversions).toFixed(2) : '—'
    return { active: active.length, totalSpend, totalRevenue, roas, cpa }
  }, [data.campaigns])

  const emailStats = useMemo(() => {
    const totalSent = data.emails.reduce((s, e) => s + Number(e.sent || 0), 0)
    const totalOpened = data.emails.reduce((s, e) => s + Number(e.opened || 0), 0)
    const totalClicked = data.emails.reduce((s, e) => s + Number(e.clicked || 0), 0)
    const totalRevenue = data.emails.reduce((s, e) => s + Number(e.revenue || 0), 0)
    const openRate = totalSent ? totalOpened / totalSent : 0
    const ctr = totalOpened ? totalClicked / totalOpened : 0
    return { totalSent, openRate, ctr, totalRevenue }
  }, [data.emails])

  const filteredCampaigns = useMemo(() => {
    return data.campaigns.filter(c => {
      if (platformFilter !== 'all' && c.platform !== platformFilter) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      return true
    }).sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
  }, [data.campaigns, platformFilter, statusFilter])

  const sortedEmails = useMemo(() => {
    return [...data.emails].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [data.emails])

  // ── Spend by platform for bar chart ───────────────────────────────────────
  const spendByPlatform = useMemo(() => {
    const map = {}
    data.campaigns.forEach(c => { map[c.platform] = (map[c.platform] || 0) + Number(c.spend || 0) })
    const max = Math.max(...Object.values(map), 1)
    return Object.entries(map).map(([k, v]) => ({ key: k, spend: v, pct: v / max * 100 }))
  }, [data.campaigns])

  const tabStyle = (t) => ({
    padding: '0.45rem 1rem', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500,
    background: tab === t ? 'var(--navy)' : 'transparent',
    color: tab === t ? '#fff' : 'var(--text-secondary)',
    border: tab === t ? 'none' : '1px solid var(--border)',
  })

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader title="Marketing" subtitle="Ad campaigns, email performance & spend tracking" />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Active Campaigns', value: campaignStats.active },
          { label: 'Total Ad Spend',   value: money(campaignStats.totalSpend) },
          { label: 'Ad Revenue',       value: money(campaignStats.totalRevenue) },
          { label: 'ROAS',             value: campaignStats.roas === '—' ? '—' : campaignStats.roas + 'x' },
          { label: 'Cost Per Acq.',    value: campaignStats.cpa === '—' ? '—' : money(campaignStats.cpa) },
          { label: 'Email Open Rate',  value: pct(emailStats.openRate) },
          { label: 'Email CTR',        value: pct(emailStats.ctr) },
          { label: 'Email Revenue',    value: money(emailStats.totalRevenue) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Oswald, sans-serif' }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Spend by Platform chart */}
      {spendByPlatform.length > 0 && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ad Spend by Platform</div>
          {spendByPlatform.map(({ key, spend, pct: p }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 8 }}>
              <div style={{ width: 90, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{AD_PLATFORMS[key]?.icon}</span> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{AD_PLATFORMS[key]?.label}</span>
              </div>
              <div style={{ flex: 1, height: 10, background: 'var(--surface-3)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${p}%`, background: AD_PLATFORMS[key]?.color || 'var(--navy)', borderRadius: 5, transition: 'width 0.3s' }} />
              </div>
              <div style={{ width: 60, fontSize: 13, color: 'var(--text-primary)', textAlign: 'right', fontWeight: 600 }}>{money(spend)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button style={tabStyle('campaigns')} onClick={() => setTab('campaigns')}>Campaigns</button>
        <button style={tabStyle('email')} onClick={() => setTab('email')}>Email</button>
        <button onClick={() => tab === 'campaigns' ? setCampaignModal({}) : setEmailModal({})} style={{ marginLeft: 'auto', ...btnPrimary }}>+ {tab === 'campaigns' ? 'Add Campaign' : 'Log Email'}</button>
      </div>

      {/* Campaigns Tab */}
      {tab === 'campaigns' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {['all', ...Object.keys(AD_PLATFORMS)].map(p => (
                <button key={p} onClick={() => setPlatformFilter(p)} style={{ padding: '0.3rem 0.7rem', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: platformFilter === p ? 'var(--navy)' : 'var(--surface-3)', color: platformFilter === p ? '#fff' : 'var(--text-secondary)', border: 'none' }}>
                  {p === 'all' ? 'All Platforms' : AD_PLATFORMS[p].label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['all','active','paused','completed','draft'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '0.3rem 0.7rem', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: statusFilter === s ? (STATUS_COLORS[s] || 'var(--navy)') : 'var(--surface-3)', color: statusFilter === s ? '#fff' : 'var(--text-secondary)', border: 'none' }}>
                  {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Campaign Table */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 80px 90px 90px 80px 80px 60px', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              <span>Campaign</span><span>Platform</span><span>Status</span><span>Budget</span><span>Spend</span><span>Revenue</span><span>ROAS</span><span>CPA</span>
            </div>
            {filteredCampaigns.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No campaigns match your filters.</div>
            )}
            {filteredCampaigns.map(c => {
              const roas = Number(c.spend) ? (Number(c.revenue) / Number(c.spend)).toFixed(2) : '—'
              const cpa = Number(c.conversions) ? (Number(c.spend) / Number(c.conversions)).toFixed(0) : '—'
              return (
                <div key={c.id} onClick={() => setCampaignModal(c)} style={{ display: 'grid', gridTemplateColumns: '2fr 100px 80px 90px 90px 80px 80px 60px', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 14 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.startDate}{c.endDate ? ` → ${c.endDate}` : ''}</div>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>{AD_PLATFORMS[c.platform]?.icon} {AD_PLATFORMS[c.platform]?.label}</span>
                  <span><span style={{ background: STATUS_COLORS[c.status] + '22', color: STATUS_COLORS[c.status], padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{c.status}</span></span>
                  <span style={{ color: 'var(--text-secondary)' }}>{money(c.budget)}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{money(c.spend)}</span>
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>{money(c.revenue)}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{roas === '—' ? '—' : roas + 'x'}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{cpa === '—' ? '—' : '$' + cpa}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Email Tab */}
      {tab === 'email' && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 100px 80px 80px 80px 70px', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            <span>Subject</span><span>Platform</span><span>Sent</span><span>Open %</span><span>Click %</span><span>Revenue</span>
          </div>
          {sortedEmails.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No emails logged yet. Click "Log Email" to add one.</div>
          )}
          {sortedEmails.map(e => {
            const openRate = Number(e.sent) ? (Number(e.opened) / Number(e.sent) * 100).toFixed(1) : '—'
            const ctr = Number(e.opened) ? (Number(e.clicked) / Number(e.opened) * 100).toFixed(1) : '—'
            return (
              <div key={e.id} onClick={() => setEmailModal(e)} style={{ display: 'grid', gridTemplateColumns: '2.5fr 100px 80px 80px 80px 70px', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 14 }}
                onMouseEnter={ex => ex.currentTarget.style.background = 'var(--surface-3)'}
                onMouseLeave={ex => ex.currentTarget.style.background = 'transparent'}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{e.date}</div>
                </div>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>{EMAIL_PLATFORMS[e.platform]?.icon} {EMAIL_PLATFORMS[e.platform]?.label}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{fmt(Number(e.sent))}</span>
                <span style={{ color: Number(openRate) >= 20 ? '#22c55e' : 'var(--text-primary)', fontWeight: 500 }}>{openRate === '—' ? '—' : openRate + '%'}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{ctr === '—' ? '—' : ctr + '%'}</span>
                <span style={{ color: '#22c55e', fontWeight: 600 }}>{money(e.revenue)}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {campaignModal !== null && <CampaignModal campaign={Object.keys(campaignModal).length ? campaignModal : null} onClose={() => setCampaignModal(null)} onSave={saveCampaign} onDelete={deleteCampaign} />}
      {emailModal !== null && <EmailModal email={Object.keys(emailModal).length ? emailModal : null} onClose={() => setEmailModal(null)} onSave={saveEmail} onDelete={deleteEmail} />}
    </div>
  )
}
