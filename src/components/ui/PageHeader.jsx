/**
 * PageHeader
 * Props:
 *   title    — page name (displayed uppercase in Oswald)
 *   subtitle — optional description line
 *   tag      — small colored section label (e.g. "Content · Social")
 *   accent   — CSS color for left accent bar (defaults to var(--blue))
 *   children — action buttons / controls on the right
 */
export default function PageHeader({ title, subtitle, tag, accent, children }) {
  const bar = accent || 'var(--blue)'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: '1.75rem',
      gap: 16,
      animation: 'fadeUp 0.3s ease both',
    }}>
      {/* Left accent bar */}
      <div style={{
        width: 4,
        borderRadius: 4,
        background: bar,
        alignSelf: 'stretch',
        minHeight: 40,
        flexShrink: 0,
        opacity: 0.85,
      }} />

      {/* Title block */}
      <div style={{ flex: 1 }}>
        {tag && (
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: bar === 'var(--blue)' ? 'var(--blue-text)' : 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            fontFamily: 'var(--font-body)',
            marginBottom: 5,
          }}>
            {tag}
          </div>
        )}
        <h1 style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '0.05em',
          color: 'var(--navy)',
          fontFamily: 'var(--font-heading)',
          textTransform: 'uppercase',
          lineHeight: 1.05,
          marginBottom: subtitle ? 6 : 0,
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

      {/* Actions */}
      {children && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {children}
        </div>
      )}
    </div>
  )
}
