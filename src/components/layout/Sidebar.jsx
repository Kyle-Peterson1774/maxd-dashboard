import { NavLink } from 'react-router-dom'
import { useAuth } from '../../lib/auth.jsx'
import { useState, useEffect } from 'react'

/* ── Icons ───────────────────────────────────────────────────────────────── */
const ICONS = {
  dashboard:  () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/><rect x="8" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.45"/><rect x="1" y="8" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.45"/><rect x="8" y="8" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/></svg>,
  social:     () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="7.5" cy="7.5" r="2" fill="currentColor"/></svg>,
  scripts:    () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 2.5C3 2.22 3.22 2 3.5 2h8C11.78 2 12 2.22 12 2.5v10c0 .28-.22.5-.5.5h-8A.5.5 0 012.5 12V3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/><path d="M5 5.5h5M5 7.5h5M5 9.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  content:    () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M1.5 5.5h12" stroke="currentColor" strokeWidth="1.3"/><path d="M5 1.5v2M10 1.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  launches:   () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5L9.5 6H13L10 9l1.5 4.5L7.5 11l-4 2.5L5 9 2 6h3.5z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/></svg>,
  ads:        () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4h11M2 7.5h7M2 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="10.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>,
  marketing:  () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 9.5V5.5l9-3.5v11L2 9.5z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/><path d="M2 9.5h2.5v3L2 9.5z" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg>,
  products:   () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5l5.5 3v6l-5.5 3-5.5-3v-6z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/><path d="M7.5 1.5v12M2 4.5l5.5 3 5.5-3" stroke="currentColor" strokeWidth="1.2"/></svg>,
  analytics:  () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 12.5l3-4 3 2 3-5 3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
  sales:      () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2v11M4.5 5.5C4.5 4.12 5.84 3 7.5 3s3 1.12 3 2.5c0 2.5-6 2.5-6 5C4.5 11.88 5.84 13 7.5 13s3-1.12 3-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  finance:    () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M1.5 6h12" stroke="currentColor" strokeWidth="1.2"/><path d="M5 9h2M9 9h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  operations: () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M7.5 1v2M7.5 12v2M1 7.5h2M12 7.5h2M3 3l1.5 1.5M10.5 10.5L12 12M3 12l1.5-1.5M10.5 4.5L12 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  ai:         () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L9 5.5H14L10 8.5l1.5 4.5L7.5 10l-4 3L5 8.5 1 5.5h5z" fill="currentColor" opacity="0.9"/></svg>,
  queue:      () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="2.5" width="12" height="2.5" rx="1.25" fill="currentColor" opacity="0.9"/><rect x="1.5" y="6.25" width="9" height="2.5" rx="1.25" fill="currentColor" opacity="0.6"/><rect x="1.5" y="10" width="6" height="2.5" rx="1.25" fill="currentColor" opacity="0.4"/></svg>,
  settings:   () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M7.5 1.5v1.2M7.5 12.3v1.2M1.5 7.5h1.2M12.3 7.5h1.2M3.4 3.4l.85.85M10.75 10.75l.85.85M3.4 11.6l.85-.85M10.75 4.25l.85-.85" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  signout:    () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h3M9 9.5l3-3-3-3M12 6.5H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
}

const NAV_GROUPS = [
  { label: null, items: [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', page: 'dashboard' },
  ]},
  { label: 'Content', color: '#4F6EF7', items: [
    { path: '/social',   label: 'Social',    icon: 'social',   page: 'social'   },
    { path: '/scripts',  label: 'Scripts',   icon: 'scripts',  page: 'scripts'  },
    { path: '/content',  label: 'Calendar',  icon: 'content',  page: 'content'  },
  ]},
  { label: 'Growth', color: '#E21B4D', items: [
    { path: '/launches',  label: 'Launches',    icon: 'launches',  page: 'launches'  },
    { path: '/ads',       label: 'Ad Creative', icon: 'ads',       page: 'ads'       },
    { path: '/marketing', label: 'Marketing',   icon: 'marketing', page: 'marketing' },
  ]},
  { label: 'Commerce', color: '#0CA678', items: [
    { path: '/products',  label: 'Products',  icon: 'products',  page: 'products'  },
    { path: '/analytics', label: 'Analytics', icon: 'analytics', page: 'analytics' },
    { path: '/sales',     label: 'Sales',     icon: 'sales',     page: 'sales'     },
  ]},
  { label: 'Operations', color: '#D97706', items: [
    { path: '/finance',    label: 'Finance',    icon: 'finance',    page: 'finance'    },
    { path: '/operations', label: 'Operations', icon: 'operations', page: 'operations' },
  ]},
  { label: 'Intelligence', color: '#7C3AED', items: [
    { path: '/ai',    label: 'MAXD AI',      icon: 'ai',    page: 'ai',    badge: 'new' },
    { path: '/queue', label: 'Action Queue', icon: 'queue', page: 'queue', badge: 'count' },
  ]},
]

function MountainMark({ size = 22 }) {
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 24 18" fill="none">
      <path d="M0 18 L8 2 L12 9 L14 6 L24 18Z" fill="#E21B4D" opacity="0.95"/>
      <path d="M12 9 L14 6 L24 18 L12 18Z" fill="#E21B4D" opacity="0.42"/>
    </svg>
  )
}

function usePendingQueueCount() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const check = () => {
      try { setCount(JSON.parse(localStorage.getItem('maxd_queue') || '[]').filter(i => i.status === 'pending').length) }
      catch { setCount(0) }
    }
    check()
    const interval = setInterval(check, 15000)
    return () => clearInterval(interval)
  }, [])
  return count
}

function NavItem({ item, onClick, pendingCount }) {
  const Icon = ICONS[item.icon]
  const queueBadge = item.badge === 'count' && pendingCount > 0 ? pendingCount : null
  const newBadge   = item.badge === 'new'

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '7px 12px',
        margin: '1px 8px',
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        color: isActive ? '#141F36' : '#6B7A99',
        background: isActive ? 'rgba(226,27,77,0.08)' : 'transparent',
        borderRadius: 9,
        borderLeft: `2.5px solid ${isActive ? '#E21B4D' : 'transparent'}`,
        paddingLeft: isActive ? '10px' : '12px',
        transition: 'all 0.14s ease',
        textDecoration: 'none',
        outline: 'none',
      })}
      onMouseEnter={e => {
        if (e.currentTarget.getAttribute('aria-current') !== 'page') {
          e.currentTarget.style.background = 'rgba(99,102,241,0.06)'
          e.currentTarget.style.color = '#1A2844'
        }
      }}
      onMouseLeave={e => {
        if (e.currentTarget.getAttribute('aria-current') !== 'page') {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#6B7A99'
        }
      }}
    >
      <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {Icon && <Icon />}
      </span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {newBadge && (
        <span style={{ fontSize: 8.5, padding: '1px 5px', borderRadius: 3, background: 'var(--purple)', color: '#fff', fontWeight: 700, letterSpacing: '0.06em', lineHeight: '14px' }}>NEW</span>
      )}
      {queueBadge && (
        <span style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 10, background: '#F59E0B', color: '#fff', fontWeight: 700, lineHeight: '14px', minWidth: 18, textAlign: 'center' }}>{queueBadge}</span>
      )}
    </NavLink>
  )
}

export default function Sidebar({ onNavClick }) {
  const { user, hasAccess, logout } = useAuth()
  const pendingCount = usePendingQueueCount()

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0, top: 0,
      zIndex: 100,
      borderRight: '1px solid rgba(99,102,241,0.12)',
      boxShadow: '4px 0 24px rgba(99,102,241,0.07)',
    }}>

      {/* ── Logo ── */}
      <div style={{ padding: '1.25rem 1rem 1rem', borderBottom: '1px solid rgba(99,102,241,0.10)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <MountainMark size={26} />
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, color: '#141F36', letterSpacing: '0.14em', lineHeight: 1 }}>MAXD</div>
          <div style={{ fontSize: 8.5, color: '#8E98AD', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 3, fontWeight: 600 }}>Business OS</div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
        {NAV_GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter(item => hasAccess(item.page))
          if (!visibleItems.length) return null
          return (
            <div key={gi} style={{ marginBottom: '0.1rem' }}>
              {group.label && (
                <div style={{ padding: '0.6rem 1.1rem 0.2rem', fontSize: 9, fontWeight: 700, color: group.color || '#8E98AD', letterSpacing: '0.16em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, opacity: 0.7 }}>
                  {group.label}
                </div>
              )}
              {visibleItems.map(item => (
                <NavItem key={item.path} item={item} onClick={onNavClick} pendingCount={pendingCount} />
              ))}
            </div>
          )
        })}
      </nav>

      {/* ── Bottom ── */}
      <div style={{ borderTop: '1px solid rgba(99,102,241,0.10)', flexShrink: 0 }}>
        {hasAccess('settings') && (
          <div style={{ padding: '0.35rem 0 0' }}>
            <NavLink
              to="/settings"
              onClick={onNavClick}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 12px', margin: '1px 8px',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                color: isActive ? '#141F36' : '#6B7A99',
                background: isActive ? 'rgba(226,27,77,0.08)' : 'transparent',
                borderRadius: 9,
                borderLeft: `2.5px solid ${isActive ? '#E21B4D' : 'transparent'}`,
                paddingLeft: isActive ? '10px' : '12px',
                textDecoration: 'none', transition: 'all 0.14s',
              })}
              onMouseEnter={e => { if (e.currentTarget.getAttribute('aria-current') !== 'page') { e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; e.currentTarget.style.color = '#1A2844' } }}
              onMouseLeave={e => { if (e.currentTarget.getAttribute('aria-current') !== 'page') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7A99' } }}
            >
              <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ICONS.settings /></span>
              Settings
            </NavLink>
          </div>
        )}

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0.75rem 1rem', margin: '0.25rem 0' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #E21B4D, #C9163F)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, fontFamily: 'var(--font-heading)', letterSpacing: '0.04em', boxShadow: '0 2px 8px rgba(226,27,77,0.35)' }}>
              {user.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#141F36', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: 10, color: '#8E98AD', textTransform: 'capitalize', marginTop: 1 }}>{user.role}</div>
            </div>
            <button onClick={logout} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0C8D8', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#E21B4D'}
              onMouseLeave={e => e.currentTarget.style.color = '#C0C8D8'}>
              <ICONS.signout />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
