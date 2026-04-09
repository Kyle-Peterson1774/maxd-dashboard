export default function StatCard({ label, value, sub, trend, color = 'var(--navy)', accent }) {
  const isUp   = trend > 0
  const isDown = trend < 0

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderLeft: accent ? `3px solid ${accent}` : '3px solid transparent',
        paddingLeft: accent ? 'calc(1.25rem - 2px)' : '1.25rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Faint watermark accent */}
      {accent && (
        <div style={{
          position: 'absolute', top: -8, right: -8,
          width: 48, height: 48,
          borderRadius: '50%',
          background: accent,
          opacity: 0.06,
          pointerEvents: 'none',
        }} />
      )}

      <div style={{
        fontSize: 10.5,
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-body)',
      }}>
        {label}
      </div>

      <div style={{
        fontSize: 30,
        fontWeight: 700,
        fontFamily: 'var(--font-heading)',
        color: color,
        letterSpacing: '0.01em',
        lineHeight: 1,
      }}>
        {value}
      </div>

      {(sub || trend !== undefined) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
          {trend !== undefined && (
            <span style={{
              color: isUp ? 'var(--green)' : isDown ? 'var(--red)' : 'var(--text-muted)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}>
              {isUp ? '↑' : isDown ? '↓' : '—'} {Math.abs(trend)}%
            </span>
          )}
          {sub && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{sub}</span>
          )}
        </div>
      )}
    </div>
  )
}
