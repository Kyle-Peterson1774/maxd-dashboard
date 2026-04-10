import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import StatCard from '../components/ui/StatCard.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { getTeam } from '../lib/team.js'

// ─── Data readers ─────────────────────────────────────────────────────────────
function loadScripts()  { try { return JSON.parse(localStorage.getItem('maxd_scripts')  || '[]') } catch { return [] } }
function loadContent()  { try { return JSON.parse(localStorage.getItem('maxd_content')  || '[]') } catch { return [] } }
function loadLaunches() { try { return JSON.parse(localStorage.getItem('maxd_launches') || '[]') } catch { return [] } }
function loadAds()      { try { return JSON.parse(localStorage.getItem('maxd_ads')      || '[]') } catch { return [] } }

// ─── Business data readers ─────────────────────────────────────────────────────
function loadSocial()  { try { return JSON.parse(localStorage.getItem('maxd_social') || 'null') } catch { return null } }
function loadMarketing() { try { return JSON.parse(localStorage.getItem('maxd_marketing') || 'null') } catch { return null } }
function loadFinance() { try { return JSON.parse(localStorage.getItem('maxd_finance') || 'null') } catch { return null } }
function loadOps()     { try { return JSON.parse(localStorage.getItem('maxd_operations') || 'null') } catch { return null } }

function deriveBizStats() {
  const social = loadSocial()
  const marketing = loadMarketing()
  const finance = loadFinance()
  const ops = loadOps()

  // Total followers from latest snapshot
  let totalFollowers = 0
  if (social?.snapshots?.length) {
    const latest = [...social.snapshots].sort((a, b) => b.date.localeCompare(a.date))[0]
    totalFollowers = ['instagram','tiktok','youtube','facebook'].reduce((s, k) => s + Number(latest[k] || 0), 0)
  }

  // Ad spend & active campaigns
  const activeCampaigns = marketing?.campaigns?.filter(c => c.status === 'active') || []
  const totalAdSpend = activeCampaigns.reduce((s, c) => s + Number(c.spend || 0), 0)
  const overBudget = marketing?.campaigns?.filter(c => Number(c.spend) >= Number(c.budget) && c.status === 'active') || []

  // Finance
  const cashOnHand = finance?.cashOnHand || 0
  let monthlyRevenue = 0
  let netProfit = 0
  if (finance?.months?.length) {
    const latest = [...finance.months].sort((a, b) => b.month.localeCompare(a.month))[0]
    const totalExp = ['cogs','marketing','payroll','fulfillment','software','office','legal','misc'].reduce((s,k) => s+Number(latest[k]||0),0)
    monthlyRevenue = Number(latest.revenue || 0)
    netProfit = monthlyRevenue - totalExp
  }

  // Inventory alerts
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

// ─── Section header ────────────────────────────────────────────────────────────
function SectionTitle({ children, action, to }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{
        fontSize: 10.5,
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.10em',
        fontFamily: 'var(--font-body)',
      }}>
        {children}
      </div>
      {action && to && (
        <Link to={to} style={{
          fontSize: 11.5,
          color: 'var(--red)',
          fontWeight: 500,
          letterSpacing: '0.01em',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}>
          {action} →
        </Link>
      )}
    </div>
  )
}

// ─── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status, colorMap }) {
  const sc = colorMap[status] || colorMap.draft || { bg: 'var(--surface-3)', text: 'var(--text-muted)' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 9px',
      borderRadius: 99,
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.03em',
      background: sc.bg,
      color: sc.text,
      fontFamily: 'var(--font-body)',
      whiteSpace: 'nowrap',
    }}>
      {status || 'draft'}
    </span>
  )
}

// ─── Row cards ─────────────────────────────────────────────────────────────────
function ItemRow({ children, accent }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 13px',
      background: 'var(--surface)',
      borderRadius: 8,
      borderLeft: accent ? `2px solid ${accent}` : '2px solid transparent',
    }}>
      {children}
    </div>
  )
}

function ShootRow({ script }) {
  const du = daysUntil(script.shootDate)
  const label = du === 0 ? 'Today' : du === 1 ? 'Tomorrow' : `In ${du}d`
  const urgent = du !== null && du <= 2
  return (
    <ItemRow accent={urgent ? 'var(--red)' : 'var(--border-mid)'}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {script.title || 'Untitled'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {script.location || 'No location set'} · {fmtDate(script.shootDate)}
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: urgent ? 'var(--red)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </ItemRow>
  )
}

const CONTENT_STATUS = {
  draft:     { bg: 'var(--surface-3)',  text: 'var(--text-muted)' },
  scripting: { bg: '#EBF1FE',           text: '#1E4DC9' },
  filming:   { bg: '#FDE8EE',           text: 'var(--red)' },
  editing:   { bg: '#F0EBFE',           text: '#4F1FCC' },
  ready:     { bg: 'var(--green-bg)',   text: 'var(--green-text)' },
  published: { bg: 'var(--green-bg)',   text: 'var(--green-text)' },
}

function ContentRow({ item }) {
  const platforms = Array.isArray(item.platforms) ? item.platforms : (item.platform ? [item.platform] : [])
  return (
    <ItemRow>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {platforms.slice(0, 3).join(', ') || '—'} · {item.scheduledDate ? fmtDate(item.scheduledDate) : 'Unscheduled'}
        </div>
      </div>
      <StatusPill status={item.status || 'draft'} colorMap={CONTENT_STATUS} />
    </ItemRow>
  )
}

function LaunchRow({ launch }) {
  const du = daysUntil(launch.launchDate)
  const items = launch.checklist || []
  const pct = items.length ? Math.round((items.filter(i => i.done).length / items.length) * 100) : 0
  const duLabel = du === null ? '—' : du < 0 ? `${Math.abs(du)}d ago` : du === 0 ? 'Today!' : `${du}d`
  const duColor = du !== null && du <= 3 ? 'var(--red)' : 'var(--text-muted)'
  return (
    <div style={{ padding: '10px 13px', background: 'var(--surface)', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {launch.name}
        </div>
        <span style={{ fontSize: 11, color: duColor, fontWeight: 600, whiteSpace: 'nowrap' }}>{duLabel}</span>
      </div>
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: pct === 100 ? 'var(--green)' : 'var(--red)',
          borderRadius: 99,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 5, fontWeight: 500 }}>
        {pct}% complete · {launch.product || 'No product'}
      </div>
    </div>
  )
}

const AD_STATUS = {
  draft:    { bg: 'var(--surface-3)',  text: 'var(--text-muted)' },
  review:   { bg: 'var(--amber-bg)',   text: 'var(--amber-text)' },
  live:     { bg: 'var(--green-bg)',   text: 'var(--green-text)' },
  paused:   { bg: '#FDE8EE',           text: 'var(--red)' },
  complete: { bg: 'var(--surface-3)',  text: 'var(--text-muted)' },
}

function AdRow({ ad }) {
  return (
    <ItemRow>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ad.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {[ad.platform, ad.objective].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <StatusPill status={ad.status || 'draft'} colorMap={AD_STATUS} />
        {ad.budget && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>${ad.budget}/mo</div>}
      </div>
    </ItemRow>
  )
}

function QuickBtn({ label, icon, to }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 13px',
          background: 'var(--surface)',
          borderRadius: 8,
          border: '1px solid var(--border)',
          transition: 'all 0.15s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--surface-3)'
          e.currentTarget.style.borderColor = 'var(--border-mid)'
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--surface)'
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.transform = 'none'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
      </div>
    </Link>
  )
}

// ─── Brand Banner ─────────────────────────────────────────────────────────────
function BrandBanner() {
  const today = new Date()
  const weekday = today.toLocaleDateString('en-US', { weekday: 'long' })
  const date = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

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
      {/* Background geometric accent */}
      <div style={{
        position: 'absolute', right: -20, top: -30,
        width: 200, height: 200,
        borderRadius: '50%',
        background: 'rgba(226,27,77,0.07)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 60, bottom: -50,
        width: 140, height: 140,
        borderRadius: '50%',
        background: 'rgba(226,27,77,0.04)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-heading)',
          color: 'rgba(255,255,255,0.35)',
          fontSize: 9.5,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 6,
          fontWeight: 500,
        }}>
          {weekday} · {date}
        </div>
        <div style={{
          fontFamily: 'var(--font-heading)',
          color: '#FFFFFF',
          fontSize: 22,
          letterSpacing: '0.08em',
          fontWeight: 700,
          textTransform: 'uppercase',
          lineHeight: 1.1,
        }}>
          Go Beyond Your Limits
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: 11.5,
          marginTop: 6,
          letterSpacing: '0.03em',
          fontWeight: 400,
        }}>
          Creatine Gummies · U.S. Manufactured · Third-Party Tested
        </div>
      </div>

      {/* Logo mark */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'right', flexShrink: 0 }}>
        <svg width="52" height="38" viewBox="0 0 24 18" fill="none">
          <path d="M0 18 L8 2 L12 9 L14 6 L24 18Z" fill="rgba(226,27,77,0.9)"/>
          <path d="M12 9 L14 6 L24 18 L12 18Z" fill="rgba(226,27,77,0.45)"/>
        </svg>
        <div style={{
          fontFamily: 'var(--font-heading)',
          color: 'rgba(255,255,255,0.9)',
          fontSize: 13,
          letterSpacing: '0.18em',
          fontWeight: 700,
          marginTop: 4,
        }}>
          MAXD
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function Empty({ message, cta, to }) {
  return (
    <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-muted)' }}>
      {message}{' '}
      {cta && to && (
        <Link to={to} style={{ color: 'var(--red)', fontWeight: 500 }}>{cta} →</Link>
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState({ scripts: [], content: [], launches: [], ads: [], team: [] })
  const [biz, setBiz] = useState(() => deriveBizStats())

  useEffect(() => {
    setData({
      scripts:  loadScripts(),
      content:  loadContent(),
      launches: loadLaunches(),
      ads:      loadAds(),
      team:     getTeam(),
    })
    setBiz(deriveBizStats())
  }, [])

  const { scripts, content, launches, ads, team } = data
  const td = todayStr()

  // Script stats
  const activeScripts = scripts.filter(s => s.status === 'draft' || s.status === 'in_progress').length
  const readyScripts  = scripts.filter(s => s.status === 'ready').length

  // Upcoming shoots next 14 days
  const upcomingShoots = scripts
    .filter(s => s.shootDate && s.shootDate >= td && s.shootDate <= addDays(td, 14))
    .sort((a, b) => a.shootDate.localeCompare(b.shootDate))
    .slice(0, 4)

  // Content stats
  const thisMonth = new Date().toISOString().slice(0, 7)
  const publishedThisMonth = content.filter(c => c.status === 'published' && c.scheduledDate?.startsWith(thisMonth)).length
  const scheduledUpcoming  = content.filter(c => c.scheduledDate && c.scheduledDate >= td && c.status !== 'published').length
  const readyToUpload      = content.filter(c => c.status === 'ready' && !c.uploadStatus).length

  // Content this week
  const upcomingContent = content
    .filter(c => c.scheduledDate && c.scheduledDate >= td && c.scheduledDate <= addDays(td, 7))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .slice(0, 4)

  // Active launches
  const activeLaunches = launches.filter(l => l.status !== 'complete').slice(0, 3)

  // Live/review ads
  const activeAds = ads.filter(a => a.status === 'live' || a.status === 'review').slice(0, 3)

  // Team workload
  const teamWithWork = team.map(m => ({
    ...m,
    scripts: scripts.filter(s => s.assignedTo === m.id).length,
    posts:   content.filter(c => c.assignedTo === m.id).length,
  })).filter(m => m.scripts + m.posts > 0)

  return (
    <div>
      <BrandBanner />

      {/* Business KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, marginBottom: 12 }}>
        <StatCard label="Monthly Revenue"   value={moneyFmt(biz.monthlyRevenue)}  sub="latest month"         accent="var(--green)" />
        <StatCard label="Net Profit"        value={moneyFmt(biz.netProfit)}       sub="after expenses"       accent={biz.netProfit >= 0 ? 'var(--green)' : 'var(--red)'} />
        <StatCard label="Cash on Hand"      value={moneyFmt(biz.cashOnHand)}      sub="current balance"      accent="var(--navy)" />
        <StatCard label="Total Followers"   value={fmtFollowers(biz.totalFollowers)} sub="all platforms"      accent="var(--purple)" />
        <StatCard label="Active Campaigns"  value={biz.activeCampaigns}           sub={`$${Math.round(biz.totalAdSpend).toLocaleString()} spend`} accent="var(--blue)" />
        <StatCard label="Low Stock Alerts"  value={biz.lowStockItems.length}      sub="need reorder"         accent={biz.lowStockItems.length > 0 ? 'var(--red)' : 'var(--green)'} />
      </div>

      {/* Alerts */}
      {(biz.lowStockItems.length > 0 || biz.overBudget.length > 0 || biz.cashOnHand < 10000) && (
        <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {biz.lowStockItems.length > 0 && (
            <Link to="/operations" style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fef3c722', border: '1px solid #f59e0b55', borderRadius: 8, padding: '0.6rem 1rem', fontSize: 13, color: '#d97706', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚠️</span>
                <span><strong>Low stock:</strong> {biz.lowStockItems.map(i => i.name).join(', ')} — go to Operations to reorder</span>
              </div>
            </Link>
          )}
          {biz.overBudget.length > 0 && (
            <Link to="/marketing" style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fee2e222', border: '1px solid #ef444455', borderRadius: 8, padding: '0.6rem 1rem', fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🚨</span>
                <span><strong>Over budget:</strong> {biz.overBudget.map(c => c.name).join(', ')} — check Marketing</span>
              </div>
            </Link>
          )}
          {biz.cashOnHand < 10000 && biz.cashOnHand > 0 && (
            <Link to="/finance" style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fee2e222', border: '1px solid #ef444455', borderRadius: 8, padding: '0.6rem 1rem', fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>💰</span>
                <span><strong>Cash on hand below $10k</strong> — review Finance</span>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Content KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, marginBottom: '1.75rem' }}>
        <StatCard label="Scripts Active"    value={activeScripts}          sub="in progress"    accent="var(--blue)" />
        <StatCard label="Scripts Ready"     value={readyScripts}           sub="ready to film"  accent="var(--green)" />
        <StatCard label="Upcoming Shoots"   value={upcomingShoots.length}  sub="next 14 days"   accent="var(--red)" />
        <StatCard label="Content Scheduled" value={scheduledUpcoming}      sub="upcoming posts" accent="var(--purple)" />
        <StatCard label="Ready to Upload"   value={readyToUpload}          sub="needs media"    accent="var(--amber)" />
        <StatCard label="Published"         value={publishedThisMonth}     sub={thisMonth.replace('-', '/')} accent="var(--navy)" />
      </div>

      {/* 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Upcoming shoots */}
        <div className="card">
          <SectionTitle action="All Scripts" to="/scripts">Upcoming Shoots</SectionTitle>
          {upcomingShoots.length === 0
            ? <Empty message="No shoots in the next 14 days." cta="Add shoot dates" to="/scripts" />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {upcomingShoots.map(s => <ShootRow key={s.id} script={s} />)}
              </div>
          }
        </div>

        {/* This week's content */}
        <div className="card">
          <SectionTitle action="Calendar" to="/content">This Week's Content</SectionTitle>
          {upcomingContent.length === 0
            ? <Empty message="Nothing scheduled this week." cta="Open Calendar" to="/content" />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {upcomingContent.map(c => <ContentRow key={c.id} item={c} />)}
              </div>
          }
        </div>

        {/* Active launches */}
        <div className="card">
          <SectionTitle action="All Launches" to="/launches">Active Launches</SectionTitle>
          {activeLaunches.length === 0
            ? <Empty message="No active launches." cta="Plan a launch" to="/launches" />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activeLaunches.map(l => <LaunchRow key={l.id} launch={l} />)}
              </div>
          }
        </div>

        {/* Ad campaigns */}
        <div className="card">
          <SectionTitle action="All Ads" to="/ads">Ad Campaigns</SectionTitle>
          {activeAds.length === 0
            ? <Empty message="No live or in-review ads." cta="Create a campaign" to="/ads" />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activeAds.map(a => <AdRow key={a.id} ad={a} />)}
              </div>
          }
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Quick actions */}
        <div className="card">
          <SectionTitle>Quick Actions</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <QuickBtn label="New Script"   icon="▶"  to="/scripts"   />
            <QuickBtn label="Add Content"  icon="＋" to="/content"   />
            <QuickBtn label="New Launch"   icon="△"  to="/launches"  />
            <QuickBtn label="New Ad"       icon="◈"  to="/ads"       />
            <QuickBtn label="Products"     icon="⬡"  to="/products"  />
            <QuickBtn label="Analytics"    icon="∿"  to="/analytics" />
          </div>
        </div>

        {/* Team workload */}
        <div className="card">
          <SectionTitle action="Settings" to="/settings">Team Workload</SectionTitle>
          {teamWithWork.length === 0
            ? <Empty message="No assignments yet. Assign scripts or posts to see workload here." />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {teamWithWork.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32,
                      borderRadius: '50%',
                      background: m.color || 'var(--red)',
                      color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                      fontFamily: 'var(--font-heading)',
                      letterSpacing: '0.04em',
                    }}>
                      {m.initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {[
                          m.scripts > 0 ? `${m.scripts} script${m.scripts > 1 ? 's' : ''}` : null,
                          m.posts > 0   ? `${m.posts} post${m.posts > 1 ? 's' : ''}` : null,
                        ].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  )
}
