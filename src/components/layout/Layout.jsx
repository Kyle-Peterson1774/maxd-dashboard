import { useState, useEffect } from 'react'
import Sidebar from './Sidebar.jsx'

const BG_STYLE = {
  minHeight: '100vh',
  background: `
    radial-gradient(ellipse 80% 60% at 0% 0%,   rgba(79,110,247,0.08) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 100% 0%,  rgba(124,58,237,0.07) 0%, transparent 55%),
    radial-gradient(ellipse 70% 60% at 100% 100%,rgba(12,166,120,0.06) 0%, transparent 55%),
    radial-gradient(ellipse 80% 50% at 0% 100%,  rgba(79,110,247,0.05) 0%, transparent 60%),
    #F0F4FF
  `,
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [isMobile])

  return (
    <div style={{ display: 'flex', ...BG_STYLE }}>
      {/* Mobile hamburger */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            position: 'fixed', top: 12, left: 12, zIndex: 300,
            background: 'rgba(255,255,255,0.90)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 10,
            width: 40, height: 40, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 4, padding: 0,
            boxShadow: '0 2px 12px rgba(15,25,80,0.12)',
          }}
          aria-label="Toggle menu"
        >
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 18, height: 2,
              background: sidebarOpen ? 'var(--red)' : 'var(--navy)',
              borderRadius: 2,
              transition: 'all 0.2s',
              transform: sidebarOpen
                ? i === 0 ? 'rotate(45deg) translate(4px, 4px)' : i === 2 ? 'rotate(-45deg) translate(4px, -4px)' : 'scaleX(0)'
                : 'none',
              opacity: sidebarOpen && i === 1 ? 0 : 1,
            }} />
          ))}
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(20,31,54,0.35)',
            backdropFilter: 'blur(2px)',
            zIndex: 200,
          }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: 'fixed',
        left: isMobile ? (sidebarOpen ? 0 : '-100%') : 0,
        top: 0, bottom: 0, zIndex: 250,
        transition: 'left 0.25s ease',
      }}>
        <Sidebar onNavClick={() => isMobile && setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main style={{
        marginLeft: isMobile ? 0 : 'var(--sidebar-w)',
        flex: 1,
        minHeight: '100vh',
        padding: isMobile ? '3.5rem 1rem 2rem' : '2rem 2.25rem 2.5rem',
        overflowY: 'auto',
        transition: 'margin-left 0.25s ease',
      }}>
        {children}
      </main>
    </div>
  )
}
