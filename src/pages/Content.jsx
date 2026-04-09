import { useState, useMemo } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
// ── Storage ──────────────────────────────────────────────────────────────────
const STORE_KEY = 'maxd_content'

function loadContent() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const stored = JSON.parse(raw)
      const storedIds = new Set(stored.map(i => i.id))
      const newItems = DEMO_DATA.filter(d => !storedIds.has(d.id))
      if (newItems.length > 0) {
        const merged = [...stored, ...newItems]
        saveContent(merged)
        return merged
      }
      return stored
    }
  } catch { /* fall through */ }
  return DEMO_DATA
}

function saveContent(items) {
  localStorage.setItem(STORE_KEY, JSON.stringify(items))
}

function newId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CONTENT_TYPES = {
  reel:     { label: 'Reel',        icon: '🎬', color: '#DC2626', needsFilming: true  },
  tiktok:   { label: 'TikTok',      icon: '🎵', color: '#2D2D2D', needsFilming: true  },
  short:    { label: 'YT Short',    icon: '▶',  color: '#FF0000', needsFilming: true  },
  story:    { label: 'Story',       icon: '◎',  color: '#F59E0B', needsFilming: false },
  post:     { label: 'Static Post', icon: '📸', color: '#7C3AED', needsFilming: false },
  carousel: { label: 'Carousel',    icon: '≡',  color: '#2563EB', needsFilming: false },
  ugc:      { label: 'UGC',         icon: '👥', color: '#059669', needsFilming: false },
}

const ALL_PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'YouTube Shorts']

const STAGES = [
  { key: 'idea',      label: 'Idea',       color: '#94A3B8', bg: '#F1F5F9' },
  { key: 'scripting', label: 'Scripting',  color: '#D97706', bg: '#FFFBEB' },
  { key: 'ready',     label: 'Ready',      color: '#2563EB', bg: '#EFF6FF' },
  { key: 'filming',   label: 'Filming',    color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'editing',   label: 'Editing',    color: '#D85A30', bg: '#FFF7ED' },
  { key: 'scheduled', label: 'Scheduled',  color: '#059669', bg: '#ECFDF5' },
  { key: 'posted',    label: 'Posted ✓',   color: '#065F46', bg: '#D1FAE5' },
]

const UPLOAD_STATUSES = [
  { key: '',         label: 'Not Uploaded', color: '#94A3B8', bg: '#F1F5F9' },
  { key: 'uploaded', label: 'Uploaded',     color: '#D97706', bg: '#FFFBEB' },
  { key: 'approved', label: 'Approved ✓',   color: '#059669', bg: '#ECFDF5' },
]

function stageInfo(key) { return STAGES.find(s => s.key === key) || STAGES[0] }
function uploadInfo(key) { return UPLOAD_STATUSES.find(s => s.key === key) || UPLOAD_STATUSES[0] }

function getItemPlatforms(item) {
  if (item.platforms?.length) return item.platforms
  if (item.platform) return [item.platform]
  return []
}

function buildGCalUrl(item) {
  if (!item.scheduledDate) return null
  const date = item.scheduledDate.replace(/-/g, '')
  const d = new Date(item.scheduledDate + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  const endDate = d.toISOString().split('T')[0].replace(/-/g, '')
  const platforms = getItemPlatforms(item).join(', ')
  const details = [
    platforms ? `Platforms: ${platforms}` : '',
    item.funnel ? `Funnel: ${item.funnel}` : '',
    item.notes || '',
    item.notionUrl ? `Notion: ${item.notionUrl}` : '',
  ].filter(Boolean).join('\n')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `[MAXD] ${item.title}`,
    dates: `${date}/${endDate}`,
    details: details || 'MAXD Wellness content',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_DATA = [
  { id: 'n1',  title: 'Why Gummies?',           type: 'reel',     platforms: ['TikTok', 'Instagram', 'YouTube', 'Facebook'], funnel: 'MOFU', status: 'posted',    scheduledDate: '2026-03-25', caption: 'Making science enjoyable. Why we started with @trymaxd.', hashtags: '#creatine #maxd #fitness', notes: 'Needs Kitchen, Product shot', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c8078a6c6d140f1531f58' },
  { id: 'n2',  title: 'Story: BTS Building',    type: 'story',    platforms: ['Instagram'],                                  funnel: '',     status: 'posted',    scheduledDate: '2026-03-26', caption: 'Making science enjoyable. Why we started @trymaxd.', hashtags: '', notes: 'Behind the scenes of building the brand', assignedTo: 'Kyle', notionUrl: '' },
  { id: 'n3',  title: '3-Min Flow',             type: 'reel',     platforms: ['Instagram'],                                  funnel: 'TOFU', status: 'posted',    scheduledDate: '2026-03-27', caption: 'If I only had 3 minutes a day to protect my joints…', hashtags: '#mobility #joints #fitness', notes: 'Reel TOFU – 3 min mobility routine', assignedTo: 'Kyle', notionUrl: '' },
  { id: 'n4',  title: 'Story: BTS Logistics',   type: 'story',    platforms: ['Instagram'],                                  funnel: '',     status: 'posted',    scheduledDate: '2026-03-28', caption: 'Behind the scenes of shipping & fulfillment 📦', hashtags: '', notes: 'Operations BTS story', assignedTo: 'Kyle', notionUrl: '' },
  { id: 'n5',  title: 'One Day vs 100 Days',    type: 'tiktok',   platforms: ['TikTok'],                                     funnel: 'TOFU', status: 'posted',    scheduledDate: '2026-03-29', caption: 'This is why you\'re not seeing results.', hashtags: '#consistency #fitness #mindset', notes: 'Reel TOFU – consistency over quick wins', assignedTo: 'Kyle', notionUrl: '' },
  { id: 'n6',  title: 'Story: Supplement Lab',  type: 'story',    platforms: ['Instagram'],                                  funnel: '',     status: 'posted',    scheduledDate: '2026-03-31', caption: 'Today\'s lab notes: Optimal creatine dosing. 🔬', hashtags: '', notes: 'Educational story on dosing', assignedTo: 'Kyle', notionUrl: '' },
  { id: 'n7',  title: 'Story: The Choice',      type: 'story',    platforms: ['Instagram'],                                  funnel: '',     status: 'posted',    scheduledDate: '2026-04-01', caption: 'Every day is a choice. Make it count. ⚡', hashtags: '', notes: 'Mindset story', assignedTo: 'Kyle', notionUrl: '' },
  { id: 'n8',  title: 'Story: BTS Building II', type: 'story',    platforms: ['Instagram'],                                  funnel: '',     status: 'posted',    scheduledDate: '2026-04-02', caption: 'Building in public. 📈', hashtags: '', notes: 'BTS story series part 2', assignedTo: 'Kyle', notionUrl: '' },
  { id: 'n9',  title: 'Story: BTS Growth',      type: 'story',    platforms: ['Instagram'],                                  funnel: '',     status: 'scheduled', scheduledDate: '2026-04-04', caption: 'Growth is built in the boring days 📈', hashtags: '', notes: 'Growth mindset story', assignedTo: 'Kyle', notionUrl: '' },
  { id: 'n10', title: 'Why I Started MAXD',     type: 'reel',     platforms: ['TikTok', 'Instagram'],                        funnel: 'MOFU', status: 'editing',   scheduledDate: '2026-04-06', caption: '', hashtags: '#maxd #founder #creatinegummies', notes: 'Founder story – personal brand angle', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c80b5b68ae611964c0c65' },
  { id: 'n11', title: 'Story: Mobility Tip',    type: 'story',    platforms: ['Instagram'],                                  funnel: '',     status: 'ready',     scheduledDate: '2026-04-07', caption: 'Your mobility tip for today 🔥', hashtags: '', notes: 'Quick mobility tip story', assignedTo: 'Kyle', notionUrl: '' },
  { id: 'n12', title: 'Creatine: 20yr Science', type: 'carousel', platforms: ['Instagram'],                                  funnel: 'TOFU', status: 'ready',     scheduledDate: '2026-04-08', caption: '"Creatine isn\'t a hack. It\'s 20 years of proven science."', hashtags: '#science #creatine #evidence', notes: '5-slide educational carousel on creatine research', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c80eeb563c5c3fa10db5c' },
  { id: 'n13', title: 'Execution Consistency',  type: 'tiktok',   platforms: ['TikTok'],                                     funnel: 'TOFU', status: 'scripting', scheduledDate: '2026-04-10', caption: '', hashtags: '#consistency #discipline', notes: 'TOFU – execution over motivation', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c8049928ef1c9f5922ca6' },
  { id: 'n14', title: 'Longevity Framework',    type: 'reel',     platforms: ['Instagram', 'TikTok'],                        funnel: 'MOFU', status: 'scripting', scheduledDate: '2026-04-13', caption: '', hashtags: '#longevity #health #creatine', notes: 'MOFU – longevity angle for creatine', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c80d785a2e02de7481fb8' },
  { id: 'n15', title: 'Daily Choice: Gummies',  type: 'short',    platforms: ['YouTube'],                                    funnel: 'BOFU', status: 'scripting', scheduledDate: '2026-04-15', caption: '', hashtags: '#creatinegummies #maxd', notes: 'YT Short BOFU – daily routine integration', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c80f1b658fc5dd198c6a4' },
  { id: 'n16', title: 'Performance Choice',     type: 'reel',     platforms: ['TikTok'],                                     funnel: 'MOFU', status: 'idea',      scheduledDate: '2026-04-17', caption: '', hashtags: '', notes: 'MOFU angle – performance vs comfort. Visual: Pointing at sugar drink vs. MAXD.', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c8017b1b9fdaca9b123ba' },
  { id: 'n17', title: 'Wealth vs Time',         type: 'tiktok',   platforms: ['TikTok'],                                     funnel: 'TOFU', status: 'idea',      scheduledDate: '2026-04-19', caption: '', hashtags: '', notes: 'TOFU – time as the most valuable resource', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c80079c22c96a95acd8b9' },
  { id: 'n18', title: 'Story: BTS Growth II',   type: 'story',    platforms: ['Instagram'],                                  funnel: '',     status: 'idea',      scheduledDate: '2026-04-18', caption: '', hashtags: '', notes: 'BTS growth story round 2', assignedTo: 'Kyle', notionUrl: '' },
  { id: 'n19', title: 'One Day at a Time',      type: 'reel',     platforms: ['Instagram'],                                  funnel: 'TOFU', status: 'idea',      scheduledDate: '2026-04-21', caption: '', hashtags: '#mindset #progress', notes: 'TOFU consistency series', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c807aabfcdb02c4bf6226' },
  { id: 'n20', title: 'The Cost of Waiting',    type: 'tiktok',   platforms: ['TikTok'],                                     funnel: 'MOFU', status: 'idea',      scheduledDate: '2026-04-23', caption: '', hashtags: '', notes: 'MOFU urgency messaging', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c8022bd94fd659b1c400e' },
  { id: 'n21', title: 'Time-Value Matrix',      type: 'carousel', platforms: ['Instagram'],                                  funnel: 'TOFU', status: 'idea',      scheduledDate: '2026-04-24', caption: '', hashtags: '', notes: 'Educational carousel – time vs value framework', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c80089886f9b32e26acb5' },
  { id: 'n22', title: 'Full Day of Output',     type: 'story',    platforms: ['Instagram'],                                  funnel: '',     status: 'idea',      scheduledDate: '2026-04-25', caption: '', hashtags: '', notes: 'Day-in-the-life story sequence', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c8091ade4eb53fa408f58' },
  { id: 'n23', title: 'The 10/10 Operator',     type: 'reel',     platforms: ['TikTok'],                                     funnel: 'MOFU', status: 'idea',      scheduledDate: '2026-04-27', caption: '', hashtags: '#operator #entrepreneur', notes: 'MOFU founder/operator identity angle', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c80aea630c057331d4599' },
  { id: 'n24', title: 'Founder Story Post',     type: 'post',     platforms: ['Instagram'],                                  funnel: 'MOFU', status: 'idea',      scheduledDate: '2026-04-28', caption: '', hashtags: '#founder #maxd', notes: 'Static post – founder story caption', assignedTo: 'Kyle', notionUrl: '' },
  { id: 'n25', title: 'Creatine Myths',         type: 'carousel', platforms: ['Instagram'],                                  funnel: 'TOFU', status: 'idea',      scheduledDate: '2026-04-30', caption: 'You\'ve been lied to about creatine…', hashtags: '#myth #creatine #science', notes: 'Debunking carousel – 6 slides', assignedTo: 'Kyle', notionUrl: '' },
  { id: 'n26', title: 'The Builder Identity',   type: 'reel',     platforms: ['Instagram', 'TikTok', 'YouTube', 'Facebook'], funnel: 'TOFU', status: 'ready',     scheduledDate: '2026-03-30', caption: 'Documenting the build of @trymaxd. Join the mission.', hashtags: '', notes: 'Needs B-roll, Voiceover. Visual: 5:57 AM dark room. Hook: "I\'m not the leader yet. I\'m the guy earning the right."', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c8050b38cd1a8c0d3e8df' },
  { id: 'n27', title: 'Story: Q&A Build',       type: 'story',    platforms: ['Instagram', 'Facebook'],                      funnel: '',     status: 'ready',     scheduledDate: '2026-03-31', caption: 'Ask me anything about building MAXD from 0.', hashtags: '', notes: 'Needs B-roll. Visual: Selfie with Q&A sticker.', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c80d1a2f0c830a1fde5a8' },
  { id: 'n28', title: 'Weekly Execution Review',type: 'post',     platforms: ['Instagram', 'Facebook'],                      funnel: '',     status: 'ready',     scheduledDate: '2026-04-04', caption: 'The week is won on Sunday. Lead through execution.', hashtags: '', notes: 'Needs Product shot, B-roll. Written hook: "Sunday Wins. ⏳"', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c80418f5ad8e1578b17c5' },
  { id: 'n29', title: 'Performance Standard',   type: 'post',     platforms: ['Instagram', 'Facebook'],                      funnel: '',     status: 'ready',     scheduledDate: '2026-04-11', caption: 'Earning my place by outworking yesterday\'s version.', hashtags: '', notes: 'Needs Gym footage, Product shot. Visual: Flat lay of gym gear/MAXD.', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c80ba8028ee823dc569e6' },
  { id: 'n30', title: 'Your Circle Standard',   type: 'reel',     platforms: ['Instagram', 'TikTok', 'YouTube', 'Facebook'], funnel: 'TOFU', status: 'ready',     scheduledDate: '2026-04-13', caption: 'Your circle sets your standard. Audit your circle.', hashtags: '', notes: 'Needs Gym footage, B-roll. Hook: "Trees don\'t hang around with the grass. Be the tree."', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c8068a638e7700346e2b3' },
  { id: 'n31', title: 'The Builder Result',     type: 'post',     platforms: ['Instagram', 'Facebook'],                      funnel: '',     status: 'ready',     scheduledDate: '2026-04-18', caption: 'We aren\'t trying to entertain; we are trying to lead.', hashtags: '', notes: 'Needs Gym footage. Visual: High-action training shot. Written hook: "Lead Through Execution."', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c80bf97d8edbba56eb769' },
  { id: 'n32', title: 'Final Builder Check',    type: 'post',     platforms: ['Instagram', 'Facebook'],                      funnel: '',     status: 'ready',     scheduledDate: '2026-04-23', caption: 'What you\'re not changing, you\'re choosing.', hashtags: '', notes: 'Needs B-roll, Product shot. Visual: MacBook shot in a moody setting.', assignedTo: 'Kyle', notionUrl: 'https://www.notion.so/32d0a7acad0c80dabc3fe988fe2b329a' },
]

// ── Small UI helpers ──────────────────────────────────────────────────────────
function TypeBadge({ type, small }) {
  const t = CONTENT_TYPES[type] || CONTENT_TYPES.post
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: small ? 10 : 11, fontWeight: 700, letterSpacing: '0.04em',
      padding: small ? '2px 6px' : '3px 8px', borderRadius: 20,
      background: `${t.color}18`, color: t.color,
    }}>
      {t.icon} {t.label}
    </span>
  )
}

function FunnelDot({ funnel }) {
  if (!funnel) return null
  const colors = { TOFU: '#2563EB', MOFU: '#D97706', BOFU: '#059669' }
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
      padding: '2px 6px', borderRadius: 20,
      background: `${colors[funnel]}18`, color: colors[funnel],
    }}>{funnel}</span>
  )
}

function UploadDot({ status }) {
  if (!status) return null
  const u = uploadInfo(status)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 9, fontWeight: 700,
      padding: '1px 6px', borderRadius: 20,
      background: u.bg, color: u.color,
    }}>
      {status === 'approved' ? '✓' : '↑'} {u.label}
    </span>
  )
}

function StageBadge({ status, small }) {
  const s = stageInfo(status)
  return (
    <span style={{
      fontSize: small ? 9 : 10, fontWeight: 700, letterSpacing: '0.04em',
      padding: small ? '2px 6px' : '3px 8px', borderRadius: 20,
      background: s.bg, color: s.color,
    }}>{s.label}</span>
  )
}

// ── Pipeline Bar ──────────────────────────────────────────────────────────────
function PipelineBar({ items, activeStatus, onStageClick }) {
  const total = items.length || 1
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: 3, borderRadius: 8, overflow: 'hidden', height: 8, marginBottom: 8 }}>
        {STAGES.map(s => {
          const count = items.filter(i => i.status === s.key).length
          const pct = (count / total) * 100
          return (
            <div key={s.key} title={`${s.label}: ${count}`}
              onClick={() => onStageClick(s.key)}
              style={{
                flex: `0 0 ${Math.max(pct, count > 0 ? 2 : 0)}%`,
                background: count > 0 ? s.color : 'transparent',
                cursor: 'pointer',
                opacity: activeStatus && activeStatus !== s.key ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }} />
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {STAGES.map(s => {
          const count = items.filter(i => i.status === s.key).length
          const isActive = activeStatus === s.key
          return (
            <button key={s.key} onClick={() => onStageClick(s.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${isActive ? s.color : 'var(--border)'}`,
                background: isActive ? s.bg : 'var(--surface-2)',
                color: isActive ? s.color : 'var(--text-muted)',
                transition: 'all 0.12s',
              }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: count > 0 ? s.color : 'var(--border)',
                flexShrink: 0,
              }} />
              {s.label}
              <span style={{
                background: isActive ? s.color : 'var(--surface-3)',
                color: isActive ? 'var(--white)' : 'var(--text-muted)',
                borderRadius: 20, padding: '0 6px', fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: 'center',
              }}>{count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────
const EMPTY_ITEM = {
  title: '', type: 'reel', platforms: [], funnel: 'TOFU',
  status: 'idea', scheduledDate: '', caption: '', hashtags: '', notes: '', assignedTo: 'Kyle',
  mediaUrl: '', uploadStatus: '', mediaNotes: '', notionUrl: '',
}

function ContentModal({ item, onClose, onSave, onDelete, prefillDate }) {
  const initial = item
    ? { ...EMPTY_ITEM, platforms: getItemPlatforms(item), ...item }
    : { ...EMPTY_ITEM, scheduledDate: prefillDate || '' }
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isNew = !item?.id

  const togglePlatform = (p) => {
    const next = form.platforms.includes(p) ? form.platforms.filter(x => x !== p) : [...form.platforms, p]
    set('platforms', next)
  }

  const handleSave = () => {
    const now = new Date().toISOString().split('T')[0]
    onSave({ ...form, id: form.id || newId(), createdAt: form.createdAt || now, updatedAt: now })
    onClose()
  }

  const field = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-2)', outline: 'none', fontFamily: 'var(--font-body)' }
  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, letterSpacing: '0.04em' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 580, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ background: 'var(--navy)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--white)', fontSize: 14, letterSpacing: '0.05em' }}>{isNew ? 'ADD CONTENT' : 'EDIT CONTENT'}</span>
            {form.notionUrl && (
              <a href={form.notionUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', color: 'var(--white)', textDecoration: 'none', fontWeight: 600 }}>
                ◻ Notion ↗
              </a>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>

          {/* Phase 1: Scripting */}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'var(--red)', color: 'var(--white)', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>1</span>
            SCRIPTING
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>TITLE</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Content title…" style={field} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: 14 }}>
            {[
              { key: 'type',   label: 'TYPE',   opts: Object.entries(CONTENT_TYPES).map(([v, t]) => ({ value: v, label: `${t.icon} ${t.label}` })) },
              { key: 'funnel', label: 'FUNNEL', opts: [{ value: '', label: '—' }, { value: 'TOFU', label: 'TOFU — Awareness' }, { value: 'MOFU', label: 'MOFU — Consideration' }, { value: 'BOFU', label: 'BOFU — Conversion' }] },
              { key: 'status', label: 'STATUS', opts: STAGES.map(s => ({ value: s.key, label: s.label })) },
            ].map(f => (
              <div key={f.key}>
                <label style={lbl}>{f.label}</label>
                <select value={form[f.key]} onChange={e => set(f.key, e.target.value)} style={{ ...field }}>
                  {f.opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label style={lbl}>SHOOT DATE</label>
              <input type="date" value={form.scheduledDate || ''} onChange={e => set('scheduledDate', e.target.value)} style={field} />
            </div>
          </div>

          {[
            { key: 'caption',  label: 'CAPTION',  rows: 2, placeholder: 'Write your caption…' },
            { key: 'hashtags', label: 'HASHTAGS', rows: 1, placeholder: '#creatine #maxd #fitness' },
            { key: 'notes',    label: 'NOTES',    rows: 2, placeholder: 'Internal notes, visual direction…' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={lbl}>{f.label}</label>
              <textarea value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} rows={f.rows} placeholder={f.placeholder} style={{ ...field, resize: 'vertical' }} />
            </div>
          ))}

          {/* Phase 2: Upload */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#D97706', color: 'var(--white)', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>2</span>
              UPLOAD CONTENT
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>MEDIA LINK</label>
              <input value={form.mediaUrl || ''} onChange={e => set('mediaUrl', e.target.value)} placeholder="Paste Google Drive, Dropbox, Frame.io link…" style={field} />
              {form.mediaUrl && (
                <a href={form.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#2563EB', textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
                  📎 Open uploaded file ↗
                </a>
              )}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ ...lbl, marginBottom: 8 }}>UPLOAD STATUS</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {UPLOAD_STATUSES.map(s => (
                  <button key={s.key} onClick={() => set('uploadStatus', s.key)} style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: `2px solid ${form.uploadStatus === s.key ? s.color : 'var(--border-mid)'}`,
                    background: form.uploadStatus === s.key ? s.bg : 'var(--surface-2)',
                    color: form.uploadStatus === s.key ? s.color : 'var(--text-muted)',
                    transition: 'all 0.12s',
                  }}>{s.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>UPLOAD NOTES</label>
              <textarea value={form.mediaNotes || ''} onChange={e => set('mediaNotes', e.target.value)} rows={2}
                placeholder="e.g. Final cut approved, waiting on thumbnail…" style={{ ...field, resize: 'vertical' }} />
            </div>
          </div>

          {/* Phase 3: Schedule */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#059669', color: 'var(--white)', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>3</span>
              SCHEDULE
            </div>
            <label style={{ ...lbl, marginBottom: 8 }}>PLATFORMS <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— select all that apply</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {ALL_PLATFORMS.map(p => {
                const sel = form.platforms.includes(p)
                return (
                  <button key={p} onClick={() => togglePlatform(p)} style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `2px solid ${sel ? 'var(--navy)' : 'var(--border-mid)'}`,
                    background: sel ? 'var(--navy)' : 'var(--surface-2)',
                    color: sel ? 'var(--white)' : 'var(--text-secondary)',
                    transition: 'all 0.12s',
                  }}>{p}</button>
                )
              })}
            </div>
            {form.scheduledDate && (
              <a href={buildGCalUrl(form)} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
                color: '#1A73E8', textDecoration: 'none', padding: '7px 14px', borderRadius: 8,
                border: '1.5px solid #BFDBFE', background: '#EFF6FF',
              }}>
                📅 Open in Google Calendar ↗
              </a>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--surface-3)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            {!isNew && <button onClick={() => { onDelete(form.id); onClose() }}
              style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px solid #fca5a5', background: 'var(--surface-2)', color: '#dc2626', cursor: 'pointer' }}>Delete</button>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border-mid)', background: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={!form.title.trim()}
              style={{ fontSize: 12, padding: '7px 20px', borderRadius: 6, border: 'none', background: form.title.trim() ? 'var(--navy)' : 'var(--border)', color: 'var(--white)', cursor: form.title.trim() ? 'pointer' : 'default', fontWeight: 700 }}>
              {isNew ? 'Add' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Day detail modal ──────────────────────────────────────────────────────────
function DayModal({ year, month, day, items, onClose, onEditItem, onAddToDay }) {
  const d = new Date(year, month, day)
  const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 500, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'var(--navy)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', color: 'var(--white)', fontSize: 14, letterSpacing: '0.05em' }}>{label.toUpperCase()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{items.length} item{items.length !== 1 ? 's' : ''} scheduled</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: 13 }}>
              Nothing scheduled for this day yet.
            </div>
          )}
          {items.map(item => {
            const t = CONTENT_TYPES[item.type] || CONTENT_TYPES.post
            const s = stageInfo(item.status)
            const platforms = getItemPlatforms(item)
            const gcalUrl = buildGCalUrl(item)
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, border: '1px solid var(--border)', borderLeft: `3px solid ${s.color}`,
                marginBottom: 8, background: 'var(--surface-2)',
              }}>
                <div onClick={() => { onEditItem(item); onClose() }} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer', minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: `${t.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{t.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                      <TypeBadge type={item.type} small />
                      {platforms.slice(0, 2).map(p => (
                        <span key={p} style={{ fontSize: 10, color: '#2563EB', background: '#EFF6FF', padding: '1px 6px', borderRadius: 20, fontWeight: 600 }}>{p}</span>
                      ))}
                      {item.uploadStatus && <UploadDot status={item.uploadStatus} />}
                      <FunnelDot funnel={item.funnel} />
                    </div>
                  </div>
                  <StageBadge status={item.status} small />
                </div>
                {gcalUrl && (
                  <a href={gcalUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Add to Google Calendar"
                    style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8, background: '#EFF6FF', color: '#1A73E8', border: '1px solid #BFDBFE', textDecoration: 'none', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    📅 GCal
                  </a>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={onAddToDay} style={{
            width: '100%', padding: '10px', borderRadius: 8, border: '2px dashed var(--border-mid)',
            background: 'var(--surface-2)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
            + Add to this day
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Calendar view (month) ─────────────────────────────────────────────────────
function CalendarView({ items, onEdit, onAdd, month, onMonthChange, onToday }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const year = month.getFullYear()
  const mon  = month.getMonth()
  const firstDay = new Date(year, mon, 1).getDay()
  const daysInMonth = new Date(year, mon + 1, 0).getDate()
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const byDate = {}
  items.forEach(item => {
    if (!item.scheduledDate) return
    const [y, m, d] = item.scheduledDate.split('-').map(Number)
    if (y === year && m - 1 === mon) {
      if (!byDate[d]) byDate[d] = []
      byDate[d].push(item)
    }
  })

  const today = new Date()
  const isToday = d => today.getFullYear() === year && today.getMonth() === mon && today.getDate() === d
  const selectedDateStr = selectedDay
    ? `${year}-${String(mon + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : null

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: 12 }}>
        <button onClick={() => onMonthChange(-1)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-mid)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 16, color: 'var(--navy)' }}>‹</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, color: 'var(--navy)', letterSpacing: '0.06em' }}>
            {month.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}
          </span>
          <button onClick={onToday}
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-mid)', background: 'var(--surface-3)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
            Today
          </button>
        </div>
        <button onClick={() => onMonthChange(1)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-mid)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 16, color: 'var(--navy)' }}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textAlign: 'center', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const dayItems = byDate[day] || []
          const isT = isToday(day)
          return (
            <div key={day} onClick={() => setSelectedDay(day)} style={{
              minHeight: 88, borderRadius: 8, padding: '6px',
              background: isT ? '#EFF6FF' : 'var(--surface-2)',
              border: `1px solid ${isT ? '#BFDBFE' : 'var(--border)'}`,
              cursor: 'pointer', transition: 'box-shadow 0.12s',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
              <div style={{ fontSize: 11, fontWeight: isT ? 700 : 500, color: isT ? '#2563EB' : 'var(--text-muted)', marginBottom: 4 }}>{day}</div>
              {dayItems.slice(0, 3).map(item => {
                const s = stageInfo(item.status)
                const t = CONTENT_TYPES[item.type] || CONTENT_TYPES.post
                return (
                  <div key={item.id} title={item.title} style={{
                    fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 4,
                    background: s.bg, color: s.color, marginBottom: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 3,
                    borderLeft: `2px solid ${s.color}`,
                  }}>
                    {t.icon} {item.title}
                  </div>
                )
              })}
              {dayItems.length > 3 && <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>+{dayItems.length - 3} more</div>}
              {dayItems.length === 0 && <div style={{ fontSize: 9, color: 'var(--border)', textAlign: 'center', marginTop: 6 }}>+</div>}
            </div>
          )
        })}
      </div>

      {selectedDay && (
        <DayModal
          year={year} month={mon} day={selectedDay}
          items={byDate[selectedDay] || []}
          onClose={() => setSelectedDay(null)}
          onEditItem={item => { setSelectedDay(null); onEdit(item) }}
          onAddToDay={() => { setSelectedDay(null); onAdd(selectedDateStr) }}
        />
      )}
    </div>
  )
}

// ── Week view ─────────────────────────────────────────────────────────────────
function getWeekStart(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function WeekView({ items, onEdit, onAdd, weekStart, onWeekChange }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  const byDateStr = {}
  items.forEach(item => {
    if (item.scheduledDate) {
      if (!byDateStr[item.scheduledDate]) byDateStr[item.scheduledDate] = []
      byDateStr[item.scheduledDate].push(item)
    }
  })

  const fmtWeek = `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div>
      {/* Week nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button onClick={() => onWeekChange(-1)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-mid)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 16, color: 'var(--navy)' }}>‹</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--navy)', letterSpacing: '0.05em' }}>
            {fmtWeek.toUpperCase()}
          </span>
          <button onClick={() => onWeekChange(0)}
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-mid)', background: 'var(--surface-3)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
            This Week
          </button>
        </div>
        <button onClick={() => onWeekChange(1)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-mid)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 16, color: 'var(--navy)' }}>›</button>
      </div>

      {/* Day columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {days.map(day => {
          const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
          const dayItems = byDateStr[dateStr] || []
          const isT = day.getTime() === today.getTime()
          const dayLabel = day.toLocaleDateString('en-US', { weekday: 'short' })
          const dayNum = day.getDate()

          return (
            <div key={dateStr} style={{ minHeight: 140 }}>
              {/* Day header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 8px', borderRadius: '6px 6px 0 0',
                background: isT ? '#2563EB' : 'var(--surface-3)',
                marginBottom: 4,
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: isT ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', letterSpacing: '0.06em' }}>{dayLabel}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: isT ? 'var(--white)' : 'var(--text-primary)', lineHeight: 1 }}>{dayNum}</span>
              </div>

              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dayItems.map(item => {
                  const s = stageInfo(item.status)
                  const t = CONTENT_TYPES[item.type] || CONTENT_TYPES.post
                  const platforms = getItemPlatforms(item)
                  return (
                    <div key={item.id} onClick={() => onEdit(item)} style={{
                      padding: '7px 9px', borderRadius: 6, cursor: 'pointer',
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderLeft: `3px solid ${s.color}`,
                      transition: 'box-shadow 0.12s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.icon} {item.title}
                      </div>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10, background: s.bg, color: s.color }}>{s.label}</span>
                        {item.funnel && <FunnelDot funnel={item.funnel} />}
                        {platforms[0] && <span style={{ fontSize: 9, color: '#2563EB', background: '#EFF6FF', padding: '1px 5px', borderRadius: 10, fontWeight: 600 }}>{platforms[0]}</span>}
                      </div>
                    </div>
                  )
                })}
                {/* Add button */}
                <button onClick={() => onAdd(dateStr)} style={{
                  padding: '5px', borderRadius: 6, border: '1px dashed var(--border-mid)',
                  background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Kanban view ───────────────────────────────────────────────────────────────
function KanbanCard({ item, onEdit, onAdvance, isLast }) {
  const t = CONTENT_TYPES[item.type] || CONTENT_TYPES.post
  const nextStage = STAGES[STAGES.findIndex(s => s.key === item.status) + 1]
  const platforms = getItemPlatforms(item)
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)', borderLeft: `3px solid ${t.color}`, padding: '10px 12px', marginBottom: 6, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
      <div onClick={() => onEdit(item)}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 5 }}>{item.title}</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <TypeBadge type={item.type} small />
          <FunnelDot funnel={item.funnel} />
          {platforms.slice(0, 2).map(p => (
            <span key={p} style={{ fontSize: 9, color: '#2563EB', background: '#EFF6FF', padding: '1px 5px', borderRadius: 20, fontWeight: 600 }}>{p}</span>
          ))}
          {item.uploadStatus && <UploadDot status={item.uploadStatus} />}
          {item.scheduledDate && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {new Date(item.scheduledDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>}
        </div>
      </div>
      {!isLast && nextStage && (
        <button onClick={e => { e.stopPropagation(); onAdvance(item.id) }}
          style={{ marginTop: 8, width: '100%', fontSize: 10, padding: '4px', borderRadius: 4, border: `1px solid ${nextStage.color}`, background: nextStage.bg, color: nextStage.color, cursor: 'pointer', fontWeight: 600 }}>
          → {nextStage.label}
        </button>
      )}
    </div>
  )
}

function KanbanView({ items, onEdit, onAdvance, typeFilter }) {
  const showStages = STAGES.filter(s => s.key !== 'filming' || typeFilter === 'all' || CONTENT_TYPES[typeFilter]?.needsFilming)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${showStages.length}, minmax(160px, 1fr))`, gap: 10, overflowX: 'auto' }}>
      {showStages.map(stage => {
        const stageItems = items.filter(i => i.status === stage.key)
        return (
          <div key={stage.key}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '6px 10px', borderRadius: 6, background: stage.bg }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: stage.color, letterSpacing: '0.05em' }}>{stage.label.toUpperCase()}</span>
              <span style={{ fontSize: 11, fontWeight: 700, background: stage.color, color: 'var(--white)', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{stageItems.length}</span>
            </div>
            <div style={{ minHeight: 60 }}>
              {stageItems.map(item => <KanbanCard key={item.id} item={item} onEdit={onEdit} onAdvance={onAdvance} isLast={stage.key === 'posted'} />)}
              {stageItems.length === 0 && <div style={{ fontSize: 11, color: 'var(--border-mid)', textAlign: 'center', padding: '1rem 0', border: '1px dashed var(--border)', borderRadius: 6 }}>Empty</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── List view ─────────────────────────────────────────────────────────────────
function ListView({ items, onEdit, onAdvance }) {
  const [sort, setSort]     = useState('date')
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (key) => {
    if (sort === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let va, vb
      if (sort === 'date')   { va = a.scheduledDate || ''; vb = b.scheduledDate || '' }
      if (sort === 'title')  { va = a.title.toLowerCase(); vb = b.title.toLowerCase() }
      if (sort === 'type')   { va = a.type; vb = b.type }
      if (sort === 'status') { va = STAGES.findIndex(s => s.key === a.status); vb = STAGES.findIndex(s => s.key === b.status) }
      if (sort === 'funnel') { va = a.funnel || ''; vb = b.funnel || '' }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [items, sort, sortDir])

  const SortTh = ({ col, label }) => (
    <span onClick={() => handleSort(col)} style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {label}
      {sort === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </span>
  )

  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 120px 60px 85px 100px 80px 100px', padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
        <SortTh col="title"  label="TITLE" />
        <SortTh col="type"   label="TYPE" />
        <span>PLATFORMS</span>
        <SortTh col="funnel" label="FUNNEL" />
        <SortTh col="date"   label="DATE" />
        <span>UPLOAD</span>
        <SortTh col="status" label="STATUS" />
        <span>ADVANCE</span>
      </div>
      {sorted.map((item, i) => {
        const s = stageInfo(item.status)
        const platforms = getItemPlatforms(item)
        const nextStage = STAGES[STAGES.findIndex(st => st.key === item.status) + 1]
        return (
          <div key={item.id}
            style={{ display: 'grid', gridTemplateColumns: '1fr 110px 120px 60px 85px 100px 80px 100px', padding: '11px 16px', alignItems: 'center', borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--surface-2)', transition: 'background 0.1s', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onClick={() => onEdit(item)}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {item.title}
                {item.notionUrl && <span style={{ fontSize: 9, color: '#64748B', background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 10 }}>N</span>}
              </div>
              {item.notes && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{item.notes.slice(0, 50)}{item.notes.length > 50 ? '…' : ''}</div>}
            </div>
            <TypeBadge type={item.type} small />
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {platforms.slice(0, 2).map(p => (
                <span key={p} style={{ fontSize: 9, color: '#2563EB', background: '#EFF6FF', padding: '1px 5px', borderRadius: 20, fontWeight: 600 }}>{p}</span>
              ))}
              {platforms.length > 2 && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{platforms.length - 2}</span>}
            </div>
            <FunnelDot funnel={item.funnel} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {item.scheduledDate ? new Date(item.scheduledDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
            </span>
            <UploadDot status={item.uploadStatus} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
            <div onClick={e => e.stopPropagation()}>
              {nextStage ? (
                <button onClick={() => onAdvance(item.id)} style={{
                  fontSize: 10, padding: '4px 8px', borderRadius: 6,
                  border: `1px solid ${nextStage.color}`, background: nextStage.bg, color: nextStage.color,
                  cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
                }}>→ {nextStage.label}</button>
              ) : (
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>—</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Content() {
  const [items, setItems]           = useState(loadContent)
  const [view, setView]             = useState('calendar')
  const [typeFilter, setType]       = useState('all')
  const [funnelFilter, setFunnel]   = useState('all')
  const [statusFilter, setStatus]   = useState('all')
  const [search, setSearch]         = useState('')
  const [modal, setModal]           = useState(null)
  const [prefillDate, setPrefillDate] = useState('')
  const [calMonth, setCalMonth]     = useState(new Date(2026, 3, 1))
  const [weekStart, setWeekStart]   = useState(getWeekStart(new Date()))

  const persist = (updated) => { saveContent(updated); setItems(updated) }

  const handleSave = (item) => {
    const idx = items.findIndex(i => i.id === item.id)
    persist(idx >= 0 ? items.map(i => i.id === item.id ? item : i) : [item, ...items])
  }
  const handleDelete  = (id) => persist(items.filter(i => i.id !== id))
  const handleAdvance = (id) => {
    persist(items.map(i => {
      if (i.id !== id) return i
      const idx = STAGES.findIndex(s => s.key === i.status)
      const next = STAGES[idx + 1]
      return next ? { ...i, status: next.key } : i
    }))
  }

  const openAddWithDate = (date) => { setPrefillDate(date || ''); setModal('new') }

  const handleToday = () => {
    const now = new Date()
    setCalMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setWeekStart(getWeekStart(now))
  }

  const handleWeekChange = (dir) => {
    if (dir === 0) {
      setWeekStart(getWeekStart(new Date()))
    } else {
      setWeekStart(prev => {
        const d = new Date(prev)
        d.setDate(d.getDate() + dir * 7)
        return d
      })
    }
  }

  const handleStageClick = (key) => {
    setStatus(prev => prev === key ? 'all' : key)
  }

  // Filtering
  const filtered = useMemo(() => {
    return items.filter(item => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false
      if (funnelFilter !== 'all' && item.funnel !== funnelFilter) return false
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [items, typeFilter, funnelFilter, statusFilter, search])

  // Stats
  const posted    = items.filter(i => i.status === 'posted').length
  const scheduled = items.filter(i => i.status === 'scheduled').length
  const inProd    = items.filter(i => ['scripting','ready','filming','editing'].includes(i.status)).length
  const ideas     = items.filter(i => i.status === 'idea').length
  const uploaded  = items.filter(i => i.uploadStatus === 'uploaded' || i.uploadStatus === 'approved').length

  const typeOpts = [
    { key: 'all', label: 'All' },
    ...Object.entries(CONTENT_TYPES).map(([k, v]) => ({ key: k, label: `${v.icon} ${v.label}` })).filter(x => items.some(i => i.type === x.key)),
  ]

  return (
    <div>
      <PageHeader title="Content Calendar" subtitle="Plan, schedule and track your content pipeline">
        <button onClick={() => { setPrefillDate(''); setModal('new') }}
          style={{ fontSize: 12, padding: '8px 16px', borderRadius: 'var(--radius)', background: 'var(--red)', border: 'none', color: 'var(--white)', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.04em' }}>
          + ADD CONTENT
        </button>
      </PageHeader>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total',          value: items.length, sub: 'all content',   color: 'var(--navy)' },
          { label: 'Posted',         value: posted,       sub: 'published',     color: '#065F46' },
          { label: 'Scheduled',      value: scheduled,    sub: 'queued up',     color: '#059669' },
          { label: 'In Production',  value: inProd,       sub: 'being created', color: '#2563EB' },
          { label: 'Media Uploaded', value: uploaded,     sub: 'files ready',   color: '#D97706' },
          { label: 'Ideas',          value: ideas,        sub: 'in pipeline',   color: '#94A3B8' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Pipeline bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 10 }}>STATUS PIPELINE {statusFilter !== 'all' && <span style={{ color: 'var(--red)', marginLeft: 8 }}>— filtered · <button onClick={() => setStatus('all')} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: 0 }}>Clear</button></span>}</div>
        <PipelineBar items={items} activeStatus={statusFilter !== 'all' ? statusFilter : null} onStageClick={handleStageClick} />
      </div>

      {/* Filters + view toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {/* Search + funnel */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search content…"
                style={{ padding: '6px 10px 6px 28px', border: '1px solid var(--border-mid)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)', background: 'var(--surface-2)', outline: 'none', width: 200 }}
              />
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none' }}>⌕</span>
              {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>}
            </div>
            {/* Funnel filter */}
            {['all', 'TOFU', 'MOFU', 'BOFU'].map(f => {
              const colors = { TOFU: '#2563EB', MOFU: '#D97706', BOFU: '#059669' }
              const isActive = funnelFilter === f
              return (
                <button key={f} onClick={() => setFunnel(f)} style={{
                  fontSize: 11, padding: '5px 11px', borderRadius: 20, fontWeight: 600,
                  border: `1.5px solid ${isActive && f !== 'all' ? colors[f] : isActive ? 'var(--navy)' : 'var(--border)'}`,
                  background: isActive && f !== 'all' ? `${colors[f]}15` : isActive ? 'var(--navy)' : 'var(--surface-2)',
                  color: isActive && f !== 'all' ? colors[f] : isActive ? 'var(--white)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}>{f === 'all' ? 'All Funnels' : f}</button>
              )
            })}
          </div>
          {/* Type filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {typeOpts.map(opt => (
              <button key={opt.key} onClick={() => setType(opt.key)}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600,
                  border: `1.5px solid ${typeFilter === opt.key ? 'var(--navy)' : 'var(--border)'}`,
                  background: typeFilter === opt.key ? 'var(--navy)' : 'var(--surface-2)',
                  color: typeFilter === opt.key ? 'var(--white)' : 'var(--text-muted)', cursor: 'pointer' }}>
                {opt.label}
              </button>
            ))}
            {(search || typeFilter !== 'all' || funnelFilter !== 'all' || statusFilter !== 'all') && (
              <button onClick={() => { setSearch(''); setType('all'); setFunnel('all'); setStatus('all') }}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600, border: '1.5px solid var(--red)', background: '#FDE8EE', color: 'var(--red)', cursor: 'pointer' }}>
                ✕ Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 8, padding: 3, gap: 2, flexShrink: 0 }}>
          {[
            { key: 'calendar', icon: '◫', label: 'Month' },
            { key: 'week',     icon: '▤',  label: 'Week'  },
            { key: 'kanban',   icon: '⊞',  label: 'Board' },
            { key: 'list',     icon: '≡',  label: 'List'  },
          ].map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: view === v.key ? 'var(--surface-2)' : 'transparent', border: 'none', cursor: 'pointer',
                color: view === v.key ? 'var(--navy)' : 'var(--text-muted)',
                boxShadow: view === v.key ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count when filtered */}
      {(search || typeFilter !== 'all' || funnelFilter !== 'all' || statusFilter !== 'all') && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of {items.length} items
        </div>
      )}

      {/* Views */}
      {view === 'calendar' && (
        <CalendarView items={filtered} onEdit={setModal} onAdd={openAddWithDate}
          month={calMonth}
          onMonthChange={dir => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + dir, 1))}
          onToday={handleToday}
        />
      )}
      {view === 'week' && (
        <WeekView items={filtered} onEdit={setModal} onAdd={openAddWithDate}
          weekStart={weekStart} onWeekChange={handleWeekChange}
        />
      )}
      {view === 'kanban' && <KanbanView items={filtered} onEdit={setModal} onAdvance={handleAdvance} typeFilter={typeFilter} />}
      {view === 'list'   && <ListView   items={filtered} onEdit={setModal} onAdvance={handleAdvance} />}

      {modal && (
        <ContentModal
          item={modal === 'new' ? null : modal}
          prefillDate={modal === 'new' ? prefillDate : ''}
          onClose={() => { setModal(null); setPrefillDate('') }}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
