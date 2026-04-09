export default function PageHeader({ title, subtitle, action, actions, children }) {
  const rightContent = actions || action
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: '1.75rem',
      paddingBottom: '1.25rem',
      borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '0.05em',
          marginBottom: 3,
          color: 'var(--navy)',
          fontFamily: 'var(--font-heading)',
          textTransform: 'uppercase',
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            color: 'var(--text-muted)',
            fontSize: 12.5,
            fontWeight: 400,
            letterSpacing: '0.01em',
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {(rightContent || children) && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {rightContent}
          {children}
        </div>
      )}
    </div>
  )
}
