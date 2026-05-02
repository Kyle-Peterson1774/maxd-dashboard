import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import StatCard from '../components/ui/StatCard.jsx'
import AgentPanel from '../components/ui/AgentPanel.jsx'
import { getTeam } from '../lib/team.js'
import { useAuth } from '../lib/auth.jsx'

// ─── Data readers ──────────────────────────────────────────────────────────────
function loadScripts()  { try { return JSON.parse(localStorage.getItem('maxd_scripts')  || '[]') } catch { return [] } }
function loadContent()  { try { return JSON.parse(localStorage.getItem('maxd_content')  || '[]') } catch { return [] } }
function loadLaunches() { try { return JSON.parse(localStorage.getItem('maxd_launches') || '[]') } catch { return [] } }
function loadAds()      { try { return JSON.parse(localStorage.getItem('maxd_ads')      || '[]') } catch { return [] } }
function loadQueue(email) {
  const key = `queue:${email || 'shared'}`
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : { items: [] } } catch { return { items: [] } }
}

function loadSocial()    { try { return JSON.parse(localStorage.getItem('maxd_social')    || 'null') } catch { return null } }
function loadMarketing() { try { return JSON.parse(localStorage.getItem('maxd_marketing') || 'null') } catch { return null } }
function loadFinance()   { try { return JSON.parse(localStorage.getItem('maxd_finance')   || 'null') } catch { return null } }
function loadOps()       { try { return JSON.parse(localStorage.getItem('maxd_operations')|| 'null') } catch { return null } }

function deriveBizStats() {
  const social    = loadSocial()
  const marketing = loadMarketing()
  const finance   = loadFinance()
  const ops       = loadOps()

  let totalFollowers = 0
  if (social?.snapshots?.length) {
    const latest = [...social.snapshots].sort((a, b) => b.date.localeCompare(a.date))[0]
    totalFollowers = ['instagram','tiktok','youtube','facebook'].reduce((s, k) => s + Number(latest[k] || 0), 0)
  }

  const activeCampaigns = marketing?.campaigns?.filter(c => c.status === 'active') || []
  const totalAdSpend    = activeCampaigns.reduce((s, c) => s + Number(c.spend || 0), 0)
  const overBudget      = marketing?.campaigns?.filter(c => Number(c.spend) >= Number(c.budget) && c.status === 'active') || []

  const cashOnHand = finance?.cashOnHand || 0
  let monthlyRevenue = 0
  let netProfit = 0
  if (finance?.months?.length) {
    const latest = [...finance.months].sort((a, b) => b.month.localeCompare(a.month))[0]
    const totalExp = ['cogs','marketing','payroll','fulfillment','software','office','legal','misc'].reduce((s,k) => s+Number(latest[k]||0),0)
    monthlyRevenue = Number(latest.revenue || 0)
    netProfit = monthlyRevenue - totalExp
  }

  const lowStockItems = (ops?.inventory || []).filter(i => Number(i.stock) <= Number(i.reorderPoint))
  return { totalFollowers, activeCampaigns: activeCampaigns.length, totalAdSpend, overBudget, cashOnHand, monthlyRevenue, netProfit, lowStockItems }
}

function moneyFmt(n) { return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }) }
function fmtFollowers(n) { return n >= 1000 ? (n/1000).toFixed(1) + 'k' : String(n) }
function todayStr() { return new Date().toISOString().split('T')[0] }
function addDays(d, n) { const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() + n); return dt.toISOString().split('T')[0] }
function fmtDate(str) {
  if (!str) return ''
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function daysUntil(str) {
  if (!str) return null
  return Math.ceil((new Date(str + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 86400000)
}
function timeSince(ts) {
  if (!ts) return ''
  const mins = Math.floor((Date.now() - new Date(ts)) / 60000)
  if (mins < 1)    return 'just now'
  if (mins < 60)   return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CardHeader({ title, to, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.10em',
        fontFamily: 'var(--font-body)',
      }}>
        {title}
      </span>
      {action && to && (
        <Link to={to} style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, letterSpacing: '0.01em' }}>
          {action} →
        </Link>
      )}
    </div>
  )
}

function EmptyState({ message, cta, to }) {
  return (
    <div style={{ padding: '10px 0', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
      {message}{' '}
      {cta && to && (
        <Link to={to} style={{ color: 'var(--red)', fontWeight: 600 }}>{cta} →</Link>
      )}
    </div>
  )
}

function ListRow({ accent, children }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '9px 11px',
      background: 'var(--surface)',
      borderRadius: 8,
      borderLeft: `2px solid ${accent || 'transparent'}`,
    }}>
      {children}
    </div>
  )
}

// ─── Row variants ──────────────────────────────────────────────────────────────

function ShootRow({ script }) {
  const du = daysUntil(script.shootDate)
  const label   = du === 0 ? 'Today' : du === 1 ? 'Tomorrow' : `In ${du}d`
  const urgent  = du !== null && du <= 2
  return (
    <ListRow accent={urgent ? 'var(--red)' : 'var(--border)'}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {script.title || 'Untitled'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {script.location || 'No location'} · {fmtDate(script.shootDate)}
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: urgent ? 'var(--red)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </ListRow>
  )
}

const CONTENT_STATUS_COLORS = {
  draft:     { bg: 'var(--surface-3)',  text: 'var(--text-muted)' },
  scripting: { bg: 'var(--blue-bg)',    text: 'var(--blue-text)' },
  filming:   { bg: '#FDE8EE',           text: 'var(--red)' },
  editing:   { bg: 'var(--purple-bg)', text: 'var(--purple-text)' },
  ready:     { bg: 'var(--green-bg)',   text: 'var(--green-text)' },
  published: { bg: 'var(--green-bg)',   text: 'var(--green-text)' },
}

function StatusBadge({ status, colorMap }) {
  const sc = colorMap[status] || { bg: 'var(--surface-3)', text: 'var(--text-muted)' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 99,
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.03em',
      background: sc.bg,
      color: sc.text,
      whiteSpace: 'nowrap',
    }}>
      {status || 'draft'}
    </span>
  )
}

function ContentRow({ item }) {
  const platforms = Array.isArray(item.platforms) ? item.platforms : (item.platform ? [item.platform] : [])
  return (
    <ListRow>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {platforms.slice(0, 2).join(', ') || '—'} · {item.scheduledDate ? fmtDate(item.scheduledDate) : 'Unscheduled'}
        </div>
      </div>
      <StatusBadge status={item.status || 'draft'} colorMap={CONTENT_STATUS_COLORS} />
    </ListRow>
  )
}

function LaunchRow({ launch }) {
  const du    = daysUntil(launch.launchDate)
  const items = launch.checklist || []
  const pct   = items.length ? Math.round((items.filter(i => i.done).length / items.length) * 100) : 0
  const duLabel = du === null ? '—' : du < 0 ? `${Math.abs(du)}d ago` : du === 0 ? 'Today' : `${du}d`
  const duColor = du !== null && du <= 3 ? 'var(--red)' : 'var(--text-muted)'
  return (
    <div style={{ padding: '9px 11px', background: 'var(--surface)', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {launch.name}
        </div>
        <span style={{ fontSize: 11, color: duColor, fontWeight: 600, whiteSpace: 'nowrap' }}>{duLabel}</span>
      </div>
      <div style={{ height: 3, background: 'var(--surface-4)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--red)', borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 5, fontWeight: 500 }}>
        {pct}% complete · {launch.product || 'No product'}
      </div>
    </div>
  )
}

const AD_STATUS_COLORS = {
  draft:    { bg: 'var(--surface-3)', text: 'var(--text-muted)' },
  review:   { bg: 'var(--amber-bg)',  text: 'var(--amber-text)' },
  live:     { bg: 'var(--green-bg)',  text: 'var(--green-text)' },
  paused:   { bg: '#FDE8EE',          text: 'var(--red)' },
  complete: { bg: 'var(--surface-3)', text: 'var(--text-muted)' },
}

function AdRow({ ad }) {
  return (
    <ListRow>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ad.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {[ad.platform, ad.objective].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <StatusBadge status={ad.status || 'draft'} colorMap={AD_STATUS_COLORS} />
        {ad.budget && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>${ad.budget}/mo</div>}
      </div>
    </ListRow>
  )
}

const QUEUE_TYPE_META = {
  instagram_post: { icon: '📸', label: 'Instagram Post',  color: '#E1306C' },
  tiktok_post:    { icon: '🎵', label: 'TikTok Post',     color: '#010101' },
  facebook_post:  { icon: '👍', label: 'Facebook Post',   color: '#1877F2' },
  youtube_post:   { icon: '▶',  label: 'YouTube Short',   color: '#FF0000' },
  email_campaign: { icon: '✉️', label: 'Email Campaign',  color: '#00B5AD' },
  email_sequence: { icon: '📬', label: 'Sales Email',     color: '#E21B4D' },
  gmail_draft:    { icon: '📧', label: 'Gmail Draft',     color: '#4285F4' },
}

function QueueRow({ item }) {
  const meta = QUEUE_TYPE_META[item.type] || { icon: '📋', label: item.type || 'Task', color: 'var(--navy)' }
  const age = item.createdAt ? Math.floor((Date.now() - new Date(item.createdAt)) / 60000) : null
  const ageLabel = age === null ? '' : age < 60 ? `${age}m ago` : age < 1440 ? `${Math.floor(age/60)}h ago` : `${Math.floor(age/1440)}d ago`
  return (
    <ListRow accent={meta.color}>
      <span style={{ fontSize: 15, flexShrink: 0 }}>{meta.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.caption || item.subject || item.title || meta.label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{meta.label}</div>
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{ageLabel}</span>
    </ListRow>
  )
}

// ─── Activity feed ────────────────────────────────────────────────────────────
function buildActivityFeed(scripts, content, queue) {
  const events = []
  content
    .filter(c => c.status === 'published' && c.publishedAt)
    .forEach(c => events.push({ id: c.id, ts: c.publishedAt, icon: '✅', text: `Published "${c.title}"`, sub: (c.platforms||[]).join(', ') || c.platform || 'Content', color: 'var(--green)' }))
  scripts
    .filter(s => s.status === 'ready')
    .forEach(s => {
      if (s.updatedAt || s.createdAt)
        events.push({ id: s.id, ts: s.updatedAt || s.createdAt, icon: '🎬', text: `Script ready: "${s.title}"`, sub: 'Ready to film', color: 'var(--blue)' })
    })
  queue.items
    .filter(q => q.status === 'sent' && q.sentAt)
    .forEach(q => {
      const meta = QUEUE_TYPE_META[q.type] || { icon: '📋', label: q.type }
      events.push({ id: q.id, ts: q.sentAt, icon: meta.icon, text: q.caption || q.subject || meta.label, sub: `Sent via ${meta.label}`, color: meta.color })
    })
  queue.items
    .filter(q => q.status === 'pending' && q.createdAt)
    .slice(0, 3)
    .forEach(q => {
      const meta = QUEUE_TYPE_META[q.type] || { icon: '📋', label: q.type }
      events.push({ id: q.id + '_p', ts: q.createdAt, icon: '🕐', text: `Queued: ${q.caption || q.subject || meta.label}`, sub: `Awaiting review · ${meta.label}`, color: 'var(--amber)' })
    })
  return events.sort((a, b) => (b.ts||'').localeCompare(a.ts||'')).slice(0, 6)
}

// ─── Brand Banner ─────────────────────────────────────────────────────────────
function BrandBanner() {
  const today   = new Date()
  const weekday = today.toLocaleDateString('en-US', { weekday: 'long' })
  const date    = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return (
    <div style={{
      background: 'var(--navy)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.5rem 2rem',
      marginBottom: '1.75rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ position: 'absolute', right: -20, top: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(226,27,77,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 60, bottom: -50, width: 140, height: 140, borderRadius: '50%', background: 'rgba(226,27,77,0.04)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: 'var(--font-heading)', color: 'rgba(255,255,255,0.32)', fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 7, fontWeight: 500 }}>
          {weekday} · {date}
        </div>
        <div style={{ fontFamily: 'var(--font-heading)', color: '#FFFFFF', fontSize: 22, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.1 }}>
          Go Beyond Your Limits
        </div>
        <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11.5, marginTop: 7, letterSpacing: '0.03em', fontWeight: 400 }}>
          Creatine Gummies · U.S. Manufactured · Third-Party Tested
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'right', flexShrink: 0 }}>
        <svg width="52" height="38" viewBox="0 0 24 18" fill="none">
          <path d="M0 18 L8 2 L12 9 L14 6 L24 18Z" fill="rgba(226,27,77,0.9)"/>
          <path d="M12 9 L14 6 L24 18 L12 18Z" fill="rgba(226,27,77,0.45)"/>
        </svg>
        <div style={{ fontFamily: 'var(--font-heading)', color: 'rgba(255,255,255,0.88)', fontSize: 13, letterSpacing: '0.18em', fontWeight: 700, marginTop: 4 }}>
          MAXD
        </div>
      </div>
    </div>
  )
}

// ─── Alert banner ─────────────────────────────────────────────────────────────
function Alert({ icon, color, bg, border, children }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '0.65rem 1rem', fontSize: 13, color, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>{icon}</span>
      <span>{children}</span>
    </div>
  )
}

// ─── Quick action link ────────────────────────────────────────────────────────
function QuickAction({ label, icon, to }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', transition: 'all 0.14s ease', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
      </div>
    </Link>
  )
}

// ─── Getting Started ──────────────────────────────────────────────────────────
function GettingStarted() {
  const steps = [
    { icon: '🛒', title: 'Connect Shopify',       desc: 'Pull real orders, revenue & inventory automatically.',        to: '/settings', cta: 'Open Settings' },
    { icon: '🎬', title: 'Write Your First Script', desc: 'Use the PAS framework or AI to plan your next video.',      to: '/scripts',  cta: 'New Script' },
    { icon: '📅', title: 'Build Content Calendar',  desc: 'Schedule posts and track every piece of content.',           to: '/content',  cta: 'Add Content' },
    { icon: '📦', title: 'Plan a Launch',           desc: 'Set up a product launch with a full checklist.',            to: '/launches', cta: 'New Launch' },
    { icon: '📈', title: 'Track Social Growth',     desc: 'Log follower snapshots and track growth over time.',        to: '/social',   cta: 'Open Social' },
    { icon: '🤖', title: 'Set Up AI Studio',        desc: 'Generate ad copy, emails, and content scripts with AI.',   to: '/ai',       cta: 'Open AI Studio' },
  ]
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1.75rem 2rem', textAlign: 'center', border: '1px solid rgba(226,27,77,0.15)' }}>
        <div style={{ fontSize: 26, marginBottom: 10 }}>👋</div>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: 'var(--navy)', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
          Welcome to MAXD Dashboard
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
          Your operations hub is ready. Start by connecting your data or adding your first content — everything flows from here.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {steps.map(s => (
          <Link key={s.to} to={s.to} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ display: 'flex', gap: 14, padding: '1rem 1.15rem', transition: 'all 0.14s', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>{s.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.desc}</div>
                <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, marginTop: 6 }}>{s.cta} →</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState({ scripts: [], content: [], launches: [], ads: [], team: [], queue: { items: [] } })
  const [biz, setBiz]   = useState(() => deriveBizStats())

  useEffect(() => {
    setData({ scripts: loadScripts(), content: loadContent(), launches: loadLaunches(), ads: loadAds(), team: getTeam(), queue: loadQueue(user?.email) })
    setBiz(deriveBizStats())
  }, [user?.email])

  const { scripts, content, launches, ads, team, queue } = data
  const td = todayStr()

  const activeScripts    = scripts.filter(s => s.status === 'draft' || s.status === 'in_progress').length
  const readyScripts     = scripts.filter(s => s.status === 'ready').length
  const upcomingShoots   = scripts.filter(s => s.shootDate && s.shootDate >= td && s.shootDate <= addDays(td, 14)).sort((a, b) => a.shootDate.localeCompare(b.shootDate)).slice(0, 4)
  const thisMonth        = new Date().toISOString().slice(0, 7)
  const scheduledUpcoming = content.filter(c => c.scheduledDate && c.scheduledDate >= td && c.status !== 'published').length
  const upcomingContent  = content.filter(c => c.scheduledDate && c.scheduledDate >= td && c.scheduledDate <= addDays(td, 7)).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)).slice(0, 4)
  const activeLaunches   = launches.filter(l => l.status !== 'complete').slice(0, 3)
  const activeAds        = ads.filter(a => a.status === 'live' || a.status === 'review').slice(0, 3)
  const queueItems       = queue.items || []
  const pendingItems     = queueItems.filter(q => q.status === 'pending')
  const sentThisMonth    = queueItems.filter(q => q.status === 'sent' && q.sentAt?.startsWith(thisMonth)).length
  const activityFeed     = buildActivityFeed(scripts, content, queue)
  const teamWithWork     = team.map(m => ({ ...m, scripts: scripts.filter(s => s.assignedTo === m.id).length, posts: content.filter(c => c.assignedTo === m.id).length })).filter(m => m.scripts + m.posts > 0)
  const isFirstTime      = scripts.length === 0 && content.length === 0 && launches.length === 0 && ads.length === 0 && queueItems.length === 0

  return (
    <div>
      <BrandBanner />
      {isFirstTime && <GettingStarted />}

      {/* Business KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10, marginBottom: 10 }}>
        <StatCard label="Monthly Revenue"  value={moneyFmt(biz.monthlyRevenue)}            sub="latest month"     accent="var(--green)" />
        <StatCard label="Net Profit"       value={moneyFmt(biz.netProfit)}                 sub="after expenses"   accent={biz.netProfit >= 0 ? 'var(--green)' : 'var(--red)'} />
        <StatCard label="Cash on Hand"     value={moneyFmt(biz.cashOnHand)}                sub="current balance"  accent="var(--navy)" />
        <StatCard label="Total Followers"  value={fmtFollowers(biz.totalFollowers)}        sub="all platforms"    accent="var(--purple)" />
        <StatCard label="Active Campaigns" value={biz.activeCampaigns}                     sub={`$${Math.round(biz.totalAdSpend).toLocaleString()} spend`} accent="var(--blue)" />
        <StatCard label="Low Stock Alerts" value={biz.lowStockItems.length}                sub="need reorder"     accent={biz.lowStockItems.length > 0 ? 'var(--red)' : 'var(--green)'} />
      </div>

      {/* Alerts */}
      {(biz.lowStockItems.length > 0 || biz.overBudget.length > 0 || (biz.cashOnHand < 10000 && biz.cashOnHand > 0)) && (
        <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {biz.lowStockItems.length > 0 && (
            <Link to="/operations" style={{ textDecoration: 'none' }}>
              <Alert icon="⚠️" color="#92400E" bg="#FFFBEB" border="#FDE68A">
                <strong>Low stock:</strong> {biz.lowStockItems.map(i => i.name).join(', ')} — go to Operations to reorder
              </Alert>
            </Link>
          )}
          {biz.overBudget.length > 0 && (
            <Link to="/marketing" style={{ textDecoration: 'none' }}>
              <Alert icon="🚨" color="#B91C1C" bg="#FEF2F2" border="#FECACA">
                <strong>Over budget:</strong> {biz.overBudget.map(c => c.name).join(', ')} — check Marketing
              </Alert>
            </Link>
          )}
          {biz.cashOnHand < 10000 && biz.cashOnHand > 0 && (
            <Link to="/finance" style={{ textDecoration: 'none' }}>
              <Alert icon="💰" color="#B91C1C" bg="#FEF2F2" border="#FECACA">
                <strong>Cash on hand below $10k</strong> — review Finance
              </Alert>
            </Link>
          )}
        </div>
      )}

      {/* Content KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10, marginBottom: '1.75rem' }}>
        <StatCard label="Scripts Active"    value={activeScripts}         sub="in progress"     accent="var(--blue)" />
        <StatCard label="Scripts Ready"     value={readyScripts}          sub="ready to film"   accent="var(--green)" />
        <StatCard label="Upcoming Shoots"   value={upcomingShoots.length} sub="next 14 days"    accent="var(--red)" />
        <StatCard label="Content Scheduled" value={scheduledUpcoming}     sub="upcoming posts"  accent="var(--purple)" />
        <StatCard label="Pending Review"    value={pendingItems.length}   sub="in action queue" accent={pendingItems.length > 0 ? 'var(--amber)' : 'var(--green)'} />
        <StatCard label="Sent This Month"   value={sentThisMonth}         sub={thisMonth.replace('-','/')} accent="var(--navy)" />
      </div>

      {/* 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <CardHeader title="Upcoming Shoots" action="All Scripts" to="/scripts" />
          {upcomingShoots.length === 0
            ? <EmptyState message="No shoots in the next 14 days." cta="Add shoot dates" to="/scripts" />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{upcomingShoots.map(s => <ShootRow key={s.id} script={s} />)}</div>
          }
        </div>

        <div className="card">
          <CardHeader title="This Week's Content" action="Calendar" to="/content" />
          {upcomingContent.length === 0
            ? <EmptyState message="Nothing scheduled this week." cta="Open Calendar" to="/content" />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{upcomingContent.map(c => <ContentRow key={c.id} item={c} />)}</div>
          }
        </div>

        <div className="card">
          <CardHeader title="Active Launches" action="All Launches" to="/launches" />
          {activeLaunches.length === 0
            ? <EmptyState message="No active launches." cta="Plan a launch" to="/launches" />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{activeLaunches.map(l => <LaunchRow key={l.id} launch={l} />)}</div>
          }
        </div>

        <div className="card">
          <CardHeader title="Ad Campaigns" action="All Ads" to="/ads" />
          {activeAds.length === 0
            ? <EmptyState message="No live or in-review ads." cta="Create a campaign" to="/ads" />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{activeAds.map(a => <AdRow key={a.id} ad={a} />)}</div>
          }
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <CardHeader title="Quick Actions" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
            <QuickAction label="New Script"    icon="🎬" to="/scripts"   />
            <QuickAction label="Add Content"   icon="📅" to="/content"   />
            <QuickAction label="New Launch"    icon="🚀" to="/launches"  />
            <QuickAction label="New Ad"        icon="📣" to="/ads"       />
            <QuickAction label="Action Queue"  icon="☑️" to="/queue"     />
            <QuickAction label="Analytics"     icon="📊" to="/analytics" />
          </div>
        </div>

        <div className="card">
          <CardHeader title="Team Workload" action="Settings" to="/settings" />
          {teamWithWork.length === 0
            ? <EmptyState message="No assignments yet. Assign scripts or posts to see workload here." />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {teamWithWork.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: m.color || 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, fontFamily: 'var(--font-heading)', letterSpacing: '0.04em' }}>
                      {m.initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {[m.scripts > 0 ? `${m.scripts} script${m.scripts > 1 ? 's' : ''}` : null, m.posts > 0 ? `${m.posts} post${m.posts > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Queue + Activity · Agent */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        <div className="card">
          <CardHeader
            title={pendingItems.length > 0 ? `Pending Review (${pendingItems.length})` : 'Pending Review'}
            action="View All"
            to="/queue"
          />
          {pendingItems.length === 0
            ? <EmptyState message="No items pending review." cta="Open Queue" to="/queue" />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {pendingItems.slice(0, 4).map(q => <QueueRow key={q.id} item={q} />)}
                {pendingItems.length > 4 && (
                  <Link to="/queue" style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, paddingTop: 4, display: 'block' }}>
                    +{pendingItems.length - 4} more →
                  </Link>
                )}
              </div>
          }
        </div>

        <div className="card">
          <CardHeader title="Recent Activity" />
          {activityFeed.length === 0
            ? <EmptyState message="No recent activity. Start adding scripts, content, or queue items." />
            : <div style={{ display: 'flex', flexDirection: 'column' }}>
                {activityFeed.map((ev, i) => (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: i < activityFeed.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${ev.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                      {ev.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.text}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        {ev.sub} · {timeSince(ev.ts)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      <AgentPanel
        module="dashboard"
        contextData={{
          scripts:  { total: scripts.length, active: activeScripts, readyToFilm: readyScripts, upcomingShoots: upcomingShoots.length },
          content:  { total: content.length, scheduledUpcoming },
          launches: { active: activeLaunches.length },
          queue:    { pending: pendingItems.length, sentThisMonth },
          business: { monthlyRevenue: biz.monthlyRevenue, netProfit: biz.netProfit, cashOnHand: biz.cashOnHand, totalFollowers: biz.totalFollowers, activeCampaigns: biz.activeCampaigns, lowStockAlerts: biz.lowStockItems.length },
        }}
      />
    </div>
  )
}
