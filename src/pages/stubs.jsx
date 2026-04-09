// ============================================
// STUB PAGES — each gets built out as its own module
// Replace each one by asking Claude:
// "Build me the [X] module for the MAXD dashboard"
// ============================================

import PageHeader from '../components/ui/PageHeader.jsx'
import StatCard from '../components/ui/StatCard.jsx'

function ComingSoon({ title, subtitle, metrics = [] }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      {metrics.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
          {metrics.map(m => <StatCard key={m.label} {...m} />)}
        </div>
      )}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 40, opacity: 0.2 }}>⚙</div>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, color: 'var(--gray-600)', letterSpacing: '0.06em' }}>
          MODULE IN PROGRESS
        </div>
        <div style={{ fontSize: 13, color: 'var(--gray-400)', maxWidth: 320, lineHeight: 1.7 }}>
          Ask Claude to build out this module with live API connections, charts, and full tracking.
        </div>
        <div style={{ fontSize: 12, background: 'var(--gray-100)', padding: '8px 16px', borderRadius: 'var(--radius)', color: 'var(--gray-600)', fontFamily: 'var(--font-body)', marginTop: 4 }}>
          "Build me the {title} module for the MAXD dashboard"
        </div>
      </div>
    </div>
  )
}

export function Social() {
  return <ComingSoon
    title="Social Growth"
    subtitle="Instagram · TikTok · YouTube · Facebook"
    metrics={[
      { label: 'IG Followers',     value: '—',  sub: 'connect Meta API'   },
      { label: 'TikTok Followers', value: '—',  sub: 'connect TikTok API' },
      { label: 'Total Reach',      value: '—',  sub: 'last 30 days'       },
      { label: 'Avg Engagement',   value: '—',  sub: 'target: 3%+'        },
    ]}
  />
}

export function Content() {
  return <ComingSoon
    title="Content Pipeline"
    subtitle="Script → Film → Edit → Schedule → Post"
    metrics={[
      { label: 'To Film',       value: '—', sub: 'scripts ready'    },
      { label: 'In Edit',       value: '—', sub: 'being edited'     },
      { label: 'Scheduled',     value: '—', sub: 'queued in Later'  },
      { label: 'Posted (30d)',  value: '—', sub: 'last 30 days'     },
    ]}
  />
}

export function Sales() {
  return <ComingSoon
    title="Sales & Revenue"
    subtitle="Shopify orders · AOV · Repeat purchase rate"
    metrics={[
      { label: 'Revenue (MTD)',   value: '—', sub: 'connect Shopify' },
      { label: 'Orders (MTD)',    value: '—', sub: 'connect Shopify' },
      { label: 'Avg Order Value', value: '—', sub: 'connect Shopify' },
      { label: 'Repeat Rate',     value: '—', sub: 'connect Shopify' },
    ]}
  />
}

export function Marketing() {
  return <ComingSoon
    title="Marketing"
    subtitle="Ad spend · Email · ROAS · CAC"
    metrics={[
      { label: 'Ad Spend (MTD)', value: '—', sub: 'connect Meta Ads'   },
      { label: 'ROAS',           value: '—', sub: 'connect Triple Whale'},
      { label: 'Email List',     value: '—', sub: 'connect Klaviyo'    },
      { label: 'Open Rate',      value: '—', sub: 'connect Klaviyo'    },
    ]}
  />
}

export function Finance() {
  return <ComingSoon
    title="Finance"
    subtitle="P&L · COGS · Margins · Cash flow"
    metrics={[
      { label: 'Gross Revenue',  value: '—', sub: 'this month'  },
      { label: 'COGS',           value: '—', sub: 'per unit'    },
      { label: 'Gross Margin',   value: '—', sub: 'target: 60%+'},
      { label: 'Cash on Hand',   value: '—', sub: 'current'     },
    ]}
  />
}

export function Operations() {
  return <ComingSoon
    title="Operations"
    subtitle="Inventory · Manufacturing · Fulfillment"
    metrics={[
      { label: 'Units in Stock',  value: '—', sub: 'current inventory' },
      { label: 'Reorder Point',   value: '—', sub: 'set threshold'     },
      { label: 'In Production',   value: '—', sub: 'batch status'      },
      { label: 'Fulfillment Time', value: '—', sub: 'avg days'         },
    ]}
  />
}

export function Settings() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="API keys · Team access · Integrations" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { name: 'Shopify',         status: 'Connect',  color: '#639922', desc: 'Orders, products, inventory' },
          { name: 'Anthropic (Claude)', status: 'Connect', color: '#378ADD', desc: 'AI content generation' },
          { name: 'Google Analytics', status: 'Connect', color: '#D85A30', desc: 'Website traffic and conversions' },
          { name: 'Klaviyo',         status: 'Connect',  color: '#D4537E', desc: 'Email marketing stats' },
          { name: 'Meta Ads',        status: 'Connect',  color: '#378ADD', desc: 'Instagram and Facebook ad data' },
          { name: 'Make Webhooks',   status: 'Connect',  color: '#7F77DD', desc: 'Automation triggers' },
          { name: 'Google Cloud',    status: 'Connect',  color: '#D85A30', desc: 'Imagen + Veo (AI visuals and video)' },
          { name: 'Firebase Auth',   status: 'Connect',  color: '#BA7517', desc: 'User login and role management' },
        ].map(item => (
          <div key={item.name} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)', marginBottom: 2 }}>{item.name}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{item.desc}</div>
            </div>
            <button style={{
              fontSize: 11, padding: '5px 12px', borderRadius: 6,
              border: `1px solid ${item.color}`, background: 'var(--white)',
              color: item.color, cursor: 'pointer', fontWeight: 500,
            }}>
              {item.status}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Unauthorized() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>⊘</div>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, color: 'var(--navy)', letterSpacing: '0.05em' }}>ACCESS RESTRICTED</div>
      <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>You don't have permission to view this page.</div>
    </div>
  )
}

// Default exports for React Router
export default Social
