import { useState, useEffect } from 'react'
import Sidebar from './Sidebar.jsx'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [isMobile])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile hamburger */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            position: 'fixed', top: 12, left: 12, zIndex: 300,
            background: 'var(--navy)', border: 'none', borderRadius: 8,
            width: 40, height: 40, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 4, padding: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
          aria-label="Toggle menu"
        >
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 18, height: 2, background: '#fff', borderRadius: 2,
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: isMobile ? 'fixed' : 'fixed',
        left: isMobile ? (sidebarOpen ? 0 : '-100%') : 0,
        top: 0, bottom: 0, zIndex: 250,
        transition: isMobile ? 'left 0.25s ease' : 'none',
      }}>
        <Sidebar onNavClick={() => isMobile && setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main style={{
        marginLeft: isMobile ? 0 : 'var(--sidebar-w)',
        flex: 1,
        minHeight: '100vh',
        background: 'var(--surface)',
        padding: isMobile ? '3.5rem 1rem 1.5rem' : '2rem 2.25rem',
        overflowY: 'auto',
        transition: 'margin-left 0.25s ease',
      }}>
        {children}
      </main>
    </div>
  )
}
