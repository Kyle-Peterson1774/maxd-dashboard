export default function StatCard({ label, value, sub, trend, accent }) {
  const isUp   = trend > 0
  const isDown = trend < 0

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        borderTop: accent ? `2px solid ${accent}` : '2px solid transparent',
        padding: '1rem 1.1rem',
      }}
    >
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.09em',
        fontFamily: 'var(--font-body)',
      }}>
        {label}
      </div>

      <div style={{
        fontSize: 28,
        fontWeight: 700,
        fontFamily: 'var(--font-heading)',
        color: 'var(--text-primary)',
        letterSpacing: '0.01em',
        lineHeight: 1,
      }}>
        {value}
      </div>

      {(sub || trend !== undefined) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, marginTop: 2 }}>
          {trend !== undefined && (
            <span style={{
              color: isUp ? 'var(--green-text)' : isDown ? 'var(--red)' : 'var(--text-muted)',
              fontWeight: 600,
              background: isUp ? 'var(--green-bg)' : isDown ? '#FDE8EE' : 'transparent',
              padding: isUp || isDown ? '1px 5px' : 0,
              borderRadius: 4,
              fontSize: 10.5,
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
