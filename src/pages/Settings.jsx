import { useState } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { getTeam, saveTeam, initials, memberColor } from '../lib/team.js'
import {
  INTEGRATIONS,
  INTEGRATION_CATEGORIES,
  getCredentials,
  saveCredentials,
  clearCredentials,
  isConnected,
  getConnectedCount,
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

// ── Connect / Edit modal ────────────────────────────────────────────────────
function ConnectModal({ serviceKey, integration, onClose, onSave }) {
  const existing = getCredentials(serviceKey) || {}
  const [values, setValues] = useState(
    Object.fromEntries(integration.fields.map(f => [f.key, existing[f.key] ?? '']))
  )
  const [showValues, setShowValues] = useState({})
  const [saving, setSaving] = useState(false)
  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      saveCredentials(serviceKey, values)
      onSave()
      onClose()
    }, 400)
  }

  const handleDisconnect = () => {
    clearCredentials(serviceKey)
    onSave()
    onClose()
  }

  const connected = isConnected(serviceKey)
  const canSave = integration.fields.some(f => values[f.key]?.trim())

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--white)', borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--navy)', padding: '1.25rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{integration.icon}</span>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', color: 'var(--white)', fontSize: 15, letterSpacing: '0.05em' }}>
                {integration.label.toUpperCase()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1 }}>{integration.desc}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gray-400)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {/* Help link */}
          <div style={{
            background: 'var(--gray-50)', borderRadius: 'var(--radius)',
            padding: '10px 14px', marginBottom: '1.25rem',
            fontSize: 12, color: 'var(--gray-600)', lineHeight: 1.6,
            borderLeft: `3px solid ${integration.color}`,
          }}>
            <strong>Where to find this:</strong>{' '}
            {integration.helpText}
            {' '}<a href={integration.helpUrl} target="_blank" rel="noreferrer" style={{ color: integration.color }}>View guide →</a>
          </div>

          {/* Optional note */}
          {integration.note && (
            <div style={{
              background: '#fffbeb', borderRadius: 'var(--radius)',
              padding: '10px 14px', marginBottom: '1.25rem',
              fontSize: 12, color: '#92400e', lineHeight: 1.6,
              borderLeft: '3px solid #fde68a',
            }}>
              ℹ {integration.note}
            </div>
          )}

          {/* Fields */}
          {integration.fields.map(field => (
            <div key={field.key} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 5, letterSpacing: '0.03em' }}>
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
                  style={{
                    width: '100%', padding: '9px 36px 9px 12px',
                    border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)',
                    fontSize: 13, color: 'var(--navy)', background: 'var(--white)',
                    outline: 'none', boxSizing: 'border-box',
                    fontFamily: values[field.key] && field.type === 'password' && !showValues[field.key]
                      ? 'monospace' : 'inherit',
                  }}
                  onFocus={e => e.target.style.borderColor = integration.color}
                  onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
                />
                {field.type === 'password' && values[field.key] && (
                  <button
                    onClick={() => setShowValues(s => ({ ...s, [field.key]: !s[field.key] }))}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: 'var(--gray-400)',
                    }}
                  >
                    {showValues[field.key] ? '🙈' : '👁'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Test Connection — shown for integrations that support it (e.g. Notion) */}
          {integration.testable && values.apiKey?.trim() && (
            <div style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>
              <button
                onClick={handleTestNotion}
                disabled={testState.loading}
                style={{
                  fontSize: 12, padding: '7px 16px', borderRadius: 6,
                  border: `1.5px solid ${integration.color}`,
                  background: 'var(--white)', color: integration.color,
                  cursor: testState.loading ? 'default' : 'pointer', fontWeight: 600,
                  opacity: testState.loading ? 0.7 : 1,
                }}
              >
                {testState.loading ? '⟳ Testing…' : '◻ Test Connection'}
              </button>
              {testState.result && (
                <span style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginLeft: 10 }}>{testState.result}</span>
              )}
              {testState.error && (
                <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, marginLeft: 10 }}>{testState.error}</span>
              )}
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: '0.75rem', lineHeight: 1.6 }}>
            🔒 Credentials are stored locally in your browser only and never sent to any third-party server.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid var(--gray-100)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--gray-50)',
        }}>
          <div>
            {connected && (
              <button onClick={handleDisconnect} style={{
                fontSize: 12, padding: '6px 14px', borderRadius: 6,
                border: '1px solid #fca5a5', background: 'var(--white)',
                color: '#dc2626', cursor: 'pointer', fontWeight: 500,
              }}>
                Disconnect
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{
              fontSize: 12, padding: '7px 16px', borderRadius: 6,
              border: '1px solid var(--gray-200)', background: 'var(--white)',
              color: 'var(--gray-600)', cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={!canSave || saving} style={{
              fontSize: 12, padding: '7px 16px', borderRadius: 6,
              border: 'none', background: canSave ? integration.color : 'var(--gray-200)',
              color: 'var(--white)', cursor: canSave ? 'pointer' : 'default',
              fontWeight: 600, letterSpacing: '0.03em', minWidth: 90,
              opacity: saving ? 0.8 : 1, transition: 'all 0.15s',
            }}>
              {saving ? 'Saving…' : connected ? 'Update' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
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

// ── Section: Integrations ───────────────────────────────────────────────────
function IntegrationsSection({ onModal }) {
  const connectedCount = getConnectedCount()
  const total = Object.keys(INTEGRATIONS).length
  const pct = Math.round((connectedCount / total) * 100)

  // Group integrations by category
  const grouped = {}
  Object.entries(INTEGRATIONS).forEach(([key, integration]) => {
    const cat = integration.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push([key, integration])
  })

  return (
    <div>
      {/* Progress */}
      <div style={{
        background: 'var(--white)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--gray-100)', padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex', alignItems: 'center', gap: '1.5rem',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--gray-400)', marginBottom: 8, letterSpacing: '0.06em' }}>
            <span>INTEGRATION SETUP</span>
            <span>{connectedCount} / {total} connected · {pct}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: 'linear-gradient(90deg, var(--red), #E87040)',
              width: `${pct}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)', lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 10, color: 'var(--gray-400)', letterSpacing: '0.06em', marginTop: 2 }}>COMPLETE</div>
        </div>
      </div>

      {/* Grouped cards */}
      {Object.entries(INTEGRATION_CATEGORIES).map(([catKey, catMeta]) => {
        const items = grouped[catKey]
        if (!items?.length) return null
        const catConnected = items.filter(([k]) => isConnected(k)).length

        return (
          <div key={catKey} style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 10,
            }}>
              <span style={{ fontSize: 14 }}>{catMeta.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', letterSpacing: '0.08em' }}>
                {catMeta.label.toUpperCase()}
              </span>
              <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                · {catConnected}/{items.length} connected
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {items.map(([key, integration]) => (
                <IntegrationCard
                  key={key}
                  serviceKey={key}
                  integration={integration}
                  onOpen={onModal}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* CORS note */}
      <div style={{
        marginTop: '0.5rem', padding: '1rem 1.25rem',
        background: '#fffbeb', borderRadius: 'var(--radius)',
        border: '1px solid #fde68a', fontSize: 12, color: '#92400e', lineHeight: 1.7,
      }}>
        <strong>⚠ Note for Shopify & Klaviyo:</strong> Browser security rules (CORS) prevent direct calls to these APIs from a local app.
        Once you deploy this dashboard to a server (e.g. Vercel), those connections will work automatically.
        In the meantime, Shopify data can be pulled via Make webhooks.
      </div>
    </div>
  )
}

// ── Section: Team ────────────────────────────────────────────────────────────
const ROLES = {
  admin:     { label: 'Admin',     color: '#DC2626', desc: 'Full access to all modules' },
  content:   { label: 'Content',   color: '#7C3AED', desc: 'Dashboard, Social, Content, AI Studio' },
  marketing: { label: 'Marketing', color: '#D97706', desc: 'Dashboard, Social, Marketing, Sales' },
  ops:       { label: 'Ops',       color: '#059669', desc: 'Dashboard, Operations, Sales' },
}

function RoleBadge({ role }) {
  const r = ROLES[role] || { label: role, color: 'var(--gray-400)' }
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 20, background: `${r.color}18`, color: r.color }}>
      {r.label.toUpperCase()}
    </span>
  )
}

const EMPTY_MEMBER = { name: '', email: '', role: 'content' }

function MemberModal({ member, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...EMPTY_MEMBER, ...member })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isNew = !member?.id
  const canSave = form.name.trim()

  const handleSave = () => {
    const id = form.id || `m_${Date.now()}`
    const ini = initials(form.name)
    const color = memberColor(id)
    onSave({ ...form, id, initials: ini, color })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ background: 'var(--navy)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--white)', fontSize: 14, letterSpacing: '0.05em' }}>{isNew ? 'ADD TEAM MEMBER' : 'EDIT MEMBER'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gray-400)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { key: 'name',  label: 'Full Name',     type: 'text',  placeholder: 'Jane Smith' },
            { key: 'email', label: 'Email Address',  type: 'email', placeholder: 'jane@example.com' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, letterSpacing: '0.04em' }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--navy)', outline: 'none' }} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, letterSpacing: '0.04em' }}>ROLE</label>
            <select value={form.role} onChange={e => set('role', e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--navy)', background: 'var(--white)', outline: 'none' }}>
              {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label} — {r.desc}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray-400)', lineHeight: 1.6 }}>
            📧 When you assign items to this team member in Scripts or Content, they'll appear in their queue. Full email notifications require Firebase Auth (coming soon).
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--gray-100)', background: 'var(--gray-50)', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {!isNew && member.id !== 'kyle' && (
              <button onClick={() => { onDelete(member.id); onClose() }}
                style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px solid #fca5a5', background: 'var(--white)', color: '#dc2626', cursor: 'pointer' }}>Remove</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-600)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={!canSave}
              style={{ fontSize: 12, padding: '7px 20px', borderRadius: 6, border: 'none', background: canSave ? 'var(--navy)' : 'var(--gray-200)', color: 'var(--white)', cursor: canSave ? 'pointer' : 'default', fontWeight: 700 }}>
              {isNew ? 'Add Member' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TeamSection() {
  const [team, setTeam] = useState(getTeam)
  const [modal, setModal] = useState(null)

  const persist = (updated) => { saveTeam(updated); setTeam(updated) }
  const handleSave = (member) => {
    const idx = team.findIndex(m => m.id === member.id)
    persist(idx >= 0 ? team.map(m => m.id === member.id ? member : m) : [...team, member])
  }
  const handleDelete = (id) => persist(team.filter(m => m.id !== id))

  return (
    <div>
      {/* Team list */}
      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-100)', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px', padding: '10px 16px', borderBottom: '1px solid var(--gray-100)', fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', letterSpacing: '0.08em' }}>
          <span>MEMBER</span><span>ROLE</span><span style={{ textAlign: 'right' }}>ACTION</span>
        </div>
        {team.map(member => (
          <div key={member.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px', padding: '12px 16px', alignItems: 'center', borderBottom: '1px solid var(--gray-50)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: member.color || 'var(--navy)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {member.initials}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>
                  {member.name}
                  {member.id === 'kyle' && <span style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 400, marginLeft: 6 }}>(you)</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{member.email}</div>
              </div>
            </div>
            <RoleBadge role={member.role} />
            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setModal(member)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-600)', cursor: 'pointer' }}>Edit</button>
            </div>
          </div>
        ))}
        {/* Add member row */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--gray-50)' }}>
          <button onClick={() => setModal({})} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: '1.5px dashed var(--gray-300)', background: 'var(--white)', color: 'var(--gray-500)', cursor: 'pointer', fontWeight: 600 }}>
            + Add Team Member
          </button>
        </div>
      </div>

      {/* Role reference */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', letterSpacing: '0.08em', marginBottom: 10 }}>ROLE PERMISSIONS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
          {Object.entries(ROLES).map(([key, r]) => (
            <div key={key} className="card" style={{ padding: '12px 14px', borderLeft: `3px solid ${r.color}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: r.color, letterSpacing: '0.04em', marginBottom: 4 }}>{r.label}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)', lineHeight: 1.6 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '1rem 1.25rem', background: '#eff6ff', borderRadius: 'var(--radius)', border: '1px solid #bfdbfe', fontSize: 12, color: '#1e40af', lineHeight: 1.7 }}>
        <strong>💡 How team assignment works:</strong> When you assign a Script or Content item to a team member, it shows in their queue on the Dashboard. Full push notifications and Firebase Auth login will be added in a future update.
      </div>

      {modal !== null && (
        <MemberModal
          member={Object.keys(modal).length ? modal : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
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
  const clearAll = () => {
    if (window.confirm('Clear ALL saved data (credentials, leads, preferences)? This cannot be undone.')) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('maxd_'))
      keys.forEach(k => localStorage.removeItem(k))
      window.location.reload()
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.25rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--white)', fontSize: 22, fontFamily: 'var(--font-heading)',
          }}>M</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', fontFamily: 'var(--font-heading)', letterSpacing: '0.05em' }}>
              MAXD WELLNESS OS
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Business Operating System · v1.0</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.8, borderTop: '1px solid var(--gray-100)', paddingTop: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px 0' }}>
            <span style={{ color: 'var(--gray-400)' }}>Version</span><span>1.0.0</span>
            <span style={{ color: 'var(--gray-400)' }}>Stack</span><span>React 18 + Vite + Recharts</span>
            <span style={{ color: 'var(--gray-400)' }}>Storage</span><span>localStorage (no backend)</span>
            <span style={{ color: 'var(--gray-400)' }}>Built for</span><span>MAXD Wellness (Creatine Gummies)</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', borderLeft: '3px solid #dc2626' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>⚠ Danger Zone</div>
        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12, lineHeight: 1.6 }}>
          Clear all locally saved data including API credentials, leads, and preferences.
          This action cannot be undone.
        </div>
        <button
          onClick={clearAll}
          style={{
            fontSize: 12, padding: '7px 16px', borderRadius: 6,
            border: '1px solid #fca5a5', background: 'var(--white)',
            color: '#dc2626', cursor: 'pointer', fontWeight: 500,
          }}
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
          {activeSection === 'team'         && <TeamSection />}
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
