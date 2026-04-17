import { NavLink } from 'react-router-dom'
import { useAuth, PERMISSIONS } from '../../lib/auth.jsx'
import { isSupabaseConfigured } from '../../lib/supabase.js'
import { useState, useEffect } from 'react'

/* ── Clean icon set (no emojis) ─────────────────────────────────── */
const ICONS = {
  dashboard:  () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/>
      <rect x="8" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
      <rect x="1" y="8" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
      <rect x="8" y="8" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/>
    </svg>
  ),
  social: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="7.5" cy="7.5" r="2" fill="currentColor"/>
    </svg>
  ),
  scripts: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M3 2.5C3 2.22 3.22 2 3.5 2h8C11.78 2 12 2.22 12 2.5v10c0 .28-.22.5-.5.5h-8A.5.5 0 012.5 12V3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <path d="M5 5.5h5M5 7.5h5M5 9.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  content: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <path d="M1.5 5.5h12" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 1.5v2M10 1.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  launches: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5L9.5 6H13L10 9l1.5 4.5L7.5 11l-4 2.5L5 9 2 6h3.5z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
    </svg>
  ),
  ads: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2 4h11M2 7.5h7M2 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="10.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    </svg>
  ),
  products: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5l5.5 3v6l-5.5 3-5.5-3v-6z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
      <path d="M7.5 1.5v12M2 4.5l5.5 3 5.5-3" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  analytics: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1.5 12.5l3-4 3 2 3-5 3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  sales: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 2v11M4.5 5.5C4.5 4.12 5.84 3 7.5 3s3 1.12 3 2.5c0 2.5-6 2.5-6 5C4.5 11.88 5.84 13 7.5 13s3-1.12 3-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  marketing: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2 9.5V5.5l9-3.5v11L2 9.5z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
      <path d="M2 9.5h2.5v3L2 9.5z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    </svg>
  ),
  finance: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
      <path d="M1.5 6h12" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 9h2M9 9h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  operations: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/>
      <path d="M7.5 1v2M7.5 12v2M1 7.5h2M12 7.5h2M3 3l1.5 1.5M10.5 10.5L12 12M3 12l1.5-1.5M10.5 4.5L12 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  ai: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1L9 5.5H14L10 8.5l1.5 4.5L7.5 10l-4 3L5 8.5 1 5.5h5z" fill="currentColor" opacity="0.85"/>
    </svg>
  ),
  queue: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="2.5" width="12" height="2.5" rx="1.25" fill="currentColor" opacity="0.85"/>
      <rect x="1.5" y="6.25" width="9" height="2.5" rx="1.25" fill="currentColor" opacity="0.6"/>
      <rect x="1.5" y="10" width="6" height="2.5" rx="1.25" fill="currentColor" opacity="0.4"/>
    </svg>
  ),
  settings: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/>
      <path d="M7.5 1.5v1.2M7.5 12.3v1.2M1.5 7.5h1.2M12.3 7.5h1.2M3.4 3.4l.85.85M10.75 10.75l.85.85M3.4 11.6l.85-.85M10.75 4.25l.85-.85" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
}

const NAV_ITEMS = [
  { path: '/dashboard',  label: 'Dashboard',   icon: 'dashboard',   page: 'dashboard'  },
  { path: '/social',     label: 'Social',       icon: 'social',      page: 'social'     },
  { path: '/scripts',    label: 'Scripts',      icon: 'scripts',     page: 'scripts'    },
  { path: '/content',    label: 'Calendar',     icon: 'content',     page: 'content'    },
  { path: '/launches',   label: 'Launches',     icon: 'launches',    page: 'launches'   },
  { path: '/ads',        label: 'Ad Creative',  icon: 'ads',         page: 'ads'        },
  { path: '/products',   label: 'Products',     icon: 'products',    page: 'products'   },
  { path: '/analytics',  label: 'Analytics',    icon: 'analytics',   page: 'analytics'  },
  { path: '/sales',      label: 'Sales',        icon: 'sales',       page: 'sales'      },
  { path: '/marketing',  label: 'Marketing',    icon: 'marketing',   page: 'marketing'  },
  { path: '/finance',    label: 'Finance',      icon: 'finance',     page: 'finance'    },
  { path: '/operations', label: 'Operations',   icon: 'operations',  page: 'operations' },
  { path: '/ai',         label: 'AI Studio',    icon: 'ai',          page: 'ai'         },
  { path: '/queue',      label: 'Action Queue', icon: 'queue',       page: 'queue'      },
]

function NavItem({ item, onClick, badge }) {
  const Icon = ICONS[item.icon]
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      style={({ isActive: active }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        margin: '1px 8px',
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        color: active ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
        background: active ? 'var(--sidebar-active)' : 'transparent',
        borderRadius: 8,
        borderLeft: active ? '2px solid var(--red)' : '2px solid transparent',
        transition: 'all 0.12s ease',
        textDecoration: 'none',
        position: 'relative',
        letterSpacing: '0.01em',
      })}
      onMouseEnter={e => {
        if (!e.currentTarget.classList.contains('active')) {
          e.currentTarget.style.background = 'var(--sidebar-hover)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
        }
      }}
      onMouseLeave={e => {
        if (!e.currentTarget.classList.contains('active')) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
        }
      }}
    >
      <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {Icon && <Icon />}
      </span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.page === 'ai' && (
        <span style={{
          fontSize: 9,
          padding: '1px 5px',
          borderRadius: 3,
          background: 'var(--red)',
          color: '#fff',
          fontWeight: 700,
          letterSpacing: '0.06em',
          lineHeight: '14px',
        }}>
          NEW
        </span>
      )}
      {badge > 0 && (
        <span style={{
          fontSize: 9.5,
          padding: '1px 6px',
          borderRadius: 10,
          background: '#f59e0b',
          color: '#000',
          fontWeight: 700,
          lineHeight: '14px',
          minWidth: 18,
          textAlign: 'center',
        }}>
          {badge}
        </span>
      )}
    </NavLink>
  )
}

/* ── Mountain mark (simplified MAXD logo shape) ──────────────────── */
function MountainMark({ size = 22, color = '#E21B4D' }) {
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 24 18" fill="none">
      <path d="M0 18 L8 2 L12 9 L14 6 L24 18Z" fill={color} opacity="0.9"/>
      <path d="M12 9 L14 6 L24 18 L12 18Z" fill={color} opacity="0.5"/>
    </svg>
  )
}

function usePendingQueueCount() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const check = () => {
      try {
        const items = JSON.parse(localStorage.getItem('maxd_queue') || '[]')
        setCount(items.filter(i => i.status === 'pending').length)
      } catch { setCount(0) }
    }
    check()
    const interval = setInterval(check, 15000)
    return () => clearInterval(interval)
  }, [])
  return count
}

export default function Sidebar({ onNavClick }) {
  const { user, hasAccess, logout } = useAuth()
  const pendingQueue = usePendingQueueCount()

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      background: 'var(--sidebar-bg)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
      borderRight: '1px solid var(--sidebar-border)',
    }}>

      {/* Logo area */}
      <div style={{
        padding: '1.4rem 1.25rem 1.1rem',
        borderBottom: '1px solid var(--sidebar-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <MountainMark size={22} color="var(--red)" />
        <div>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 20,
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '0.10em',
            lineHeight: 1,
          }}>
            MAXD
          </div>
          <div style={{
            fontSize: 9,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginTop: 3,
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
          }}>
            Operations Hub
          </div>
        </div>
      </div>

      {/* Nav group label */}
      <div style={{ padding: '1rem 1.4rem 0.4rem' }}>
        <span style={{
          fontSize: 9.5,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.22)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-body)',
        }}>
          Navigation
        </span>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, paddingBottom: '0.5rem', overflowY: 'auto' }}>
        {NAV_ITEMS.filter(item => hasAccess(item.page)).map(item => (
          <NavItem
            key={item.path}
            item={item}
            onClick={onNavClick}
            badge={item.page === 'queue' ? pendingQueue : 0}
          />
        ))}
      </nav>

      {/* Bottom: Settings + User */}
      <div style={{
        borderTop: '1px solid var(--sidebar-border)',
        paddingTop: '0.5rem',
        paddingBottom: '0.5rem',
      }}>
        {hasAccess('settings') && (
          <NavLink
            to="/settings"
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px', margin: '1px 8px',
              fontSize: 13, fontWeight: isActive ? 500 : 400,
              color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
              background: isActive ? 'var(--sidebar-active)' : 'transparent',
              borderRadius: 8,
              borderLeft: isActive ? '2px solid var(--red)' : '2px solid transparent',
              textDecoration: 'none',
            })}
          >
            <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ICONS.settings />
            </span>
            Settings
          </NavLink>
        )}

        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 1.25rem',
            marginTop: 4,
          }}>
            <div style={{
              width: 30, height: 30,
              borderRadius: '50%',
              background: 'var(--red)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.04em',
            }}>
              {user.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.85)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.name}
              </div>
              <div style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.3)',
                textTransform: 'capitalize',
              }}>
                {user.role}
              </div>
            </div>
          </div>
        )}

        {/* Cloud sync status */}
        <div style={{ padding: '8px 1.25rem 12px', marginTop: 2 }}>
          {isSupabaseConfigured() ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'rgba(255,255,255,0.35)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              Cloud sync active
            </div>
          ) : (
            <NavLink to="/settings" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
              Local only — connect Supabase
            </NavLink>
          )}
        </div>
      </div>
    </aside>
  )
}
