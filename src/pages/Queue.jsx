import { useState, useMemo, useEffect } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { dbSet, dbGet } from '../lib/db.js'
import { getCredentials, isConnected } from '../lib/credentials.js'

const STORE_KEY = 'maxd_queue'

// ── Constants ─────────────────────────────────────────────────────────────────
const ACTION_TYPES = {
  instagram_post: { label: 'Instagram Post',    icon: '📸', color: '#E1306C', platform: 'social'   },
  tiktok_post:    { label: 'TikTok Post',       icon: '🎵', color: '#010101', platform: 'social'   },
  facebook_post:  { label: 'Facebook Post',     icon: '👍', color: '#1877F2', platform: 'social'   },
  youtube_post:   { label: 'YouTube Short',     icon: '▶',  color: '#FF0000', platform: 'social'   },
  email_campaign: { label: 'Email Campaign',    icon: '✉️', color: '#00B5AD', platform: 'email'    },
  email_sequence: { label: 'Sales Email',       icon: '📬', color: '#E21B4D', platform: 'sales'    },
  gmail_draft:    { label: 'Gmail Draft',       icon: '📧', color: '#4285F4', platform: 'sales'    },
}

const STATUS = {
  pending:  { label: 'Pending Review', color: '#f59e0b', bg: '#f59e0b22' },
  approved: { label: 'Approved',       color: '#3b82f6', bg: '#3b82f622' },
  sent:     { label: 'Sent',           color: '#22c55e', bg: '#22c55e22' },
  rejected: { label: 'Rejected',       color: '#64748b', bg: '#64748b22' },
  failed:   { label: 'Failed',         color: '#ef4444', bg: '#ef444422' },
}

const EMPTY = { items: [] }

function load() {
  try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : EMPTY } catch { return EMPTY }
}
function save(d) { dbSet(STORE_KEY, d) }
function nid() { return `q_${Date.now()}_${Math.random().toString(36).slice(2,5)}` }

// ── Export so agents can push items to the queue ────────────────────────────
export function pushToQueue(item) {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    const data = raw ? JSON.parse(raw) : EMPTY
    const newItem = {
      id: nid(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      ...item,
    }
    const next = { ...data, items: [newItem, ...data.items] }
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
    dbSet(STORE_KEY, next)
    return newItem.id
  } catch { return null }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inp = { display: 'block', width: '100%', marginTop: 4, padding: '0.5rem 0.65rem', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }
const btnPrimary = { background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.45rem 1rem', fontSize: 13, cursor: 'pointer', fontWeight: 600 }
const btnGhost = { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.45rem 0.9rem', fontSize: 13, cursor: 'pointer' }

// ── Platform dispatchers ────────────────────────────────────────────────────
async function dispatchInstagram(item) {
  const creds = getCredentials('instagram')
  if (!creds?.accessToken || !creds?.pageId) throw new Error('Instagram not connected. Add your access token in Settings → Integrations → Instagram.')
  // Instagram Graph API — create media container then publish
  const isVideo = item.mediaType === 'video'
  const params = new URLSearchParams({
    access_token: creds.accessToken,
    ...(isVideo
      ? { media_type: 'REELS', video_url: item.mediaUrl, caption: item.caption, share_to_feed: 'true' }
      : { image_url: item.mediaUrl, caption: item.caption }),
  })
  const createRes = await fetch(`https://graph.instagram.com/${creds.pageId}/media`, { method: 'POST', body: params })
  const createData = await createRes.json()
  if (!createRes.ok || createData.error) throw new Error(createData.error?.message || 'Failed to create media container')
  // Publish
  const publishParams = new URLSearchParams({ creation_id: createData.id, access_token: creds.accessToken })
  const publishRes = await fetch(`https://graph.instagram.com/${creds.pageId}/media_publish`, { method: 'POST', body: publishParams })
  const publishData = await publishRes.json()
  if (!publishRes.ok || publishData.error) throw new Error(publishData.error?.message || 'Failed to publish to Instagram')
  return { postId: publishData.id }
}

async function dispatchFacebook(item) {
  const creds = getCredentials('facebook')
  if (!creds?.accessToken || !creds?.pageId) throw new Error('Facebook Pages not connected. Add your page token in Settings.')
  const params = new URLSearchParams({ message: item.caption, access_token: creds.accessToken })
  if (item.mediaUrl) params.set('url', item.mediaUrl)
  const endpoint = item.mediaUrl ? 'photos' : 'feed'
  const res = await fetch(`https://graph.facebook.com/${creds.pageId}/${endpoint}`, { method: 'POST', body: params })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Failed to post to Facebook')
  return { postId: data.id }
}

async function dispatchKlaviyo(item) {
  const creds = getCredentials('klaviyo')
  if (!creds?.apiKey) throw new Error('Klaviyo not connected. Add your API key in Settings.')
  // Klaviyo v3 API — create and send campaign
  const campaignRes = await fetch('https://a.klaviyo.com/api/campaigns/', {
    method: 'POST',
    headers: { 'Authorization': `Klaviyo-API-Key ${creds.apiKey}`, 'Content-Type': 'application/json', 'revision': '2024-02-15' },
    body: JSON.stringify({ data: { type: 'campaign', attributes: { name: item.subject || 'MAXD Campaign', audiences: { included: creds.listId ? [creds.listId] : [] }, send_strategy: { method: 'immediate' }, content: { subject: item.subject, preview_text: item.previewText || '', body: item.body } } } }),
  })
  const campaignData = await campaignRes.json()
  if (!campaignRes.ok) throw new Error(campaignData.errors?.[0]?.detail || 'Failed to create Klaviyo campaign')
  return { campaignId: campaignData.data?.id }
}

async function dispatchGmailDraft(item) {
  // Uses Gmail API with OAuth — requires gmail access token stored in credentials
  const creds = getCredentials('gmail')
  if (!creds?.accessToken) throw new Error('Gmail not connected. Add your Gmail access token in Settings → Integrations.')
  const email = [
    `To: ${item.to}`,
    `Subject: ${item.subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    item.body,
  ].join('\n')
  const encoded = btoa(unescape(encodeURIComponent(email))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { raw: encoded } }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Failed to create Gmail draft')
  return { draftId: data.id }
}

async function dispatch(item) {
  switch (item.type) {
    case 'instagram_post': return dispatchInstagram(item)
    case 'facebook_post':  return dispatchFacebook(item)
    case 'email_campaign': return dispatchKlaviyo(item)
    case 'gmail_draft':    return dispatchGmailDraft(item)
    default: throw new Error(`Dispatch not yet implemented for ${item.type}. Content is ready to copy and post manually.`)
  }
}

// ── Item Detail Modal ─────────────────────────────────────────────────────────
function ItemModal({ item, onClose, onUpdate, onDelete }) {
  const [form, setForm] = useState({ ...item })
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null) // { ok, message }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const type = ACTION_TYPES[item.type] || { label: item.type, icon: '📋', color: '#64748b' }
  const [copied, setCopied] = useState(false)

  const handleApproveAndSend = async () => {
    setSending(true); setSendResult(null)
    try {
      const result = await dispatch(form)
      setSendResult({ ok: true, message: `✅ ${type.label} sent successfully!` + (result.postId ? ` Post ID: ${result.postId}` : result.draftId ? ' Draft created in Gmail.' : '') })
      onUpdate({ ...form, status: 'sent', sentAt: new Date().toISOString(), result })
    } catch (e) {
      setSendResult({ ok: false, message: `⚠️ ${e.message}` })
      onUpdate({ ...form, status: 'failed' })
    }
    setSending(false)
  }

  const copyContent = () => {
    const text = [form.subject && `Subject: ${form.subject}`, form.caption, form.body].filter(Boolean).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
          <span style={{ fontSize: 22 }}>{type.icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{type.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Created {new Date(item.createdAt).toLocaleString()}</div>
          </div>
          <div style={{ marginLeft: 'auto', ...STATUS[form.status] && { background: STATUS[form.status].bg, color: STATUS[form.status].color }, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
            {STATUS[form.status]?.label || form.status}
          </div>
        </div>

        {/* Content fields */}
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {form.type === 'gmail_draft' || form.type === 'email_sequence' ? (
            <>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>To
                <input value={form.to || ''} onChange={e => set('to', e.target.value)} style={inp} placeholder="recipient@email.com" />
              </label>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Subject
                <input value={form.subject || ''} onChange={e => set('subject', e.target.value)} style={inp} />
              </label>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Email Body
                <textarea value={form.body || ''} onChange={e => set('body', e.target.value)} rows={10} style={{ ...inp, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }} />
              </label>
            </>
          ) : form.type === 'email_campaign' ? (
            <>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Subject Line
                <input value={form.subject || ''} onChange={e => set('subject', e.target.value)} style={inp} />
              </label>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Preview Text
                <input value={form.previewText || ''} onChange={e => set('previewText', e.target.value)} style={inp} />
              </label>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Email Body
                <textarea value={form.body || ''} onChange={e => set('body', e.target.value)} rows={10} style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
              </label>
            </>
          ) : (
            <>
              {(form.mediaUrl || form.type?.includes('post')) && (
                <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Media URL (image or video link)
                  <input value={form.mediaUrl || ''} onChange={e => set('mediaUrl', e.target.value)} style={inp} placeholder="https://..." />
                </label>
              )}
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Caption / Post Text
                <textarea value={form.caption || ''} onChange={e => set('caption', e.target.value)} rows={6} style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
              </label>
              {form.hashtags && (
                <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Hashtags
                  <input value={form.hashtags || ''} onChange={e => set('hashtags', e.target.value)} style={inp} />
                </label>
              )}
            </>
          )}
          {form.notes && (
            <div style={{ padding: '0.6rem 0.75rem', background: 'var(--surface-3)', borderRadius: 6, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              <strong>Notes:</strong> {form.notes}
            </div>
          )}
        </div>

        {/* Send result */}
        {sendResult && (
          <div style={{ marginTop: '1rem', padding: '0.65rem 0.9rem', background: sendResult.ok ? '#22c55e22' : '#ef444422', border: `1px solid ${sendResult.ok ? '#22c55e44' : '#ef444444'}`, borderRadius: 8, fontSize: 13, color: sendResult.ok ? '#15803d' : '#dc2626', lineHeight: 1.5 }}>
            {sendResult.message}
            {!sendResult.ok && (
              <div style={{ marginTop: 6, fontSize: 12 }}>
                You can still copy the content and post it manually.
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          {form.status === 'pending' && (
            <button onClick={handleApproveAndSend} disabled={sending} style={{ ...btnPrimary, background: type.color, opacity: sending ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              {sending ? '⏳ Sending…' : `${type.icon} Approve & Send`}
            </button>
          )}
          {form.status === 'failed' && (
            <button onClick={handleApproveAndSend} disabled={sending} style={{ ...btnPrimary, background: '#ef4444' }}>
              {sending ? '⏳ Retrying…' : '↺ Retry'}
            </button>
          )}
          <button onClick={copyContent} style={btnGhost}>{copied ? '✅ Copied' : '📋 Copy Content'}</button>
          <button onClick={() => { onUpdate({ ...form }); onClose() }} style={btnGhost}>Save Edits</button>
          {form.status === 'pending' && (
            <button onClick={() => { onUpdate({ ...form, status: 'rejected' }); onClose() }} style={{ ...btnGhost, color: 'var(--text-muted)' }}>Reject</button>
          )}
          <button onClick={() => { onDelete(item.id); onClose() }} style={{ ...btnGhost, marginLeft: 'auto', color: 'var(--red)' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── New Item Form ─────────────────────────────────────────────────────────────
function AddItemModal({ onClose, onAdd }) {
  const [type, setType] = useState('instagram_post')
  const [form, setForm] = useState({ caption: '', body: '', subject: '', to: '', mediaUrl: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const t = ACTION_TYPES[type]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1.25rem', fontFamily: 'Oswald, sans-serif', color: 'var(--text-primary)' }}>Add to Queue</h3>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'block' }}>Content Type
          <select value={type} onChange={e => setType(e.target.value)} style={inp}>
            {Object.entries(ACTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </label>
        {['instagram_post','tiktok_post','facebook_post','youtube_post'].includes(type) && (
          <>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'block' }}>Media URL (hosted image or video)
              <input value={form.mediaUrl} onChange={e => set('mediaUrl', e.target.value)} placeholder="https://..." style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'block' }}>Caption
              <textarea value={form.caption} onChange={e => set('caption', e.target.value)} rows={5} style={{ ...inp, resize: 'vertical' }} />
            </label>
          </>
        )}
        {['email_campaign','gmail_draft','email_sequence'].includes(type) && (
          <>
            {type !== 'email_campaign' && (
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'block' }}>To (email address)
                <input value={form.to} onChange={e => set('to', e.target.value)} style={inp} />
              </label>
            )}
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'block' }}>Subject
              <input value={form.subject} onChange={e => set('subject', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'block' }}>Body
              <textarea value={form.body} onChange={e => set('body', e.target.value)} rows={7} style={{ ...inp, resize: 'vertical' }} />
            </label>
          </>
        )}
        <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'block' }}>Internal Notes (optional)
          <input value={form.notes} onChange={e => set('notes', e.target.value)} style={inp} />
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button onClick={() => { onAdd({ type, ...form }); onClose() }} style={{ ...btnPrimary, background: t.color }}>Add to Queue</button>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Connection Status Bar ─────────────────────────────────────────────────────
function ConnectionBar() {
  const platforms = [
    { key: 'instagram', label: 'Instagram', icon: '📸', field: 'accessToken' },
    { key: 'facebook',  label: 'Facebook',  icon: '👍', field: 'accessToken' },
    { key: 'klaviyo',   label: 'Klaviyo',   icon: '✉️', field: 'apiKey'      },
  ]

  const connected = platforms.filter(p => {
    const creds = getCredentials(p.key)
    return creds?.[p.field]?.trim()
  })
  const notConnected = platforms.filter(p => {
    const creds = getCredentials(p.key)
    return !creds?.[p.field]?.trim()
  })

  if (notConnected.length === 0) return null

  return (
    <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>⚡ Connect platforms to enable one-click posting:</span>
      {notConnected.map(p => (
        <a key={p.key} href="/#/settings" style={{ fontSize: 12, padding: '3px 10px', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 6, color: '#92400e', textDecoration: 'none', fontWeight: 500 }}>
          {p.icon} Connect {p.label}
        </a>
      ))}
      {connected.length > 0 && <span style={{ fontSize: 12, color: '#22c55e' }}>✓ {connected.map(p => p.label).join(', ')} connected</span>}
    </div>
  )
}

// ── Main Queue Component ──────────────────────────────────────────────────────
export default function Queue() {
  const [data, setData] = useState(load)
  const [selectedItem, setSelectedItem] = useState(null)
  const [addModal, setAddModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')

  useEffect(() => {
    dbGet(STORE_KEY).then(d => { if (d) setData(d) })
    // Poll for new items pushed by agents every 10 seconds
    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem(STORE_KEY)
        if (raw) { const d = JSON.parse(raw); setData(d) }
      } catch {}
    }, 10000)
    return () => clearInterval(poll)
  }, [])

  const persist = (next) => { setData(next); save(next) }

  const addItem = (item) => {
    const newItem = { id: nid(), createdAt: new Date().toISOString(), status: 'pending', ...item }
    persist({ ...data, items: [newItem, ...data.items] })
  }

  const updateItem = (updated) => {
    persist({ ...data, items: data.items.map(i => i.id === updated.id ? updated : i) })
  }

  const deleteItem = (id) => {
    persist({ ...data, items: data.items.filter(i => i.id !== id) })
  }

  const filteredItems = useMemo(() => {
    return data.items.filter(item => {
      if (filter !== 'all' && item.status !== filter) return false
      if (platformFilter !== 'all') {
        const t = ACTION_TYPES[item.type]
        if (t?.platform !== platformFilter) return false
      }
      return true
    })
  }, [data.items, filter, platformFilter])

  const pending = data.items.filter(i => i.status === 'pending').length
  const sent = data.items.filter(i => i.status === 'sent').length

  const filterBtn = (val, label) => (
    <button onClick={() => setFilter(val)} style={{ padding: '0.3rem 0.75rem', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: filter === val ? 600 : 400, background: filter === val ? 'var(--navy)' : 'var(--surface-3)', color: filter === val ? '#fff' : 'var(--text-secondary)', border: 'none' }}>
      {label}
    </button>
  )

  const platBtn = (val, label, icon) => (
    <button onClick={() => setPlatformFilter(val)} style={{ padding: '0.3rem 0.75rem', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: platformFilter === val ? 'var(--surface-2)' : 'transparent', color: platformFilter === val ? 'var(--text-primary)' : 'var(--text-muted)', border: `1px solid ${platformFilter === val ? 'var(--border-mid)' : 'transparent'}`, fontWeight: platformFilter === val ? 600 : 400 }}>
      {icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}
    </button>
  )

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader title="Action Queue" subtitle="Review and approve AI-generated content before it goes out" />

      <ConnectionBar />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Pending Review', value: pending, color: '#f59e0b' },
          { label: 'Sent / Posted',  value: sent,    color: '#22c55e' },
          { label: 'Total in Queue', value: data.items.length, color: 'var(--navy)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.875rem', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'Oswald, sans-serif' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Add */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {filterBtn('all', `All (${data.items.length})`)}
          {filterBtn('pending', `Pending (${pending})`)}
          {filterBtn('approved', 'Approved')}
          {filterBtn('sent', `Sent (${sent})`)}
          {filterBtn('rejected', 'Rejected')}
          {filterBtn('failed', 'Failed')}
        </div>
        <div style={{ display: 'flex', gap: 3, marginLeft: 8, borderLeft: '1px solid var(--border)', paddingLeft: 8 }}>
          {platBtn('all', 'All')}
          {platBtn('social', 'Social', '📱')}
          {platBtn('email', 'Email', '✉️')}
          {platBtn('sales', 'Sales', '📬')}
        </div>
        <button onClick={() => setAddModal(true)} style={{ marginLeft: 'auto', ...btnPrimary }}>+ Add to Queue</button>
      </div>

      {/* Queue items */}
      {filteredItems.length === 0 ? (
        <div style={{ background: 'var(--surface-2)', border: '2px dashed var(--border)', borderRadius: 12, padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: '0.75rem' }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Queue is empty</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto 1.25rem', lineHeight: 1.6 }}>
            Content created by AI agents will appear here for your review before anything goes out. You can also add items manually.
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--surface-3)', borderRadius: 8, padding: '0.75rem 1rem', display: 'inline-block', textAlign: 'left' }}>
            <strong>How to use agents:</strong><br />
            Go to <strong>AI Studio → Agents</strong>, run any agent, and click<br />
            <strong>"Send to Queue"</strong> instead of just copying the output.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredItems.map(item => {
            const type = ACTION_TYPES[item.type] || { label: item.type, icon: '📋', color: '#64748b' }
            const status = STATUS[item.status] || STATUS.pending
            const preview = item.caption || item.subject || item.body || ''
            return (
              <div key={item.id} onClick={() => setSelectedItem(item)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderLeft: `3px solid ${type.color}`, borderRadius: 10, padding: '0.875rem 1rem', cursor: 'pointer', display: 'grid', gridTemplateColumns: '40px 1fr auto auto', gap: '0.75rem', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}>
                <div style={{ fontSize: 22, textAlign: 'center' }}>{type.icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{type.label}</span>
                    {item.to && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→ {item.to}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
                    {preview.slice(0, 120)}{preview.length > 120 ? '…' : ''}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ background: status.bg, color: status.color, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {status.label}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {selectedItem && <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} onUpdate={(updated) => { updateItem(updated); setSelectedItem(updated) }} onDelete={deleteItem} />}
      {addModal && <AddItemModal onClose={() => setAddModal(false)} onAdd={addItem} />}
    </div>
  )
}
