export default function PageHeader({ title, subtitle, tag, children }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: '2rem',
      paddingBottom: '1.5rem',
      borderBottom: '1px solid var(--border)',
      gap: 16,
    }}>
      <div>
        {tag && (
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontFamily: 'var(--font-body)',
            marginBottom: 6,
          }}>
            {tag}
          </div>
        )}
        <h1 style={{
          fontSize: 21,
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: 'var(--navy)',
          fontFamily: 'var(--font-heading)',
          textTransform: 'uppercase',
          lineHeight: 1.1,
          marginBottom: subtitle ? 5 : 0,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            color: 'var(--text-muted)',
            fontSize: 12.5,
            fontWeight: 400,
            letterSpacing: '0.01em',
            lineHeight: 1.5,
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {children}
        </div>
      )}
    </div>
  )
}
