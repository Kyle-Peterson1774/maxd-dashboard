/**
 * StatCard
 * Props:
 *   label  — metric name
 *   value  — primary big number / string
 *   sub    — small descriptor (e.g. "last 30 days")
 *   trend  — number, positive = up, negative = down, 0/undefined = neutral
 *   accent — CSS color for top border + icon bg tint
 *   icon   — emoji or short string shown in tinted circle top-right
 */
export default function StatCard({ label, value, sub, trend, accent, icon }) {
  const isUp   = trend > 0
  const isDown = trend < 0
  const accentColor = accent || 'var(--blue)'

  // Derive a translucent bg from the accent for the icon badge
  const iconBg = accent
    ? accent.startsWith('#')
      ? accent + '18'
      : accent.replace('var(--blue)', 'rgba(79,110,247,0.12)')
              .replace('var(--green)', 'rgba(12,166,120,0.12)')
              .replace('var(--purple)', 'rgba(124,58,237,0.12)')
              .replace('var(--amber)', 'rgba(217,119,6,0.12)')
              .replace('var(--red)', 'rgba(226,27,77,0.10)')
    : 'rgba(79,110,247,0.10)'

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderTop: `3px solid ${accentColor}`,
        padding: '1.1rem 1.2rem 1rem',
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeUp 0.3s ease both',
      }}
    >
      {/* Subtle corner glow */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 80, height: 80,
        background: `radial-gradient(circle at top right, ${accentColor.replace('var(--blue)', 'rgba(79,110,247,0.08)').replace('var(--green)', 'rgba(12,166,120,0.08)').replace('var(--purple)', 'rgba(124,58,237,0.08)').replace('var(--amber)', 'rgba(217,119,6,0.07)').replace('var(--red)', 'rgba(226,27,77,0.07)')}, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Top row: label + icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.10em',
          fontFamily: 'var(--font-body)',
        }}>
          {label}
        </div>
        {icon && (
          <div style={{
            width: 28, height: 28,
            borderRadius: 8,
            background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* Big number */}
      <div style={{
        fontSize: 30,
        fontWeight: 700,
        fontFamily: 'var(--font-heading)',
        color: 'var(--text-primary)',
        letterSpacing: '0.01em',
        lineHeight: 1,
      }}>
        {value}
      </div>

      {/* Trend + sub */}
      {(sub || trend !== undefined) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginTop: 1 }}>
          {trend !== undefined && (
            <span style={{
              color: isUp ? 'var(--green-text)' : isDown ? '#C9163F' : 'var(--text-muted)',
              fontWeight: 600,
              background: isUp ? 'var(--green-bg)' : isDown ? 'rgba(226,27,77,0.08)' : 'transparent',
              padding: isUp || isDown ? '2px 6px' : 0,
              borderRadius: 5,
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
