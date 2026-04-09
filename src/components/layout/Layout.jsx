import Sidebar from './Sidebar.jsx'

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        marginLeft: 'var(--sidebar-w)',
        flex: 1,
        minHeight: '100vh',
        background: 'var(--surface)',
        padding: '2rem 2.25rem',
        overflowY: 'auto',
      }}>
        {children}
      </main>
    </div>
  )
}
