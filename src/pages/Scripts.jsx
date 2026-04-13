import { useState, useEffect, useRef } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { getCredentials } from '../lib/credentials.js'
import { getTeam } from '../lib/team.js'

// ── Storage ───────────────────────────────────────────────────────────────────
const STORE_KEY = 'maxd_scripts'
function loadScripts() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw !== null) return JSON.parse(raw)
    return []
  } catch { return [] }
}
function saveScripts(scripts) { localStorage.setItem(STORE_KEY, JSON.stringify(scripts)) }
function newId() { return `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUSES = [
  { key: 'idea',       label: 'Idea',          color: '#94A3B8', bg: '#F1F5F9' },
  { key: 'scripting',  label: 'Scripting',      color: '#D97706', bg: '#FFFBEB' },
  { key: 'ready',      label: 'Ready to Film',  color: '#2563EB', bg: '#EFF6FF' },
  { key: 'filming',    label: 'Filming',         color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'editing',    label: 'Editing',         color: '#D85A30', bg: '#FFF7ED' },
  { key: 'scheduled',  label: 'Scheduled',       color: '#059669', bg: '#ECFDF5' },
  { key: 'posted',     label: 'Posted',          color: '#065F46', bg: '#D1FAE5' },
]

const ALL_PLATFORMS  = ['TikTok', 'Instagram Reel', 'Instagram Story', 'YouTube Short', 'YouTube', 'Facebook']
const CONTENT_TYPES  = ['Reel', 'TikTok', 'Story', 'YouTube Short', 'YouTube Long', 'Carousel', 'Static Post', 'Live']

const SURVEY_SECTIONS = [
  {
    key: 'problem', label: 'Problem',
    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A',
    question: 'What problem does your audience have right now?',
    placeholder: 'Describe the pain point your viewer is experiencing...',
    chips: [
      'Most people hate swallowing giant supplement pills',
      'You\'re putting in the work but not seeing results',
      'Creatine powder is messy and hard to stay consistent with',
      'You\'ve tried supplements before but never stuck with them',
    ],
    tip: 'Make them feel seen. Name their exact frustration.',
    rows: 4,
  },
  {
    key: 'agitate', label: 'Agitate',
    color: '#B45309', bg: '#FEF3C7', border: '#FCD34D',
    question: 'Why does this problem keep getting worse?',
    placeholder: 'Drive home why this needs to change now...',
    chips: [
      'Every workout you skip creatine, you\'re leaving gains behind',
      'Meanwhile, others who are consistent are pulling ahead',
      'And the longer you wait, the more progress you miss',
      'Most supplements fail because they\'re inconvenient to take',
    ],
    tip: 'Build urgency. Make the cost of inaction feel real.',
    rows: 4,
  },
  {
    key: 'solution', label: 'Solution',
    color: '#059669', bg: '#ECFDF5', border: '#6EE7B7',
    question: 'What\'s the insight or solution that changes everything?',
    placeholder: 'Present the key insight before introducing the product...',
    chips: [
      'The real answer isn\'t a better formula — it\'s a better format',
      'Creatine works, but only when you actually take it every day',
      'What if supplementing was something you looked forward to?',
      'Science-backed creatine monohydrate, in a form that works for you',
    ],
    tip: 'The pivot moment. Build hope and excitement here.',
    rows: 4,
  },
  {
    key: 'product', label: 'Product Integration',
    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',
    question: 'How does MAXD Creatine Gummies solve this naturally?',
    placeholder: 'Introduce the product as the vehicle for change...',
    chips: [
      'That\'s where MAXD Creatine Gummies come in',
      'I\'ve been using MAXD for the last [X] weeks and honestly',
      'MAXD packs 5g of creatine monohydrate into a gummy you actually enjoy',
      'No powder, no mixing, no bad taste — just grab two gummies and go',
    ],
    tip: 'Natural, not forced. The product is the bridge to the transformation.',
    rows: 4,
  },
  {
    key: 'social_proof', label: 'Social Proof',
    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE',
    question: 'What real results or proof backs this up?',
    placeholder: 'Share wins, testimonials, or stats...',
    chips: [
      'I\'ve noticed a real difference in strength and endurance',
      'Thousands of customers are already seeing results',
      'My bench went up [X] lbs in the first month',
      'Don\'t just take my word for it — the reviews are wild',
    ],
    tip: 'Specifics beat generalities. Real numbers and stories win.',
    rows: 4,
  },
  {
    key: 'cta', label: 'Call to Action',
    color: '#DB2777', bg: '#FDF2F8', border: '#FBCFE8',
    question: 'What do you want viewers to do right now?',
    placeholder: 'Tell them the exact next step...',
    chips: [
      'Link in bio to grab your first bag',
      'Comment "GAINS" and I\'ll DM you the link',
      'Follow for more fitness and supplement tips',
      'Try MAXD risk-free — link in bio',
      'Drop a ❤️ if this was helpful',
    ],
    tip: 'One clear action. Remove all friction.',
    rows: 3,
  },
]

// ── Hook Library ──────────────────────────────────────────────────────────────
const HOOK_LIBRARY = [
  {
    category: 'Curiosity Gap',
    color: '#7C3AED', bg: '#F5F3FF',
    hooks: [
      'I tried creatine gummies for 30 days and the results surprised me.',
      'Nobody told me this about creatine. I had to find out the hard way.',
      'Wait — creatine doesn\'t have to taste like chalk?',
      'I\'ve been taking creatine wrong for years. Here\'s what changed.',
      'This is why 90% of people don\'t see results from creatine.',
      'The creatine hack everyone is sleeping on right now.',
    ],
  },
  {
    category: 'Pain Point',
    color: '#DC2626', bg: '#FEF2F2',
    hooks: [
      'If you hate swallowing giant supplement pills, this one\'s for you.',
      'Tired of the creatine powder mess every single morning?',
      'You\'re working hard at the gym. Your supplements should work just as hard.',
      'Skipping creatine because it\'s too inconvenient? That ends today.',
      'If you\'ve tried supplements before and quit, this is why it happened.',
      'Stop letting bad supplement habits hold back your gains.',
    ],
  },
  {
    category: 'Controversy',
    color: '#D97706', bg: '#FFFBEB',
    hooks: [
      'Hot take: creatine powder is outdated. Here\'s what I switched to.',
      'I\'m going to say something the supplement industry doesn\'t want you to hear.',
      'Everyone\'s been sold a lie about how to take creatine.',
      'Unpopular opinion: the form of your supplement matters more than the formula.',
      'I got roasted for saying gummies are better than powder. Let me explain.',
    ],
  },
  {
    category: 'Transformation',
    color: '#059669', bg: '#ECFDF5',
    hooks: [
      'My lifts went up 20lbs in 4 weeks. Here\'s the only thing I changed.',
      'Before MAXD vs 30 days after. The numbers don\'t lie.',
      'I switched from powder to gummies and this happened to my consistency.',
      'What consistent creatine actually does to your body over 90 days.',
      'This one supplement change completely transformed my training.',
    ],
  },
  {
    category: 'Question',
    color: '#0891B2', bg: '#ECFEFF',
    hooks: [
      'Are you making this creatine mistake? Most people are.',
      'What\'s actually holding back your gains at the gym?',
      'Do you even know what creatine does to your body?',
      'Why is everyone suddenly switching to creatine gummies?',
      'When\'s the best time to take creatine? The answer might surprise you.',
    ],
  },
  {
    category: 'POV',
    color: '#2563EB', bg: '#EFF6FF',
    hooks: [
      'POV: You finally found a supplement you actually look forward to taking.',
      'POV: You discover creatine gummies exist and your life changes.',
      'POV: Your gym bag no longer has a powder-covered shaker in it.',
      'POV: You\'re the one at the gym who actually stays consistent.',
      'POV: First day taking MAXD Creatine Gummies.',
    ],
  },
  {
    category: 'Social Proof',
    color: '#DB2777', bg: '#FDF2F8',
    hooks: [
      'My entire gym is asking me what I\'m taking right now.',
      'I recommended MAXD to 3 friends. All 3 are now obsessed.',
      '10,000 athletes can\'t be wrong about this supplement.',
      'This is what I tell everyone who asks me about creatine.',
      'I\'ve been in fitness for 10 years. This is the only supplement I\'d never skip.',
    ],
  },
  {
    category: 'Statement',
    color: '#475569', bg: '#F8FAFC',
    hooks: [
      'Creatine is the most researched supplement in history. You should be taking it.',
      'Consistency beats intensity every single time. Here\'s how to stay consistent.',
      'The best supplement is the one you actually take every day.',
      'I don\'t care how hard you train — if you\'re not taking creatine, you\'re leaving gains behind.',
      'MAXD Creatine Gummies just changed how I think about supplementing forever.',
    ],
  },
]

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_SCRIPTS = [
  {
    id: 'demo_1', title: 'Why Creatine Gummies Beat Powder',
    status: 'ready', platforms: ['TikTok', 'Instagram Reel'], contentType: 'Reel',
    shootDate: '2026-04-10', location: 'Home Gym', address: '',
    assignedTo: 'kyle', product: 'MAXD Creatine Gummies', tags: 'creatine, gummies, vs powder',
    hooks: [
      'I switched from creatine powder to gummies 60 days ago — here\'s what happened to my lifts.',
      'Creatine powder vs creatine gummies: I tried both for a month. The winner shocked me.',
    ],
    sections: {
      problem: 'Creatine powder is messy, tastes terrible, and requires mixing. Most people quit within a month.',
      agitate: 'And every workout you skip creatine, you\'re leaving serious gains on the table. It adds up fast.',
      solution: 'What if taking creatine was actually something you looked forward to? No mixing, no taste issues, just grab and go.',
      product: 'That\'s exactly what MAXD Creatine Gummies deliver — 5g of creatine monohydrate in a gummy you genuinely enjoy eating.',
      social_proof: 'Since switching, my bench went up 20lbs and I haven\'t missed a single day. The consistency alone changed everything.',
      cta: 'Link in bio to grab your first bag. First order ships free.',
    },
    shotList: [
      { id: 'sh1', shot: 'MAXD gummy bag on gym bench', angle: 'Close-up, top-down', notes: 'Natural light preferred', done: false },
      { id: 'sh2', shot: 'Pour creatine powder — show the mess', angle: 'Medium, slightly overhead', notes: 'Emphasize the inconvenience', done: false },
      { id: 'sh3', shot: 'Hand popping a MAXD gummy', angle: 'Close-up', notes: 'Show ease and enjoyment', done: false },
      { id: 'sh4', shot: 'Lifting clip — heavy set', angle: 'Side angle on rack', notes: 'Show the effort and result', done: false },
    ],
    notes: '', createdAt: '2026-04-01T10:00:00Z', updatedAt: '2026-04-01T10:00:00Z',
  },
  {
    id: 'demo_2', title: '30 Day Creatine Challenge Results',
    status: 'scripting', platforms: ['TikTok', 'YouTube Short'], contentType: 'TikTok',
    shootDate: '2026-04-15', location: 'Home Gym', address: '',
    assignedTo: 'kyle', product: 'MAXD Creatine Gummies', tags: '30 day challenge, results',
    hooks: ['I took creatine every single day for 30 days. Here are my honest results.'],
    sections: {
      problem: 'Most people try creatine but never see results because they\'re inconsistent. Life gets in the way.',
      agitate: 'Without consistency, you\'re basically just wasting your money on supplements that never get a real chance to work.',
      solution: 'The secret isn\'t a better creatine formula — it\'s one you\'ll actually take every single day.',
      product: 'MAXD Creatine Gummies made consistency easy. They taste amazing, so I genuinely wanted to take them.',
      social_proof: 'After 30 days: bench up 15lbs, more pump in every session, faster recovery. I\'m sold.',
      cta: 'Start your own 30 day challenge — link in bio.',
    },
    shotList: [], notes: 'Film before/after gym clips on the same day',
    createdAt: '2026-04-02T09:00:00Z', updatedAt: '2026-04-02T09:00:00Z',
  },
  {
    id: 'demo_3', title: 'Best Pre-Workout Snack for the Gym',
    status: 'idea', platforms: ['Instagram Reel', 'Instagram Story'], contentType: 'Reel',
    shootDate: '', location: '', address: '', assignedTo: '',
    product: 'MAXD Creatine Gummies', tags: 'pre workout, snack, gym tips',
    hooks: ['What I eat before every single workout (this one surprised people)'],
    sections: { problem: '', agitate: '', solution: '', product: '', social_proof: '', cta: '' },
    shotList: [], notes: 'Could tie into "what\'s in my gym bag" trend',
    createdAt: '2026-04-03T11:00:00Z', updatedAt: '2026-04-03T11:00:00Z',
  },
  {
    id: 'demo_4', title: 'Hot Take: Creatine Powder Is Dead',
    status: 'idea', platforms: ['TikTok'], contentType: 'TikTok',
    shootDate: '', location: '', address: '', assignedTo: '',
    product: 'MAXD Creatine Gummies', tags: 'controversy, creatine powder, opinion',
    hooks: ['Hot take: creatine powder is outdated. Here\'s what I switched to.'],
    sections: { problem: '', agitate: '', solution: '', product: '', social_proof: '', cta: '' },
    shotList: [], notes: '',
    createdAt: '2026-04-04T11:00:00Z', updatedAt: '2026-04-04T11:00:00Z',
  },
  {
    id: 'demo_5', title: 'POV: First Day Taking MAXD Gummies',
    status: 'scripting', platforms: ['TikTok', 'Instagram Reel'], contentType: 'Reel',
    shootDate: '2026-04-18', location: 'Kitchen / Gym', address: '', assignedTo: '',
    product: 'MAXD Creatine Gummies', tags: 'POV, first impression, unboxing',
    hooks: ['POV: You discover creatine gummies exist and your life changes.'],
    sections: { problem: '', agitate: '', solution: '', product: '', social_proof: '', cta: '' },
    shotList: [], notes: 'Morning routine style — unboxing + first reaction',
    createdAt: '2026-04-05T09:00:00Z', updatedAt: '2026-04-05T09:00:00Z',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const EMPTY_SCRIPT = () => ({
  id: newId(), title: '', status: 'idea', platforms: [], contentType: '',
  shootDate: '', location: '', address: '', assignedTo: '', product: '', tags: '',
  hooks: [''],
  sections: Object.fromEntries(SURVEY_SECTIONS.map(s => [s.key, ''])),
  shotList: [], notes: '',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
})

function statusInfo(key) { return STATUSES.find(s => s.key === key) || STATUSES[0] }

function wordCount(text) { return text ? text.trim().split(/\s+/).filter(Boolean).length : 0 }
function totalWords(script) {
  const hookWords = wordCount(script.hooks?.[0] || '')
  const secWords = Object.values(script.sections || {}).reduce((s, v) => s + wordCount(v), 0)
  return hookWords + secWords
}
function estimateDuration(words) {
  // ~125 wpm for social video
  const seconds = Math.round((words / 125) * 60)
  if (seconds < 60) return `~${seconds}s`
  return `~${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

// ── Components ────────────────────────────────────────────────────────────────
function StatusBadge({ status, small }) {
  const s = statusInfo(status)
  return (
    <span style={{
      display: 'inline-block',
      fontSize: small ? 10 : 11, fontWeight: 700, letterSpacing: '0.05em',
      padding: small ? '2px 7px' : '3px 10px', borderRadius: 20,
      background: s.bg, color: s.color,
    }}>
      {s.label.toUpperCase()}
    </span>
  )
}

function ChipRow({ chips, onPick }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0 8px' }}>
      {chips.map(chip => (
        <button key={chip} onClick={() => onPick(chip)} style={{
          fontSize: 11, padding: '4px 10px', borderRadius: 20,
          border: '1px solid var(--border-mid)', background: 'var(--surface-2)',
          color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.12s',
          fontFamily: 'var(--font-body)',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          {chip}
        </button>
      ))}
    </div>
  )
}

// ── Hook Library Modal ────────────────────────────────────────────────────────
function HookLibraryModal({ onPick, onClose }) {
  const [activeCategory, setActiveCategory] = useState(HOOK_LIBRARY[0].category)
  const active = HOOK_LIBRARY.find(c => c.category === activeCategory)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,25,41,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '85vh', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', fontFamily: 'var(--font-heading)', letterSpacing: '0.04em' }}>HOOK LIBRARY</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{HOOK_LIBRARY.reduce((n, c) => n + c.hooks.length, 0)} proven hooks — click any to use it</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{ width: 170, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '12px 8px' }}>
            {HOOK_LIBRARY.map(cat => (
              <button key={cat.category} onClick={() => setActiveCategory(cat.category)} style={{
                width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: activeCategory === cat.category ? cat.bg : 'transparent',
                color: activeCategory === cat.category ? cat.color : 'var(--text-secondary)',
                fontSize: 12, fontWeight: activeCategory === cat.category ? 700 : 500,
                marginBottom: 2, fontFamily: 'var(--font-body)',
              }}>
                {cat.category}
                <span style={{ float: 'right', fontSize: 10, opacity: 0.6 }}>{cat.hooks.length}</span>
              </button>
            ))}
          </div>
          {/* Hooks */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: active?.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              {activeCategory}
            </div>
            {active?.hooks.map((hook, i) => (
              <div key={i} onClick={() => { onPick(hook); onClose() }} style={{
                padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--surface)', marginBottom: 8, cursor: 'pointer',
                fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6,
                transition: 'all 0.12s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = active.bg; e.currentTarget.style.borderColor = active.color }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                "{hook}"
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Survey section ────────────────────────────────────────────────────────────
function SurveySection({ sec, value, onChange }) {
  const wc = wordCount(value)
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ padding: '8px 14px', borderRadius: '10px 10px 0 0', background: sec.bg, borderTop: `3px solid ${sec.color}`, border: `1px solid ${sec.border}`, borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: sec.color, letterSpacing: '0.06em' }}>{sec.label.toUpperCase()}</span>
        {wc > 0 && <span style={{ fontSize: 10, color: sec.color, opacity: 0.6 }}>{wc} words</span>}
      </div>
      <div style={{ border: `1px solid ${sec.border}`, borderTop: 'none', borderRadius: '0 0 10px 10px', background: `${sec.bg}50`, padding: '10px 14px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>{sec.question}</div>
        <ChipRow chips={sec.chips} onPick={chip => onChange(value ? value + ' ' + chip : chip)} />
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={sec.placeholder} rows={sec.rows}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1px solid ${sec.border}`, borderRadius: 8, fontSize: 13, color: 'var(--navy)', lineHeight: 1.7, resize: 'vertical', outline: 'none', background: 'white', fontFamily: 'var(--font-body)' }}
          onFocus={e => e.target.style.borderColor = sec.color}
          onBlur={e => e.target.style.borderColor = sec.border}
        />
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>💡 {sec.tip}</div>
      </div>
    </div>
  )
}

// ── Hook section ──────────────────────────────────────────────────────────────
function HookSection({ hooks, onChange }) {
  const [showLibrary, setShowLibrary] = useState(false)
  const hookSec = { key: 'hook', label: 'Hook', color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' }
  const HOOK_CHIPS = [
    'Did you know this one thing about creatine?',
    'I tried creatine gummies for 30 days and...',
    'Stop making this workout mistake',
    'POV: You finally found a supplement you actually enjoy taking',
    'Hot take: creatine powder is dead',
  ]
  const updateHook = (i, val) => onChange(hooks.map((h, idx) => idx === i ? val : h))
  const addVariant = () => onChange([...hooks, ''])
  const removeVariant = (i) => onChange(hooks.filter((_, idx) => idx !== i))

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ padding: '8px 14px', borderRadius: '10px 10px 0 0', background: hookSec.bg, borderTop: `3px solid ${hookSec.color}`, border: `1px solid ${hookSec.border}`, borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: hookSec.color, letterSpacing: '0.06em' }}>HOOK</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowLibrary(true)} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 12, border: `1px solid ${hookSec.color}`, background: hookSec.color, color: 'white', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
            Browse Library
          </button>
          <button onClick={addVariant} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 12, border: `1px solid ${hookSec.color}`, background: 'transparent', color: hookSec.color, cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
            + Variant
          </button>
        </div>
      </div>
      <div style={{ border: `1px solid ${hookSec.border}`, borderTop: 'none', borderRadius: '0 0 10px 10px', background: '#FEF2F250', padding: '10px 14px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>🎣 How will you grab attention in the first 3 seconds?</div>
        <ChipRow chips={HOOK_CHIPS} onPick={chip => updateHook(0, hooks[0] ? hooks[0] + ' ' + chip : chip)} />
        {hooks.map((hook, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
            {hooks.length > 1 && (
              <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: hookSec.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, marginTop: 8 }}>{i + 1}</div>
            )}
            <textarea value={hook} onChange={e => updateHook(i, e.target.value)}
              placeholder={i === 0 ? 'Write your primary hook here...' : `Hook variant ${i + 1}...`}
              rows={3}
              style={{ flex: 1, padding: '10px 12px', border: `1px solid ${hookSec.border}`, borderRadius: 8, fontSize: 13, color: 'var(--navy)', lineHeight: 1.7, resize: 'vertical', outline: 'none', background: 'white', fontFamily: 'var(--font-body)' }}
              onFocus={e => e.target.style.borderColor = hookSec.color}
              onBlur={e => e.target.style.borderColor = hookSec.border}
            />
            {hooks.length > 1 && i > 0 && (
              <button onClick={() => removeVariant(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: '8px 2px', lineHeight: 1 }}>×</button>
            )}
          </div>
        ))}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>💡 Write multiple variants and pick the best one to film. First 3 seconds = everything.</div>
      </div>
      {showLibrary && <HookLibraryModal onPick={hook => updateHook(0, hook)} onClose={() => setShowLibrary(false)} />}
    </div>
  )
}

// ── AI Script Writer ──────────────────────────────────────────────────────────
async function callClaude(prompt) {
  const creds = getCredentials('anthropic')
  const apiKey = creds?.apiKey
  if (!apiKey) throw new Error('no_key')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: 'claude-opus-4-6', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) throw new Error('api_error')
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

function AIScriptWriter({ onFill }) {
  const [open, setOpen] = useState(false)
  const [idea, setIdea] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const generate = async () => {
    if (!idea.trim()) return
    setLoading(true); setErr('')
    try {
      const prompt = `You are a social media video script writer for MAXD Wellness, a supplement brand that makes Creatine Gummies — a fun, convenient alternative to creatine powder.\n\nWrite a complete video script for this idea: "${idea}"\n\nReturn ONLY valid JSON (no markdown, no explanation) with these exact keys:\n{\n  "hooks": ["primary hook (first 3 seconds)", "alternative hook option"],\n  "problem": "problem section",\n  "agitate": "agitate section",\n  "solution": "solution section",\n  "product": "product integration section",\n  "social_proof": "social proof section",\n  "cta": "call to action"\n}\n\nGuidelines: each section 2-4 sentences, casual authentic voice, reference MAXD Creatine Gummies naturally, social media ready.`
      const text = await callClaude(prompt)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('parse_error')
      const parsed = JSON.parse(jsonMatch[0])
      onFill(parsed)
      setOpen(false); setIdea('')
    } catch (e) {
      setErr(e.message === 'no_key' ? 'No Anthropic API key. Go to Settings → Integrations → Anthropic.' : 'Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ borderRadius: 12, border: '1.5px solid #BFDBFE', background: '#EFF6FF', marginBottom: 20, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>✦</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>AI Script Writer</div>
            <div style={{ fontSize: 11, color: '#3B82F6' }}>Describe your idea — Claude writes the full script</div>
          </div>
        </div>
        <span style={{ color: '#3B82F6', fontSize: 12, fontWeight: 700 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #BFDBFE' }}>
          <div style={{ fontSize: 12, color: '#1E40AF', margin: '12px 0 6px', fontWeight: 600 }}>Describe your video idea in plain English</div>
          <textarea value={idea} onChange={e => setIdea(e.target.value)}
            placeholder="e.g. A video comparing creatine powder vs MAXD gummies, showing how much easier it is to stay consistent with gummies. Target: gym beginners aged 18-25."
            rows={4}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 13, color: 'var(--navy)', lineHeight: 1.6, resize: 'vertical', outline: 'none', background: 'white', fontFamily: 'var(--font-body)' }}
          />
          {err && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{err}</div>}
          <button onClick={generate} disabled={loading || !idea.trim()} style={{ marginTop: 10, padding: '9px 20px', borderRadius: 8, background: loading ? '#93C5FD' : '#2563EB', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: loading || !idea.trim() ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}>
            {loading ? '⏳ Generating…' : '✦ Generate Full Script'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Script Preview + Teleprompter ─────────────────────────────────────────────
function ScriptPreview({ script }) {
  const [teleprompter, setTeleprompter] = useState(false)
  const [copied, setCopied] = useState(false)
  const [speed, setSpeed] = useState(40) // px per second
  const scrollRef = useRef(null)
  const animRef = useRef(null)
  const [scrolling, setScrolling] = useState(false)

  const words = totalWords(script)
  const duration = estimateDuration(words)

  const assembledText = [
    script.hooks?.[0] ? `HOOK\n${script.hooks[0]}` : null,
    ...SURVEY_SECTIONS.map(s => script.sections?.[s.key] ? `${s.label.toUpperCase()}\n${script.sections[s.key]}` : null),
  ].filter(Boolean).join('\n\n')

  const copyToClipboard = () => {
    navigator.clipboard.writeText(assembledText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const startScroll = () => {
    setScrolling(true)
    const el = scrollRef.current
    if (!el) return
    const scroll = () => {
      if (!scrolling && animRef.current) { cancelAnimationFrame(animRef.current); return }
      el.scrollTop += speed / 60
      if (el.scrollTop < el.scrollHeight - el.clientHeight) {
        animRef.current = requestAnimationFrame(scroll)
      } else {
        setScrolling(false)
      }
    }
    animRef.current = requestAnimationFrame(scroll)
  }

  const stopScroll = () => {
    setScrolling(false)
    if (animRef.current) cancelAnimationFrame(animRef.current)
  }

  useEffect(() => {
    if (scrolling) startScroll()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [scrolling, speed])

  if (teleprompter) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
        {/* Controls bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px', background: '#111', borderBottom: '1px solid #222', flexShrink: 0 }}>
          <button onClick={() => { setTeleprompter(false); stopScroll() }} style={{ background: 'none', border: '1px solid #444', borderRadius: 8, color: '#aaa', padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>← Exit</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <span style={{ fontSize: 12, color: '#666' }}>Speed</span>
            <input type="range" min="10" max="120" value={speed} onChange={e => setSpeed(Number(e.target.value))} style={{ flex: 1, maxWidth: 200 }} />
            <span style={{ fontSize: 12, color: '#666' }}>{speed}</span>
          </div>
          <button onClick={() => scrolling ? stopScroll() : setScrolling(true)} style={{ background: scrolling ? '#DC2626' : '#16a34a', border: 'none', borderRadius: 8, color: 'white', padding: '8px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            {scrolling ? '⏸ Pause' : '▶ Start'}
          </button>
          <button onClick={() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; stopScroll() }} style={{ background: 'none', border: '1px solid #444', borderRadius: 8, color: '#aaa', padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>↩ Reset</button>
        </div>
        {/* Script content */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'scroll', padding: '60px 10vw', scrollbarWidth: 'none' }}>
          <div style={{ height: '30vh' }} />
          {[
            script.hooks?.[0] ? { label: 'HOOK', text: script.hooks[0], color: '#DC2626' } : null,
            ...SURVEY_SECTIONS.map(s => script.sections?.[s.key] ? { label: s.label.toUpperCase(), text: script.sections[s.key], color: s.color } : null),
          ].filter(Boolean).map((block, i) => (
            <div key={i} style={{ marginBottom: '8vh' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: block.color, letterSpacing: '0.14em', marginBottom: '2vh', opacity: 0.7 }}>{block.label}</div>
              <div style={{ fontSize: 'clamp(24px, 4vw, 42px)', color: '#ffffff', lineHeight: 1.6, fontFamily: 'var(--font-body)', fontWeight: 400 }}>
                {block.text}
              </div>
            </div>
          ))}
          <div style={{ height: '50vh' }} />
        </div>
        {/* Focus line */}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'rgba(226,27,77,0.3)', pointerEvents: 'none' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Words', value: words },
          { label: 'Est. Duration', value: duration },
          { label: 'Hook Variants', value: script.hooks?.length || 0 },
          { label: 'Sections Filled', value: SURVEY_SECTIONS.filter(s => script.sections?.[s.key]?.trim()).length + '/' + SURVEY_SECTIONS.length },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ flex: 1, minWidth: 110, textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)', fontFamily: 'var(--font-heading)' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setTeleprompter(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: 'var(--navy)', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          ▶ Teleprompter Mode
        </button>
        <button onClick={copyToClipboard} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: copied ? '#059669' : 'var(--surface-3)', border: '1px solid var(--border-mid)', color: copied ? 'white' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}>
          {copied ? '✓ Copied!' : 'Copy Script'}
        </button>
      </div>

      {/* Hook variants */}
      {(script.hooks?.length || 0) > 1 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Hook Variants</div>
          {script.hooks.map((hook, i) => (
            <div key={i} style={{ padding: '10px 14px', borderRadius: 8, background: i === 0 ? '#FEF2F2' : 'var(--surface)', border: `1px solid ${i === 0 ? '#FCA5A5' : 'var(--border)'}`, marginBottom: 8, fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', marginRight: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hook {i + 1}{i === 0 ? ' (Primary)' : ''}</span>
              "{hook}"
            </div>
          ))}
        </div>
      )}

      {/* Assembled script */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Full Script</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{words} words · {duration}</span>
        </div>
        {[
          script.hooks?.[0] ? { label: 'HOOK', text: script.hooks[0], color: '#DC2626', bg: '#FEF2F2' } : null,
          ...SURVEY_SECTIONS.map(s => script.sections?.[s.key] ? { label: s.label.toUpperCase(), text: script.sections[s.key], color: s.color, bg: s.bg } : null),
        ].filter(Boolean).map((block, i) => (
          <div key={i} style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14 }}>
            <div style={{ width: 90, flexShrink: 0, paddingTop: 2 }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: block.color, textTransform: 'uppercase', letterSpacing: '0.10em', background: block.bg, padding: '3px 8px', borderRadius: 4 }}>{block.label}</span>
            </div>
            <div style={{ flex: 1, fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.75 }}>{block.text}</div>
            <div style={{ flexShrink: 0, fontSize: 10, color: 'var(--text-muted)', paddingTop: 4 }}>{wordCount(block.text)}w</div>
          </div>
        ))}
        {!SURVEY_SECTIONS.some(s => script.sections?.[s.key]) && !script.hooks?.[0] && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No script content yet. Fill in sections in the Script tab.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Shot List ─────────────────────────────────────────────────────────────────
function ShotListTab({ script, update }) {
  const { shotList, hooks, sections } = script
  const [aiIdea, setAiIdea] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiErr, setAiErr] = useState('')
  const [showAI, setShowAI] = useState(false)

  const addShot = () => update('shotList', [...shotList, { id: newId(), shot: '', angle: '', notes: '', done: false }])
  const updateShot = (id, field, val) => update('shotList', shotList.map(s => s.id === id ? { ...s, [field]: val } : s))
  const removeShot = (id) => update('shotList', shotList.filter(s => s.id !== id))
  const toggleDone = (id) => update('shotList', shotList.map(s => s.id === id ? { ...s, done: !s.done } : s))
  const done = shotList.filter(s => s.done).length

  const generateShots = async () => {
    setAiLoading(true); setAiErr('')
    try {
      const scriptSummary = [hooks[0], sections.problem, sections.solution, sections.product].filter(Boolean).join(' | ')
      const prompt = `Based on this social media video script for MAXD Wellness (Creatine Gummies), suggest a practical shot list for a solo creator filming at home or at a gym.\n\nScript: "${scriptSummary}"\nContext: "${aiIdea}"\n\nReturn ONLY a JSON array:\n[{ "shot": "description", "angle": "camera angle", "notes": "notes" }]\n\nKeep it 5-8 practical shots a solo creator can actually film. Be specific.`
      const text = await callClaude(prompt)
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('parse')
      const shots = JSON.parse(match[0]).map(s => ({ ...s, id: newId(), done: false }))
      update('shotList', [...shotList, ...shots])
      setShowAI(false); setAiIdea('')
    } catch (e) {
      setAiErr(e.message === 'no_key' ? 'Add your Anthropic API key in Settings' : 'Try again.')
    } finally { setAiLoading(false) }
  }

  return (
    <div>
      <div style={{ borderRadius: 10, border: '1.5px solid #DDD6FE', background: '#F5F3FF', marginBottom: 16, overflow: 'hidden' }}>
        <button onClick={() => setShowAI(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🎥</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#5B21B6' }}>AI Shot List Generator</span>
          </div>
          <span style={{ color: '#7C3AED', fontSize: 11, fontWeight: 700 }}>{showAI ? '▲' : '▼'}</span>
        </button>
        {showAI && (
          <div style={{ padding: '0 14px 14px', borderTop: '1px solid #DDD6FE' }}>
            <div style={{ fontSize: 12, color: '#5B21B6', margin: '10px 0 6px', fontWeight: 600 }}>Any specific shots in mind? (optional)</div>
            <textarea value={aiIdea} onChange={e => setAiIdea(e.target.value)} placeholder="e.g. I want a gym scene, close-ups of the gummies, and a before/after comparison..." rows={3}
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #DDD6FE', borderRadius: 8, fontSize: 12, color: 'var(--navy)', resize: 'vertical', outline: 'none', background: 'white', fontFamily: 'var(--font-body)' }} />
            {aiErr && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{aiErr}</div>}
            <button onClick={generateShots} disabled={aiLoading} style={{ marginTop: 8, padding: '7px 16px', borderRadius: 8, background: aiLoading ? '#C4B5FD' : '#7C3AED', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              {aiLoading ? '⏳ Generating…' : '✦ Generate Shot List'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Shots {shotList.length > 0 && <span style={{ fontWeight: 400 }}>— {done}/{shotList.length} done</span>}
        </div>
        <button onClick={addShot} style={{ fontSize: 11, padding: '5px 14px', borderRadius: 6, border: '1.5px solid var(--navy)', background: 'var(--navy)', color: 'white', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
          + Add Shot
        </button>
      </div>

      {shotList.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: 12, background: 'var(--surface)', borderRadius: 10, border: '1px dashed var(--border-mid)' }}>
          No shots yet — generate with AI or add manually.
        </div>
      )}

      {shotList.map((shot, i) => (
        <div key={shot.id} style={{ display: 'grid', gridTemplateColumns: '26px 1fr 1fr 1fr auto', gap: 8, alignItems: 'center', padding: '10px 12px', background: shot.done ? '#f0fdf4' : 'var(--surface-2)', border: `1px solid ${shot.done ? '#bbf7d0' : 'var(--border)'}`, borderRadius: 8, marginBottom: 6, opacity: shot.done ? 0.7 : 1, transition: 'all 0.15s' }}>
          <button onClick={() => toggleDone(shot.id)} style={{ width: 22, height: 22, borderRadius: 5, border: `2px solid ${shot.done ? '#16a34a' : 'var(--border-mid)'}`, background: shot.done ? '#16a34a' : 'white', color: 'white', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {shot.done ? '✓' : ''}
          </button>
          <input value={shot.shot} onChange={e => updateShot(shot.id, 'shot', e.target.value)} placeholder={`Shot ${i + 1} — what to film`} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--navy)', outline: 'none', textDecoration: shot.done ? 'line-through' : 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
          <input value={shot.angle} onChange={e => updateShot(shot.id, 'angle', e.target.value)} placeholder="Camera angle" style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--navy)', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
          <input value={shot.notes} onChange={e => updateShot(shot.id, 'notes', e.target.value)} placeholder="Notes" style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--navy)', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
          <button onClick={() => removeShot(shot.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1 }}>×</button>
        </div>
      ))}
    </div>
  )
}

// ── Details Tab ───────────────────────────────────────────────────────────────
function DetailsTab({ script, update }) {
  const [showAddress, setShowAddress] = useState(!!script.address)
  const team = getTeam()
  const fieldStyle = { width: '100%', padding: '8px 10px', border: '1px solid var(--border-mid)', borderRadius: 8, fontSize: 13, color: 'var(--navy)', outline: 'none', background: 'white', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>Platforms <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— select all that apply</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ALL_PLATFORMS.map(p => {
            const sel = script.platforms.includes(p)
            return (
              <button key={p} onClick={() => update('platforms', sel ? script.platforms.filter(x => x !== p) : [...script.platforms, p])} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `2px solid ${sel ? 'var(--navy)' : 'var(--border-mid)'}`, background: sel ? 'var(--navy)' : 'white', color: sel ? 'white' : 'var(--text-secondary)', transition: 'all 0.12s', fontFamily: 'var(--font-body)' }}>
                {p}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <label style={labelStyle}>Status</label>
        <select value={script.status} onChange={e => update('status', e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Content Type</label>
        <select value={script.contentType} onChange={e => update('contentType', e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
          <option value="">Select type…</option>
          {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Shoot Date</label>
        <input type="date" value={script.shootDate} onChange={e => update('shootDate', e.target.value)} style={fieldStyle} />
      </div>
      <div>
        <label style={labelStyle}>Assigned To</label>
        <select value={script.assignedTo} onChange={e => update('assignedTo', e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
          <option value="">Unassigned</option>
          {team.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
        </select>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>Location</label>
        <input value={script.location} onChange={e => update('location', e.target.value)} placeholder="e.g. Home Gym, Studio, Outdoors..." style={fieldStyle} />
        <button onClick={() => setShowAddress(o => !o)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, marginTop: 6, padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)' }}>
          {showAddress ? '▼ Hide address' : '▶ + Add address'}
        </button>
        {showAddress && <input value={script.address} onChange={e => update('address', e.target.value)} placeholder="Street address, city, state..." style={{ ...fieldStyle, marginTop: 8 }} />}
      </div>
      <div>
        <label style={labelStyle}>Product Featured</label>
        <input value={script.product} onChange={e => update('product', e.target.value)} placeholder="e.g. MAXD Creatine Gummies" style={fieldStyle} />
      </div>
      <div>
        <label style={labelStyle}>Tags</label>
        <input value={script.tags} onChange={e => update('tags', e.target.value)} placeholder="creatine, gym, wellness..." style={fieldStyle} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>Director Notes</label>
        <textarea value={script.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional notes..." rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
      </div>
    </div>
  )
}

// ── Script Editor ─────────────────────────────────────────────────────────────
function ScriptEditor({ script: initial, onBack, onSave, onDelete }) {
  const [script, setScript] = useState(initial)
  const [tab, setTab] = useState('script')
  const [saved, setSaved] = useState(false)

  const update = (field, val) => setScript(s => ({ ...s, [field]: val, updatedAt: new Date().toISOString() }))
  const updateSection = (key, val) => setScript(s => ({ ...s, sections: { ...s.sections, [key]: val }, updatedAt: new Date().toISOString() }))

  const handleAIFill = (data) => setScript(s => ({
    ...s,
    hooks: data.hooks || s.hooks,
    sections: {
      problem: data.problem || s.sections.problem,
      agitate: data.agitate || s.sections.agitate,
      solution: data.solution || s.sections.solution,
      product: data.product || s.sections.product,
      social_proof: data.social_proof || s.sections.social_proof,
      cta: data.cta || s.sections.cta,
    },
    updatedAt: new Date().toISOString(),
  }))

  const save = () => { onSave(script); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const words = totalWords(script)
  const TABS = [
    { key: 'script',    label: 'Script'    },
    { key: 'preview',   label: 'Preview'   },
    { key: 'shotlist',  label: 'Shot List' },
    { key: 'details',   label: 'Details'   },
  ]

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ background: 'none', border: '1px solid var(--border-mid)', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)' }}>← Back</button>
        <input value={script.title} onChange={e => update('title', e.target.value)} placeholder="Script title…"
          style={{ flex: 1, minWidth: 200, padding: '8px 14px', fontSize: 16, fontWeight: 700, border: '1px solid var(--border-mid)', borderRadius: 8, color: 'var(--navy)', outline: 'none', fontFamily: 'var(--font-heading)', letterSpacing: '0.02em' }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{words}w · {estimateDuration(words)}</span>
          <StatusBadge status={script.status} />
          <button onClick={save} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: saved ? '#059669' : 'var(--red)', color: 'white', transition: 'background 0.2s', fontFamily: 'var(--font-body)' }}>
            {saved ? '✓ Saved' : 'Save'}
          </button>
          <button onClick={() => { if (window.confirm('Delete this script?')) onDelete(script.id) }} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, border: '1px solid var(--border-mid)', background: 'white', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Delete</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: tab === t.key ? 'var(--red)' : 'var(--text-muted)', borderBottom: tab === t.key ? '2px solid var(--red)' : '2px solid transparent', marginBottom: -2, fontFamily: 'var(--font-body)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'script' && (
        <div>
          <AIScriptWriter onFill={handleAIFill} />
          <HookSection hooks={script.hooks} onChange={v => update('hooks', v)} />
          {SURVEY_SECTIONS.map(sec => (
            <SurveySection key={sec.key} sec={sec} value={script.sections[sec.key]} onChange={val => updateSection(sec.key, val)} />
          ))}
        </div>
      )}
      {tab === 'preview' && <ScriptPreview script={script} />}
      {tab === 'shotlist' && <ShotListTab script={script} update={update} />}
      {tab === 'details' && <DetailsTab script={script} update={update} />}
    </div>
  )
}

// ── Script Card ───────────────────────────────────────────────────────────────
function ScriptCard({ script, onSelect, onDelete, compact }) {
  const s = statusInfo(script.status)
  const hookPreview = script.hooks?.[0]?.slice(0, 90) || ''
  const team = getTeam()
  const assignedMember = team.find(m => m.id === script.assignedTo)
  const words = totalWords(script)

  return (
    <div onClick={() => onSelect(script)} style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', borderTop: `3px solid ${s.color}`, padding: compact ? '0.85rem 1rem' : '1rem 1.25rem', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s', boxShadow: 'var(--shadow-sm)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = '' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 5, lineHeight: 1.3 }}>
            {script.title || 'Untitled Script'}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusBadge status={script.status} small />
            {script.contentType && <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface)', padding: '2px 7px', borderRadius: 20 }}>{script.contentType}</span>}
            {script.platforms?.slice(0, 2).map(p => (
              <span key={p} style={{ fontSize: 10, color: '#2563EB', background: '#EFF6FF', padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>{p}</span>
            ))}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); if (window.confirm('Delete this script?')) onDelete(script.id) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: 4, lineHeight: 1, flexShrink: 0 }}>×</button>
      </div>
      {hookPreview && !compact && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: 7, marginTop: 4, fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          "{hookPreview}{script.hooks?.[0]?.length > 90 ? '…' : ''}"
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: compact ? 6 : 8, fontSize: 10, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        {script.shootDate && <span>📅 {script.shootDate}</span>}
        {script.location   && <span>📍 {script.location}</span>}
        {words > 0         && <span>📝 {words}w · {estimateDuration(words)}</span>}
        {script.shotList?.length > 0 && <span>🎥 {script.shotList.filter(s => s.done).length}/{script.shotList.length} shots</span>}
        {assignedMember    && <span>👤 {assignedMember.name}</span>}
      </div>
    </div>
  )
}

// ── Kanban Board ──────────────────────────────────────────────────────────────
function KanbanBoard({ scripts, onSelect, onDelete, onStatusChange }) {
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
      {STATUSES.map(status => {
        const cols = scripts.filter(s => s.status === status.key)
        return (
          <div key={status.key} style={{ width: 240, flexShrink: 0 }}>
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px 8px 0 0', background: status.bg, borderTop: `3px solid ${status.color}`, border: `1px solid ${status.color}20`, borderBottom: 'none', marginBottom: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: status.color, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{status.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: status.color, opacity: 0.7 }}>{cols.length}</span>
            </div>
            <div style={{ background: 'var(--surface)', border: `1px solid ${status.color}20`, borderTop: 'none', borderRadius: '0 0 8px 8px', minHeight: 120, padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cols.map(script => (
                <ScriptCard key={script.id} script={script} onSelect={onSelect} onDelete={onDelete} compact />
              ))}
              {cols.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 8px', color: 'var(--text-muted)', fontSize: 11, fontStyle: 'italic' }}>No scripts</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Scripts() {
  const [scripts, setScripts] = useState(loadScripts)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [view, setView] = useState('grid') // 'grid' | 'kanban'

  const persist = (updated) => { saveScripts(updated); setScripts(updated) }
  const handleNew = () => { const s = EMPTY_SCRIPT(); persist([s, ...scripts]); setEditing(s) }
  const handleSelect = (script) => setEditing(script)
  const handleSave = (updated) => { persist(scripts.map(s => s.id === updated.id ? updated : s)); setEditing(updated) }
  const handleDelete = (id) => { persist(scripts.filter(s => s.id !== id)); setEditing(null) }

  if (editing) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <ScriptEditor script={editing} onBack={() => setEditing(null)} onSave={handleSave} onDelete={handleDelete} />
      </div>
    )
  }

  const filtered = scripts.filter(s => {
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.hooks?.[0]?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus && s.status !== filterStatus) return false
    if (filterPlatform && !s.platforms?.includes(filterPlatform)) return false
    return true
  })

  const statusCounts = STATUSES.reduce((acc, s) => ({ ...acc, [s.key]: scripts.filter(sc => sc.status === s.key).length }), {})

  return (
    <div>
      <PageHeader title="Scripts" subtitle={`${scripts.length} script${scripts.length !== 1 ? 's' : ''}`}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border-mid)', borderRadius: 8, overflow: 'hidden' }}>
            {[{ key: 'grid', icon: '⊞' }, { key: 'kanban', icon: '▦' }].map(v => (
              <button key={v.key} onClick={() => setView(v.key)} style={{ padding: '6px 12px', border: 'none', background: view === v.key ? 'var(--navy)' : 'white', color: view === v.key ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-body)' }}>
                {v.icon}
              </button>
            ))}
          </div>
          <button onClick={handleNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: 'var(--red)', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            + NEW SCRIPT
          </button>
        </div>
      </PageHeader>

      {/* Status pipeline summary */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {STATUSES.map(s => (
          <button key={s.key} onClick={() => setFilterStatus(filterStatus === s.key ? '' : s.key)} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${filterStatus === s.key ? s.color : 'var(--border)'}`, background: filterStatus === s.key ? s.bg : 'white', color: filterStatus === s.key ? s.color : 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.12s' }}>
            {s.label} {statusCounts[s.key] > 0 && <span style={{ fontWeight: 700 }}>· {statusCounts[s.key]}</span>}
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search scripts…"
          style={{ padding: '7px 12px', border: '1px solid var(--border-mid)', borderRadius: 8, fontSize: 13, color: 'var(--navy)', outline: 'none', width: 200, fontFamily: 'var(--font-body)' }} />
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid var(--border-mid)', borderRadius: 8, fontSize: 13, color: filterPlatform ? 'var(--navy)' : 'var(--text-muted)', outline: 'none', background: 'white', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <option value="">All platforms</option>
          {ALL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {(search || filterStatus || filterPlatform) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterPlatform('') }} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', background: 'white', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Clear filters
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length} of {scripts.length} scripts
        </span>
      </div>

      {/* Empty state */}
      {scripts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 6, fontFamily: 'var(--font-heading)' }}>No Scripts Yet</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Create your first script using the PAS framework or let AI write it for you.</div>
          <button onClick={handleNew} className="btn btn-primary">+ Create First Script</button>
        </div>
      )}

      {/* Kanban view */}
      {view === 'kanban' && scripts.length > 0 && (
        <KanbanBoard scripts={filtered} onSelect={handleSelect} onDelete={handleDelete} />
      )}

      {/* Grid view */}
      {view === 'grid' && scripts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map(s => <ScriptCard key={s.id} script={s} onSelect={handleSelect} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  )
}
