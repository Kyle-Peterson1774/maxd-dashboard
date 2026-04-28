import { useState, useCallback, useEffect } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { initials, memberColor } from '../lib/team.js'
import { ROLE_LABELS, PERMISSIONS, useAuth } from '../lib/auth.jsx'
import { getOrgMembers, upsertOrgMember, deleteOrgMember } from '../lib/supabase.js'
import { dbGet, dbSet } from '../lib/db.js'
import {
  INTEGRATIONS,
  INTEGRATION_CATEGORIES,
  getCredentials,
  saveCredentials,
  clearCredentials,
  isConnected,
  getConnectedCount,
  verifyConnection,
} from '../lib/credentials.js'
// ── Helpers ─────────────────────────────────────────────────────────────────
function StatusBadge({ connected }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      padding: '3px 8px', borderRadius: 20,
      background: connected ? '#d1fae5' : 'var(--gray-100)',
      color:      connected ? '#065f46' : 'var(--gray-500)',
    }}>
      {connected ? '● CONNECTED' : '○ NOT CONNECTED'}
    </span>
  )
}

// ── Error popup ──────────────────────────────────────────────────────────────
function ErrorPopup({ integration, errorMsg, onRetry, onSaveAnyway, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden', animation: 'fadeIn 0.15s ease',
      }}>
        {/* Red header */}
        <div style={{ background: '#dc2626', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            ⚠
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: 14, letterSpacing: '0.05em' }}>
              CONNECTION FAILED
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              {integration.label} could not be verified
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          <div style={{
            background: '#fef2f2', borderRadius: 'var(--radius)',
            border: '1px solid #fecaca', padding: '12px 14px',
            fontSize: 13, color: '#7f1d1d', lineHeight: 1.7, marginBottom: '1.25rem',
          }}>
            {errorMsg}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '0.5rem' }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Common fixes:</strong>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: '1.2rem' }}>
              <li>Double-check the key was copied in full (no trailing spaces)</li>
              <li>Make sure the key has the required permissions</li>
              <li>Confirm the key hasn't been revoked or expired</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid var(--border)',
          background: 'var(--surface-3)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
        }}>
          <button onClick={onSaveAnyway} style={{
            fontSize: 12, padding: '7px 14px', borderRadius: 6,
            border: '1px solid var(--border-mid)', background: 'var(--surface-2)',
            color: 'var(--text-secondary)', cursor: 'pointer',
          }}>
            Save Anyway
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{
              fontSize: 12, padding: '7px 14px', borderRadius: 6,
              border: '1px solid var(--border-mid)', background: 'var(--surface-2)',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button onClick={onRetry} style={{
              fontSize: 12, padding: '7px 18px', borderRadius: 6, border: 'none',
              background: '#dc2626', color: '#fff', cursor: 'pointer',
              fontWeight: 700, letterSpacing: '0.04em',
            }}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Connect / Edit modal ─────────────────────────────────────────────────────
function ConnectModal({ serviceKey, integration, onClose, onSave }) {
  const existing = getCredentials(serviceKey) || {}
  const [values, setValues] = useState(
    Object.fromEntries(integration.fields.map(f => [f.key, existing[f.key] ?? '']))
  )
  const [showValues, setShowValues] = useState({})
  const [saving, setSaving]         = useState(false)
  const [errorPopup, setErrorPopup] = useState(null) // { message }
  const [warning, setWarning]       = useState(null)

  const connected = isConnected(serviceKey)
  const canSave   = integration.fields.some(f => values[f.key]?.trim())

  const commitSave = useCallback(() => {
    saveCredentials(serviceKey, values)
    onSave()
    onClose()
  }, [serviceKey, values, onSave, onClose])

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setWarning(null)
    const result = await verifyConnection(serviceKey, values)
    setSaving(false)
    if (!result.ok) {
      setErrorPopup({ message: result.error || 'Verification failed. Check your credentials and try again.' })
      return
    }
    if (result.warning) setWarning(result.warning)
    commitSave()
  }

  const handleDisconnect = () => {
    clearCredentials(serviceKey)
    onSave()
    onClose()
  }

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }} onClick={e => e.target === e.currentTarget && !saving && onClose()}>
        <div style={{
          background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)',
          width: '100%', maxWidth: 500,
          boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ background: 'var(--navy)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${integration.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {integration.icon}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', color: 'var(--white)', fontSize: 14, letterSpacing: '0.05em' }}>
                  {integration.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{integration.desc}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>

          {/* Body */}
          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
            {/* Where to find */}
            <div style={{
              background: 'var(--surface-3)', borderRadius: 'var(--radius)',
              padding: '10px 14px', marginBottom: '1.25rem',
              fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7,
              borderLeft: `3px solid ${integration.color}`,
            }}>
              <strong>Where to find this:</strong>{' '}
              {integration.helpText}
              {' '}<a href={integration.helpUrl} target="_blank" rel="noreferrer" style={{ color: integration.color, fontWeight: 600 }}>View guide →</a>
            </div>

            {/* Note */}
            {integration.note && (
              <div style={{ background: '#fffbeb', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: '1.25rem', fontSize: 12, color: '#92400e', lineHeight: 1.6, borderLeft: '3px solid #fde68a' }}>
                ℹ {integration.note}
              </div>
            )}

            {/* Warning (e.g. CORS note) */}
            {warning && (
              <div style={{ background: '#f0fdf4', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: '1rem', fontSize: 12, color: '#065f46', borderLeft: '3px solid #059669' }}>
                ✓ {warning}
              </div>
            )}

            {/* Fields */}
            {integration.fields.map(field => (
              <div key={field.key} style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 5, letterSpacing: '0.03em' }}>
                  {field.label}
                </label>
                {field.helpNote && (
                  <div style={{ fontSize: 11, color: '#2563EB', background: '#EFF6FF', padding: '6px 10px', borderRadius: 6, marginBottom: 6, lineHeight: 1.5, fontFamily: 'monospace' }}>
                    {field.helpNote}
                  </div>
                )}
                <div style={{ position: 'relative' }}>
                  <input
                    type={field.type === 'password' && !showValues[field.key] ? 'password' : 'text'}
                    value={values[field.key]}
                    onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    autoComplete="new-password"
                    style={{
                      width: '100%', padding: '9px 36px 9px 12px',
                      border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)',
                      fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-2)',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = integration.color}
                    onBlur={e => e.target.style.borderColor = 'var(--border-mid)'}
                  />
                  {field.type === 'password' && values[field.key] && (
                    <button onClick={() => setShowValues(s => ({ ...s, [field.key]: !s[field.key] }))} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}>
                      {showValues[field.key] ? '🙈' : '👁'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.6 }}>
              🔒 Credentials stored locally in your browser only — never sent to any third-party server.
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--surface-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              {connected && (
                <button onClick={handleDisconnect} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px solid #fca5a5', background: 'var(--surface-2)', color: '#dc2626', cursor: 'pointer', fontWeight: 500 }}>
                  Disconnect
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {saving && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Verifying…</span>}
              <button onClick={onClose} disabled={saving} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border-mid)', background: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.5 : 1 }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={!canSave || saving} style={{
                fontSize: 12, padding: '7px 18px', borderRadius: 6,
                border: 'none', background: canSave && !saving ? integration.color : 'var(--border)',
                color: 'var(--white)', cursor: canSave && !saving ? 'pointer' : 'default',
                fontWeight: 700, letterSpacing: '0.03em', minWidth: 100, transition: 'all 0.15s',
              }}>
                {saving ? '⟳ Verifying…' : connected ? 'Update' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error popup */}
      {errorPopup && (
        <ErrorPopup
          integration={integration}
          errorMsg={errorPopup.message}
          onRetry={() => setErrorPopup(null)}
          onSaveAnyway={() => { setErrorPopup(null); commitSave() }}
          onClose={() => setErrorPopup(null)}
        />
      )}
    </>
  )
}

// ── Integration card ────────────────────────────────────────────────────────
function IntegrationCard({ serviceKey, integration, onOpen }) {
  const connected = isConnected(serviceKey)

  return (
    <div className="card" style={{
      display: 'flex', alignItems: 'center', gap: 14,
      borderLeft: connected ? `3px solid ${integration.color}` : '3px solid var(--gray-100)',
      transition: 'border-color 0.2s', padding: '14px 16px',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: connected ? `${integration.color}18` : 'var(--gray-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, transition: 'background 0.2s',
      }}>
        {integration.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{integration.label}</span>
          <StatusBadge connected={connected} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{integration.desc}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {integration.quickLink && connected && (
          <a
            href={`https://${(getCredentials(serviceKey)?.storeUrl || '').replace(/^https?:\/\//, '')}`}
            target="_blank" rel="noreferrer"
            style={{
              fontSize: 11, padding: '6px 14px', borderRadius: 6,
              border: `1.5px solid ${integration.color}`,
              background: integration.color,
              color: 'var(--white)', fontWeight: 600,
              textDecoration: 'none', letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            Open ↗
          </a>
        )}
        <button
          onClick={() => onOpen(serviceKey)}
          style={{
            fontSize: 11, padding: '6px 14px', borderRadius: 6,
            border: `1.5px solid ${connected ? 'var(--gray-300)' : integration.color}`,
            background: connected ? 'var(--white)' : integration.color,
            color: connected ? 'var(--gray-600)' : 'var(--white)',
            cursor: 'pointer', fontWeight: 600, letterSpacing: '0.04em',
            transition: 'all 0.15s',
          }}
        >
          {connected ? 'Edit' : 'Connect'}
        </button>
      </div>
    </div>
  )
}

// ── Section: Integrations ────────────────────────────────────────────────────
function IntegrationsSection({ onModal }) {
  const [, forceRender] = useState(0)
  const refresh = () => forceRender(n => n + 1)

  // Track which categories are manually toggled open/closed
  // Default: open if anything is connected, closed otherwise
  const [overrides, setOverrides] = useState({})
  const toggle = (catKey) => setOverrides(o => ({ ...o, [catKey]: !isOpen(catKey) }))

  const connectedCount = getConnectedCount()
  const total = Object.keys(INTEGRATIONS).length
  const pct = Math.round((connectedCount / total) * 100)

  const grouped = {}
  Object.entries(INTEGRATIONS).forEach(([key, integration]) => {
    const cat = integration.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push([key, integration])
  })

  function isOpen(catKey) {
    if (catKey in overrides) return overrides[catKey]
    // Default: open if something is connected in this category
    const items = grouped[catKey] || []
    return items.some(([k]) => isConnected(k))
  }

  return (
    <div>
      {/* Progress bar */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.06em' }}>
            <span>INTEGRATION SETUP</span>
            <span>{connectedCount} / {total} connected · {pct}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--red), #E87040)', width: `${pct}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)', lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginTop: 2 }}>COMPLETE</div>
        </div>
      </div>

      {/* Collapsible category sections */}
      {Object.entries(INTEGRATION_CATEGORIES).map(([catKey, catMeta]) => {
        const items = grouped[catKey]
        if (!items?.length) return null
        const catConnected = items.filter(([k]) => isConnected(k)).length
        const open = isOpen(catKey)

        return (
          <div key={catKey} style={{ marginBottom: 10, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--surface-2)' }}>
            {/* Category header — always visible, click to toggle */}
            <button onClick={() => toggle(catKey)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: open ? '1px solid var(--border)' : 'none',
              transition: 'background 0.12s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{catMeta.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                    {catMeta.label}
                  </div>
                  <div style={{ fontSize: 11, color: catConnected > 0 ? '#059669' : 'var(--text-muted)', marginTop: 1 }}>
                    {catConnected > 0
                      ? `${catConnected} of ${items.length} connected`
                      : `${items.length} platforms available — nothing connected yet`}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {catConnected > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: '#d1fae5', color: '#065f46' }}>
                    {catConnected} CONNECTED
                  </span>
                )}
                <span style={{ fontSize: 16, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>⌄</span>
              </div>
            </button>

            {/* Expanded content */}
            {open && (
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Empty state */}
                {catConnected === 0 && (
                  <div style={{
                    padding: '14px 16px', borderRadius: 'var(--radius)',
                    background: 'var(--surface-3)', border: '1px dashed var(--border-mid)',
                    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4,
                  }}>
                    <span style={{ fontSize: 22 }}>🔌</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>
                        No {catMeta.label} integrations connected yet
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Connect one of the platforms below to start syncing data.
                      </div>
                    </div>
                  </div>
                )}

                {items.map(([key, integration]) => (
                  <IntegrationCard
                    key={key}
                    serviceKey={key}
                    integration={integration}
                    onOpen={(k) => { onModal(k); setTimeout(refresh, 500) }}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Note */}
      <div style={{ marginTop: '0.75rem', padding: '1rem 1.25rem', background: '#fffbeb', borderRadius: 'var(--radius)', border: '1px solid #fde68a', fontSize: 12, color: '#92400e', lineHeight: 1.7 }}>
        <strong>⚠ Browser API note:</strong> Some integrations (Shopify, WooCommerce, Meta Ads, etc.) have CORS restrictions that prevent direct browser calls. Connections are saved and used within the dashboard. For live data sync, deploying to a server with a proxy removes these limits. Make/Zapier webhooks work from any browser.
      </div>
    </div>
  )
}

// ── Section: Access Control ───────────────────────────────────────────────────

// All pages with display labels and grouping
const ALL_PAGES = [
  { key: 'dashboard',  label: 'Dashboard',    group: 'Core' },
  { key: 'sales',      label: 'Sales',         group: 'Business' },
  { key: 'finance',    label: 'Finance',        group: 'Business' },
  { key: 'operations', label: 'Operations',     group: 'Business' },
  { key: 'marketing',  label: 'Marketing',      group: 'Marketing' },
  { key: 'ads',        label: 'Ads',            group: 'Marketing' },
  { key: 'analytics',  label: 'Analytics',      group: 'Marketing' },
  { key: 'social',     label: 'Social',         group: 'Content' },
  { key: 'content',    label: 'Content',        group: 'Content' },
  { key: 'scripts',    label: 'Scripts',        group: 'Content' },
  { key: 'launches',   label: 'Launches',       group: 'Content' },
  { key: 'products',   label: 'Products',       group: 'Content' },
  { key: 'ai',         label: 'AI Studio',      group: 'Tools' },
  { key: 'queue',      label: 'Action Queue',   group: 'Tools' },
  { key: 'settings',   label: 'Settings',       group: 'Admin' },
]
const PAGE_GROUPS = ['Core', 'Business', 'Marketing', 'Content', 'Tools', 'Admin']

// ── Role template defaults (overridden by whatever admin saves to DB) ─────────
const ROLES_KEY = 'maxd_role_templates'
const DEFAULT_ROLE_TEMPLATES = [
  { id: 'sales',     name: 'Sales',           color: '#22c55e', pages: ['dashboard','sales','analytics','marketing'] },
  { id: 'marketing', name: 'Marketing',        color: '#8b5cf6', pages: ['dashboard','social','marketing','ads','analytics'] },
  { id: 'content',   name: 'Content Creator',  color: '#3b82f6', pages: ['dashboard','social','scripts','content','ai','queue'] },
  { id: 'ops',       name: 'Operations',       color: '#f59e0b', pages: ['dashboard','operations','launches','products'] },
  { id: 'finance',   name: 'Finance',          color: '#06b6d4', pages: ['dashboard','finance','analytics','sales'] },
]

const AVATAR_COLORS = ['#E21B4D','#3b82f6','#8b5cf6','#22c55e','#f59e0b','#06b6d4','#ec4899']
function avatarColor(str = '') {
  const i = Math.abs([...str].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[i]
}

// ── Role modal (create / edit a role template) ────────────────────────────────
function RoleModal({ role, onClose, onSave }) {
  const isNew = !role
  const [name, setName]   = useState(role?.name || '')
  const [color, setColor] = useState(role?.color || AVATAR_COLORS[0])
  const [pages, setPages] = useState(role?.pages || [])

  const toggle = (key) => setPages(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])
  const inp = { display: 'block', width: '100%', padding: '0.45rem 0.65rem', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', marginTop: 4 }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#ffffff', border: '1px solid var(--gray-100)', borderRadius: 14, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{isNew ? 'Create Role' : `Edit Role — ${role.name}`}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '1.25rem 1.5rem', maxHeight: '65vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Role Name
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sales Manager, Content Creator" style={inp} />
            </label>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Color
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {AVATAR_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                ))}
              </div>
            </label>
          </div>

          <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
            Default Dashboard Access
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>— pages auto-assigned when someone is given this role</span>
          </div>
          {PAGE_GROUPS.map(group => (
            <div key={group} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{group}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ALL_PAGES.filter(p => p.group === group).map(p => {
                  const active = pages.includes(p.key)
                  return (
                    <button key={p.key} onClick={() => toggle(p.key)} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${active ? color : 'var(--border)'}`, background: active ? color : 'var(--surface-2)', color: active ? '#fff' : 'var(--text-muted)', fontWeight: active ? 600 : 400, transition: 'all 0.1s' }}>
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '0.45rem 1rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => name.trim() && onSave({ id: role?.id || Date.now().toString(), name: name.trim(), color, pages })} style={{ padding: '0.45rem 1.25rem', background: 'var(--navy)', border: 'none', borderRadius: 6, fontSize: 13, color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: name.trim() ? 1 : 0.5 }}>
            {isNew ? 'Create Role' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Member modal (invite / edit a team member) ────────────────────────────────
function MemberAccessModal({ member, onClose, onSave, currentUser, roleTemplates, isAdmin }) {
  const isNew    = !member?.email
  const isYou    = member?.email === currentUser.email
  // Managers can only grant pages within their own access
  const allowedPages = isAdmin ? ALL_PAGES.map(p => p.key) : (currentUser.pages || [])

  const [email, setEmail]       = useState(member?.email || '')
  const [name, setName]         = useState(member?.name || '')
  const [role, setRole]         = useState(member?.role || (roleTemplates[0]?.name || 'member'))
  const [pages, setPages]       = useState(member?.pages || roleTemplates[0]?.pages || [])
  const [canManage, setCanMgr]  = useState(member?.can_manage || false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const handleRoleChange = (roleName) => {
    setRole(roleName)
    const tmpl = roleTemplates.find(r => r.name === roleName)
    if (tmpl) {
      // Apply template pages, but filter to only allowed pages if manager
      setPages(tmpl.pages.filter(p => allowedPages.includes(p)))
    }
  }

  const toggle = (key) => {
    if (!allowedPages.includes(key)) return  // managers can't grant what they don't have
    setPages(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])
  }

  const handleSave = async () => {
    if (!email.includes('@')) { setError('Enter a valid email address'); return }
    setSaving(true)
    await onSave({ email: email.trim().toLowerCase(), name: name.trim(), role, pages, can_manage: canManage, status: isNew ? 'invited' : (member?.status || 'active') })
    setSaving(false)
  }

  const inp = { display: 'block', width: '100%', padding: '0.45rem 0.65rem', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', marginTop: 4 }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#ffffff', border: '1px solid var(--gray-100)', borderRadius: 14, width: '100%', maxWidth: 540, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            {isNew ? 'Invite Team Member' : `Edit — ${member.name || member.email}`}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Email + Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Email
              {isNew
                ? <input value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="teammate@company.com" autoComplete="off" style={inp} />
                : <div style={{ ...inp, background: 'var(--surface-2)', color: 'var(--text-muted)', cursor: 'default' }}>{email}</div>
              }
            </label>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Name
              <input value={name} onChange={e => setName(e.target.value)} placeholder="First Last" autoComplete="off" disabled={isYou} style={{ ...inp, opacity: isYou ? 0.5 : 1 }} />
            </label>
          </div>

          {/* Role selector */}
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '1rem' }}>
            Role
            <select value={role} onChange={e => handleRoleChange(e.target.value)} disabled={isYou} style={{ ...inp, opacity: isYou ? 0.5 : 1 }}>
              {roleTemplates.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              {isAdmin && <option value="admin">Admin — full access</option>}
            </select>
            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>Choosing a role auto-fills default dashboards. You can customize below.</div>
          </label>

          {/* Manager toggle — admin only */}
          {isAdmin && !isYou && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Manager Access</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Can invite teammates and grant them access — but only within their own pages</div>
              </div>
              <button onClick={() => setCanMgr(m => !m)} style={{ width: 40, height: 22, borderRadius: 11, background: canManage ? 'var(--navy)' : 'var(--surface-3)', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: canManage ? 19 : 2, width: 16, height: 16, borderRadius: '50%', background: canManage ? '#fff' : 'var(--text-muted)', transition: 'left 0.15s' }} />
              </button>
            </div>
          )}

          {/* Page access picker */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Dashboard Access</span>
              {!isYou && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setPages(allowedPages)} style={{ fontSize: 11, padding: '2px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer' }}>All</button>
                  <button onClick={() => setPages([])} style={{ fontSize: 11, padding: '2px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer' }}>None</button>
                </div>
              )}
            </div>
            {!isAdmin && (
              <div style={{ marginBottom: 8, padding: '0.4rem 0.65rem', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 6, fontSize: 11, color: 'rgba(253,224,71,0.85)' }}>
                You can only grant dashboards within your own access.
              </div>
            )}
            {PAGE_GROUPS.map(group => {
              const groupPages = ALL_PAGES.filter(p => p.group === group)
              return (
                <div key={group} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{group}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {groupPages.map(p => {
                      const allowed  = isYou || allowedPages.includes(p.key)
                      const active   = isYou || pages.includes(p.key)
                      return (
                        <button key={p.key} onClick={() => !isYou && toggle(p.key)} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: isYou || !allowed ? 'default' : 'pointer', border: `1px solid ${active ? 'var(--navy)' : 'var(--border)'}`, background: active ? 'var(--navy)' : 'var(--surface-2)', color: active ? '#fff' : allowed ? 'var(--text-muted)' : 'var(--border)', fontWeight: active ? 600 : 400, opacity: allowed ? 1 : 0.35, transition: 'all 0.1s' }}>
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {error && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)' }}>{error}</div>}
          {isNew && (
            <div style={{ marginTop: 8, padding: '0.5rem 0.75rem', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, fontSize: 11, color: 'rgba(147,197,253,0.9)', lineHeight: 1.5 }}>
              Share the dashboard URL. They sign up with this exact email and access activates automatically.
            </div>
          )}
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '0.45rem 1rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
          {!isYou && (
            <button onClick={handleSave} disabled={saving} style={{ padding: '0.45rem 1.25rem', background: 'var(--navy)', border: 'none', borderRadius: 6, fontSize: 13, color: '#fff', cursor: saving ? 'wait' : 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : isNew ? 'Send Invite' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main AccessControl section ────────────────────────────────────────────────
function AccessControl() {
  const { user, isAdmin, canManage } = useAuth()
  const [tab, setTab]                 = useState('team')       // 'roles' | 'team'
  const [roleTemplates, setTemplates] = useState(DEFAULT_ROLE_TEMPLATES)
  const [members, setMembers]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [editMember, setEditMember]   = useState(null)
  const [editRole, setEditRole]       = useState(null)         // null=closed, false=new, obj=editing
  const [error, setError]             = useState('')

  const hasOrg = !!user?.orgId

  useEffect(() => {
    if (!hasOrg) { setLoading(false); return }
    // Load role templates from org data
    dbGet(ROLES_KEY).then(saved => { if (saved?.length) setTemplates(saved) })
    // Load members
    getOrgMembers(user.orgId, user.accessToken).then(data => { setMembers(data); setLoading(false) })
  }, [user?.orgId])

  const saveTemplates = (updated) => {
    setTemplates(updated)
    dbSet(ROLES_KEY, updated)
  }

  const handleSaveRole = (roleData) => {
    const existing = roleTemplates.find(r => r.id === roleData.id)
    saveTemplates(existing ? roleTemplates.map(r => r.id === roleData.id ? roleData : r) : [...roleTemplates, roleData])
    setEditRole(null)
  }

  const handleDeleteRole = (id) => {
    saveTemplates(roleTemplates.filter(r => r.id !== id))
  }

  const handleSaveMember = async (memberData) => {
    if (!hasOrg) return
    const result = await upsertOrgMember(user.orgId, memberData, user.accessToken)
    if (result.error) { setError(result.error); return }
    const updated = await getOrgMembers(user.orgId, user.accessToken)
    setMembers(updated)
    setEditMember(null)
    setError('')
  }

  const handleRemoveMember = async (email) => {
    if (!hasOrg) return
    await deleteOrgMember(user.orgId, email, user.accessToken)
    setMembers(m => m.filter(u => u.email !== email))
  }

  if (!hasOrg) {
    return (
      <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
        Connect Supabase (Cloud Sync section below) to enable team access control.
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Header + tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Access Control</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Define roles with default dashboards, then invite team members and customize their access.</div>
        </div>
        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[['team','Team'],['roles','Roles']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ padding: '0.35rem 0.9rem', fontSize: 13, fontWeight: tab === key ? 700 : 400, background: tab === key ? 'var(--navy)' : 'transparent', color: tab === key ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--red)' }}>{error}</div>}

      {/* ── Roles tab ── */}
      {tab === 'roles' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            {isAdmin && (
              <button onClick={() => setEditRole(false)} style={{ padding: '0.4rem 0.9rem', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                + Create Role
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {roleTemplates.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', background: 'var(--surface-2)', border: `1px solid var(--border)`, borderLeft: `4px solid ${r.color}`, borderRadius: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</div>
                  <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {ALL_PAGES.filter(p => r.pages.includes(p.key)).map(p => (
                      <span key={p.key} style={{ fontSize: 10, padding: '1px 6px', background: r.color + '22', color: r.color, borderRadius: 10, fontWeight: 600 }}>{p.label}</span>
                    ))}
                    {r.pages.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No dashboards assigned</span>}
                  </div>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setEditRole(r)} style={{ fontSize: 11, padding: '3px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDeleteRole(r.id)} style={{ fontSize: 11, padding: '3px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--red)', cursor: 'pointer' }}>Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: '0.6rem 0.9rem', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Roles define default dashboard access. When you invite someone and assign them a role, their dashboards are auto-filled — you can still customize per person.
          </div>
        </div>
      )}

      {/* ── Team tab ── */}
      {tab === 'team' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            {canManage && (
              <button onClick={() => setEditMember({})} style={{ padding: '0.4rem 0.9rem', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                + Invite
              </button>
            )}
          </div>

          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 80px 80px 70px', padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Member</span><span>Role</span><span>Access</span><span>Status</span><span></span>
            </div>

            {loading && <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Loading…</div>}

            {!loading && members.map(m => {
              const isYou    = m.email === user.email
              const tmpl     = roleTemplates.find(r => r.name === m.role)
              const roleColor = tmpl?.color || avatarColor(m.role)
              const pageCount = m.pages?.length || 0
              const canEdit   = isAdmin || (canManage && !m.can_manage && m.role !== 'admin')

              return (
                <div key={m.email} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 80px 80px 70px', padding: '0.65rem 1rem', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarColor(m.email), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {(m.name || m.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {m.name || m.email}
                        {isYou && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(you)</span>}
                        {m.can_manage && m.role !== 'admin' && <span style={{ fontSize: 9, fontWeight: 700, background: '#f59e0b22', color: '#f59e0b', padding: '1px 5px', borderRadius: 4 }}>MGR</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.name ? m.email : ''}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: roleColor, background: roleColor + '18', padding: '2px 8px', borderRadius: 20, display: 'inline-block' }}>
                    {m.role}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pageCount} page{pageCount !== 1 ? 's' : ''}</span>
                  <span style={{ fontSize: 12, color: m.status === 'active' ? '#22c55e' : 'var(--text-muted)' }}>
                    {m.status === 'active' ? 'Active' : 'Invited'}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    {canEdit && (
                      <button onClick={() => setEditMember(m)} style={{ fontSize: 11, padding: '3px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)', cursor: 'pointer' }}>Edit</button>
                    )}
                    {!isYou && isAdmin && (
                      <button onClick={() => handleRemoveMember(m.email)} style={{ fontSize: 11, padding: '3px 6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--red)', cursor: 'pointer' }}>×</button>
                    )}
                  </div>
                </div>
              )
            })}

            {!loading && members.length === 0 && (
              <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No team members yet. Click "+ Invite" to add someone.</div>
            )}
          </div>

          <div style={{ marginTop: '0.75rem', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Share the dashboard URL. Invited members sign up with the exact email you entered and access activates automatically.
          </div>
        </div>
      )}

      {/* Modals */}
      {editRole !== null && (
        <RoleModal
          role={editRole || null}
          onClose={() => setEditRole(null)}
          onSave={handleSaveRole}
        />
      )}
      {editMember !== null && (
        <MemberAccessModal
          member={Object.keys(editMember).length ? editMember : null}
          onClose={() => { setEditMember(null); setError('') }}
          onSave={handleSaveMember}
          currentUser={user}
          roleTemplates={roleTemplates}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}

// ── Section: Preferences ─────────────────────────────────────────────────────
const PREFS_KEY = 'maxd_prefs'
const DEFAULT_PREFS = {
  currency: 'USD',
  timezone: 'America/New_York',
  fiscalStart: 'january',
  compactMode: false,
  defaultPage: 'dashboard',
}

function PreferencesSection() {
  const [prefs, setPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY)
      return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS
    } catch { return DEFAULT_PREFS }
  })
  const [saved, setSaved] = useState(false)

  const update = (key, value) => setPrefs(p => ({ ...p, [key]: value }))

  const save = () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const field = (label, key, opts) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 6, letterSpacing: '0.03em' }}>
        {label}
      </label>
      {opts === 'toggle'
        ? (
          <button
            onClick={() => update(key, !prefs[key])}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <div style={{
              width: 40, height: 22, borderRadius: 11,
              background: prefs[key] ? 'var(--red)' : 'var(--gray-200)',
              position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 3, left: prefs[key] ? 21 : 3,
                width: 16, height: 16, borderRadius: '50%',
                background: 'var(--white)', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>
              {prefs[key] ? 'Enabled' : 'Disabled'}
            </span>
          </button>
        )
        : (
          <select
            value={prefs[key]}
            onChange={e => update(key, e.target.value)}
            style={{
              width: '100%', maxWidth: 280, padding: '8px 12px',
              border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)',
              fontSize: 13, color: 'var(--navy)', background: 'var(--white)',
              outline: 'none',
            }}
          >
            {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )
      }
    </div>
  )

  return (
    <div>
      <div className="card" style={{ maxWidth: 520, padding: '1.5rem' }}>
        {field('Currency', 'currency', [
          { value: 'USD', label: 'USD — US Dollar ($)' },
          { value: 'CAD', label: 'CAD — Canadian Dollar ($)' },
          { value: 'EUR', label: 'EUR — Euro (€)' },
          { value: 'GBP', label: 'GBP — British Pound (£)' },
        ])}
        {field('Timezone', 'timezone', [
          { value: 'America/New_York',   label: 'Eastern Time (ET)' },
          { value: 'America/Chicago',    label: 'Central Time (CT)' },
          { value: 'America/Denver',     label: 'Mountain Time (MT)' },
          { value: 'America/Los_Angeles',label: 'Pacific Time (PT)' },
          { value: 'UTC',                label: 'UTC' },
        ])}
        {field('Fiscal Year Start', 'fiscalStart', [
          { value: 'january',  label: 'January' },
          { value: 'april',    label: 'April' },
          { value: 'july',     label: 'July' },
          { value: 'october',  label: 'October' },
        ])}
        {field('Default Landing Page', 'defaultPage', [
          { value: 'dashboard',   label: 'Dashboard' },
          { value: 'sales',       label: 'Sales CRM' },
          { value: 'content',     label: 'Content Pipeline' },
          { value: 'marketing',   label: 'Marketing' },
        ])}
        {field('Compact Mode', 'compactMode', 'toggle')}

        <button
          onClick={save}
          style={{
            marginTop: 8, padding: '9px 24px', borderRadius: 'var(--radius)',
            background: saved ? '#059669' : 'var(--navy)', border: 'none',
            color: 'var(--white)', fontSize: 12, fontWeight: 700,
            letterSpacing: '0.04em', cursor: 'pointer', transition: 'background 0.2s',
          }}
        >
          {saved ? '✓ Saved' : 'Save Preferences'}
        </button>
      </div>
    </div>
  )
}

// ── Section: About ────────────────────────────────────────────────────────────
function AboutSection() {
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)

  const exportData = () => {
    const data = {}
    Object.keys(localStorage).filter(k => k.startsWith('maxd_')).forEach(k => {
      try { data[k] = JSON.parse(localStorage.getItem(k)) } catch { data[k] = localStorage.getItem(k) }
    })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `maxd-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(''); setImportSuccess(false)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (typeof data !== 'object') throw new Error('Invalid format')
        let count = 0
        Object.entries(data).forEach(([k, v]) => {
          if (k.startsWith('maxd_')) {
            localStorage.setItem(k, JSON.stringify(v))
            count++
          }
        })
        setImportSuccess(true)
        setTimeout(() => window.location.reload(), 1200)
      } catch { setImportError('Could not read backup file. Make sure it was exported from this dashboard.') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const clearAll = () => {
    if (window.confirm('Clear ALL saved data (credentials, leads, preferences)? This cannot be undone.')) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('maxd_'))
      keys.forEach(k => localStorage.removeItem(k))
      window.location.reload()
    }
  }

  const cardStyle = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', marginBottom: '1rem' }
  const btnStyle = { fontSize: 13, padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600, border: '1px solid var(--border)', background: 'var(--surface-3)', color: 'var(--text-primary)' }

  return (
    <div style={{ maxWidth: 560 }}>
      {/* App info */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontFamily: 'var(--font-heading)', fontWeight: 700 }}>M</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.05em' }}>MAXD WELLNESS OS</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Operations Dashboard · v1.0</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8, borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px 0' }}>
            <span style={{ color: 'var(--text-muted)' }}>Stack</span><span>React 18 + Vite</span>
            <span style={{ color: 'var(--text-muted)' }}>Storage</span><span>Supabase + localStorage cache</span>
            <span style={{ color: 'var(--text-muted)' }}>Hosting</span><span>GitHub Pages</span>
            <span style={{ color: 'var(--text-muted)' }}>Built for</span><span>MAXD Wellness</span>
          </div>
        </div>
      </div>

      {/* Export / Import */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>💾 Data Backup</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Export a backup of all your dashboard data as a JSON file. Import it on any device to restore everything — scripts, content, sales data, finances, and settings.
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={exportData} style={{ ...btnStyle, background: 'var(--navy)', color: '#fff', border: 'none' }}>
            ⬇ Export Backup
          </button>
          <label style={{ ...btnStyle, display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
            ⬆ Import Backup
            <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
          </label>
        </div>
        {importError && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)' }}>⚠ {importError}</div>}
        {importSuccess && <div style={{ marginTop: 8, fontSize: 12, color: '#22c55e' }}>✓ Backup imported — reloading…</div>}
        <div style={{ marginTop: '0.75rem', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Tip: Export before making big changes, or to transfer your data to a new device before Supabase sync is set up.
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ ...cardStyle, borderLeft: '3px solid #dc2626' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>⚠ Danger Zone</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
          Clear all locally saved data including API credentials, leads, and preferences. Export a backup first.
        </div>
        <button
          onClick={clearAll}
          style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: '1px solid #fca5a5', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontWeight: 500 }}
        >
          Clear All Saved Data
        </button>
      </div>
    </div>
  )
}

// ── Sidebar nav ───────────────────────────────────────────────────────────────
const SECTIONS = [
  { key: 'integrations', label: 'Integrations',  icon: '⚡' },
  { key: 'team',         label: 'Team & Access',  icon: '👥' },
  { key: 'preferences',  label: 'Preferences',    icon: '⚙' },
  { key: 'about',        label: 'About',           icon: 'ℹ' },
]

// ── Main Settings page ────────────────────────────────────────────────────────
export default function Settings() {
  const [activeSection, setActiveSection] = useState('integrations')
  const [activeModal, setActiveModal] = useState(null)
  const [, forceUpdate] = useState(0)

  const refresh = () => forceUpdate(n => n + 1)
  const connectedCount = getConnectedCount()
  const total = Object.keys(INTEGRATIONS).length

  const sectionTitles = {
    integrations: { title: 'Integrations',  subtitle: `Connect your tools and services · ${connectedCount} of ${total} connected` },
    team:         { title: 'Team & Access',  subtitle: 'Manage team members and role permissions' },
    preferences:  { title: 'Preferences',   subtitle: 'Customize how the dashboard looks and behaves' },
    about:        { title: 'About',          subtitle: 'Version info and data management' },
  }

  return (
    <div>
      <PageHeader
        title={sectionTitles[activeSection].title}
        subtitle={sectionTitles[activeSection].subtitle}
      />

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* ── Sidebar ── */}
        <div style={{
          width: 200, flexShrink: 0,
          background: 'var(--white)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--gray-100)',
          overflow: 'hidden', position: 'sticky', top: 16,
        }}>
          {SECTIONS.map((sec, i) => {
            const active = activeSection === sec.key
            return (
              <button
                key={sec.key}
                onClick={() => setActiveSection(sec.key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px',
                  background: active ? 'var(--gray-50)' : 'transparent',
                  border: 'none',
                  borderLeft: active ? '3px solid var(--red)' : '3px solid transparent',
                  borderBottom: i < SECTIONS.length - 1 ? '1px solid var(--gray-50)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 14, opacity: active ? 1 : 0.6 }}>{sec.icon}</span>
                <span style={{
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  color: active ? 'var(--navy)' : 'var(--gray-500)',
                  letterSpacing: active ? '0.01em' : '0',
                  transition: 'all 0.15s',
                }}>
                  {sec.label}
                </span>
                {sec.key === 'integrations' && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                    background: connectedCount === total ? '#d1fae5' : 'var(--gray-100)',
                    color: connectedCount === total ? '#065f46' : 'var(--gray-500)',
                    padding: '2px 6px', borderRadius: 10,
                  }}>
                    {connectedCount}/{total}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeSection === 'integrations' && <IntegrationsSection onModal={setActiveModal} />}
          {activeSection === 'team'         && <AccessControl />}
          {activeSection === 'preferences'  && <PreferencesSection />}
          {activeSection === 'about'        && <AboutSection />}
        </div>
      </div>

      {/* Modal */}
      {activeModal && (
        <ConnectModal
          serviceKey={activeModal}
          integration={INTEGRATIONS[activeModal]}
          onClose={() => setActiveModal(null)}
          onSave={refresh}
        />
      )}
    </div>
  )
}
