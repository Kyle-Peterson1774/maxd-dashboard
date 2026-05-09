import { useState, useRef } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAuth } from '../lib/auth.jsx'
import { streamChat } from '../lib/agentApi.js'

// ── Persistence ───────────────────────────────────────────────────────────────
function copiesKey(email) { return `ai_copies:${email || 'shared'}` }
function loadCopies(email) { try { return JSON.parse(localStorage.getItem(copiesKey(email)) || '[]') } catch { return [] } }
function saveCopies(email, d) { localStorage.setItem(copiesKey(email), JSON.stringify(d)) }
function nid() { return `c_${Date.now()}_${Math.random().toString(36).slice(2, 5)}` }

// ── Templates data ────────────────────────────────────────────────────────────
const TEMPLATES = [
  { id: 'ig-caption',    cat: 'Social',   icon: '📸', name: 'Instagram Caption',      prompt: `Write an Instagram caption for {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Include a clear call to action and 5–8 relevant hashtags. Keep it punchy — under 150 words.` },
  { id: 'tiktok-hook',   cat: 'Social',   icon: '🎵', name: 'TikTok Hook',             prompt: `Write 3 different opening hook lines for a TikTok about {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Each hook should stop someone from scrolling in the first 3 seconds. Format: numbered list.` },
  { id: 'yt-title',      cat: 'Social',   icon: '▶',  name: 'YouTube Title + Desc',   prompt: `Write a YouTube video title and description for a video about {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Title under 60 characters, SEO-optimized. Description 150–200 words with CTA in first 2 lines.` },
  { id: 'story-cta',     cat: 'Social',   icon: '⭕', name: 'Story CTA',               prompt: `Write 5 short Instagram/Facebook Story CTA slides for {productName}. Key benefit: {keyBenefit}. Tone: {tone}. Each under 10 words. Format: numbered list.` },
  { id: 'email-subject', cat: 'Email',    icon: '✉️', name: 'Subject Lines',           prompt: `Write 5 email subject line variants for a campaign about {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Mix styles: curiosity, urgency, benefit-led, question, bold claim. Include preview text for each.` },
  { id: 'email-welcome', cat: 'Email',    icon: '👋', name: 'Welcome Email',           prompt: `Write a welcome email for a new customer of {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Include: warm welcome, what to expect, key benefit, soft CTA. Under 200 words.` },
  { id: 'email-launch',  cat: 'Email',    icon: '🚀', name: 'Launch Email',            prompt: `Write a product launch email for {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Include: subject line, preheader, strong open, 3 key benefits, urgency element, and CTA. 200–250 words.` },
  { id: 'email-winback', cat: 'Email',    icon: '💌', name: 'Win-Back Email',          prompt: `Write a win-back email for lapsed customers of {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Acknowledge the time gap, restate value, offer a reason to return, include CTA. Under 200 words.` },
  { id: 'meta-headline', cat: 'Ads',      icon: '📘', name: 'Meta Headlines',          prompt: `Write 5 Meta ad headline variants for {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Each headline under 40 characters. Mix benefit-led, curiosity, urgency, and social proof.` },
  { id: 'meta-body',     cat: 'Ads',      icon: '📗', name: 'Meta Primary Text',       prompt: `Write primary text for a Meta ad promoting {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Hook in first line, 2–3 benefit bullets, social proof, strong CTA. Under 125 words.` },
  { id: 'google-ad',     cat: 'Ads',      icon: '🔍', name: 'Google Search Ad',        prompt: `Write a Google Search ad for {productName}. Key benefit: {keyBenefit}. Tone: {tone}. Format: 3 headlines (max 30 chars each), 2 descriptions (max 90 chars each). Include keywords naturally, end with CTA.` },
  { id: 'tiktok-script', cat: 'Ads',      icon: '🎬', name: 'TikTok Ad Script',        prompt: `Write a 15–30 second TikTok ad script for {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Format: Hook (0–3s), Problem (3–8s), Solution (8–20s), CTA (last 5s). Natural UGC speech.` },
  { id: 'prod-desc',     cat: 'Product',  icon: '📦', name: 'Product Description',     prompt: `Write a product description for {productName} for a Shopify product page. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Short punchy headline, 2–3 sentence intro, 4–5 benefit bullets, closing CTA. SEO-friendly.` },
  { id: 'ingredient',    cat: 'Product',  icon: '🧪', name: 'Ingredient Callout',      prompt: `Write a short ingredient callout for {productName}. Key benefit: {keyBenefit}. Tone: {tone}. Include ingredient name, what it does scientifically, why it matters for the customer. Under 80 words. Credible and clear.` },
  { id: 'faq',           cat: 'Product',  icon: '❓', name: 'FAQ Answer',              prompt: `Write a helpful FAQ answer for {productName}. The question is about: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Direct, reassuring, under 100 words. Avoid sounding like a legal disclaimer.` },
  { id: 'blog-intro',    cat: 'Brand',    icon: '📝', name: 'Blog Intro',              prompt: `Write the opening paragraph (about 150 words) of a blog post about {keyBenefit} for {productName}. Target audience: {targetAudience}. Tone: {tone}. Hook with a relatable problem or surprising fact, then transition into what the post covers.` },
  { id: 'about-snippet', cat: 'Brand',    icon: '🏢', name: 'About Us',                prompt: `Write a 100-word "About Us" snippet for {productName}. Key benefit: {keyBenefit}. Tone: {tone}. Capture the brand's mission, what makes it different, who it's for. Avoid corporate clichés.` },
  { id: 'sales-cold',    cat: 'Sales',    icon: '🧊', name: 'Cold Outreach',           prompt: `Write a cold B2B outreach email from a rep at {productName} to {targetAudience}. We sell: {keyBenefit}. Tone: {tone}. Under 120 words. Lead with a specific observation, not a generic compliment. One clear CTA. Subject line included.` },
  { id: 'sales-warm',    cat: 'Sales',    icon: '🔥', name: 'Warm Follow-Up',          prompt: `Write a warm follow-up email for {productName}. Previously connected with {targetAudience} about: {keyBenefit}. Tone: {tone}. Reference prior conversation naturally, add one new value point, move toward next step. Under 150 words. Subject line included.` },
  { id: 'sales-gym',     cat: 'Sales',    icon: '🏋️', name: 'Gym Pitch',              prompt: `Write a sales pitch email to the owner of {targetAudience} (a gym or fitness studio) about stocking {productName}. Key selling point: {keyBenefit}. Tone: {tone}. Speak their language — adds revenue, members love it, we handle restocking. Under 175 words. Subject line included.` },
  { id: 'sales-linkedin',cat: 'Sales',    icon: '💼', name: 'LinkedIn DM',             prompt: `Write a LinkedIn DM to {targetAudience} about {productName}. Key hook: {keyBenefit}. Tone: {tone}. Max 75 words. No pitching in the first message — a genuine specific observation that invites a response. Conversational, not salesy.` },
]

const CAT_META = {
  Social:  { icon: '📱', color: '#E1306C' },
  Email:   { icon: '✉️', color: '#4F6EF7' },
  Ads:     { icon: '📣', color: '#D97706' },
  Product: { icon: '📦', color: '#0CA678' },
  Brand:   { icon: '🏷️', color: '#7C3AED' },
  Sales:   { icon: '🤝', color: '#E21B4D' },
}

const TONES = ['Energetic', 'Scientific', 'Casual', 'Premium', 'Motivational', 'Educational', 'Direct & Professional']

// ── Agents data ───────────────────────────────────────────────────────────────
const AGENTS = [
  {
    id: 'repurpose', icon: '♻️', name: 'Content Repurposer', color: '#7C3AED',
    desc: 'Turn one script or idea into ready-to-post content for every platform.',
    fields: [
      { key: 'script',   label: 'Script or Idea',    placeholder: 'Paste your video script or content idea here…', type: 'textarea' },
      { key: 'product',  label: 'Product',            placeholder: 'MAXD Recovery Gummies',                          type: 'text' },
      { key: 'audience', label: 'Target Audience',   placeholder: 'Fitness-focused adults 25–40',                   type: 'text' },
    ],
    buildPrompt: (f) => `You are a social media expert for MAXD Wellness, a supplement brand.

Script/idea:
"""
${f.script}
"""
Product: ${f.product}
Audience: ${f.audience}

Generate clearly labeled content for every platform:

## Instagram Caption
(Under 150 words, punchy, 6 hashtags)

## TikTok Caption
(Under 100 words, energetic, 4–5 hashtags)

## Email Subject Lines (3 Options)
(With preview text for each)

## Meta Ad Headline (3 Options)
(Under 40 chars each)

## Meta Ad Primary Text
(Under 125 words, hook + 3 bullets + CTA)

## Tweet / X Post
(Under 280 chars)

Be specific to the content, not generic.`,
  },
  {
    id: 'sales-sequence', icon: '📬', name: 'Sales Sequence', color: '#E21B4D',
    desc: 'Enter a prospect and get a personalized 3-email sequence: cold intro, warm follow-up, and close.',
    fields: [
      { key: 'company',     label: 'Company Name',         placeholder: 'Iron Peak Fitness',                         type: 'text' },
      { key: 'contactName', label: 'Contact Name & Title', placeholder: 'Marcus Rivera, Owner',                       type: 'text' },
      { key: 'theirBiz',   label: 'What They Do',         placeholder: 'High-traffic gym in Austin, TX, ~800 members', type: 'text' },
      { key: 'offer',       label: 'What You\'re Pitching', placeholder: 'Wholesale floor display of MAXD Creatine', type: 'text' },
      { key: 'sender',      label: 'Your Name & Role',     placeholder: 'Kyle Peterson, Founder @ MAXD Wellness',    type: 'text' },
    ],
    buildPrompt: (f) => `You are a B2B sales expert for MAXD Wellness.

Company: ${f.company} | Contact: ${f.contactName}
Their business: ${f.theirBiz}
Pitching: ${f.offer}
Sender: ${f.sender}

Write a 3-email sequence. Each email needs: subject line, preheader, body. Be specific to their business.

## Email 1: Cold Intro
(Under 120 words. Specific insight about their business. One soft CTA.)

---

## Email 2: Warm Follow-Up
(5 days later. Under 130 words. Reference Email 1. Add new value point.)

---

## Email 3: Closing Push
(4 days after Email 2. Under 110 words. Gentle urgency. Easy yes or easy out.)`,
  },
  {
    id: 'content-ideas', icon: '💡', name: 'Weekly Content Ideas', color: '#D97706',
    desc: 'Tell it your products and goals, get 7 ready-to-execute ideas with hooks, platforms, and angles.',
    fields: [
      { key: 'products', label: 'Current Products',   placeholder: 'Creatine Gummies 30ct, 60ct, Recovery Bundles', type: 'text' },
      { key: 'goals',    label: 'This Week\'s Goals', placeholder: 'Drive spring bundle sales, grow TikTok',         type: 'text' },
      { key: 'recent',   label: 'Recent Posts (skip)', placeholder: 'Before/after transformation, ingredient post', type: 'text' },
      { key: 'audience', label: 'Audience',           placeholder: 'Gym-goers, CrossFit athletes, health-conscious', type: 'text' },
    ],
    buildPrompt: (f) => `You are a content strategist for MAXD Wellness (supplement brand, creatine gummies).

Products: ${f.products}
This week's goals: ${f.goals}
Recent content to avoid: ${f.recent}
Audience: ${f.audience}

Generate 7 content ideas. For each:

**Idea [#]: [Title]**
- Platform: (Reel / TikTok / YouTube Short / Carousel / Story / etc.)
- Hook: (Exact first line or opening 3 seconds)
- Angle: (What makes it shareable)
- CTA: (What you want them to do)
- Notes: (Tips for filming or writing)

Mix educational, entertaining, social proof, product-focused, lifestyle. Prioritize the week's goals.`,
  },
  {
    id: 'email-campaign', icon: '📧', name: 'Email Campaign', color: '#4F6EF7',
    desc: 'Give it a product or promotion and get a full 5-email campaign flow, ready to schedule.',
    fields: [
      { key: 'product',  label: 'Product / Promotion', placeholder: 'Spring Bundle — 20% off for 72 hours',    type: 'text' },
      { key: 'audience', label: 'Email List Segment',  placeholder: 'Past customers who bought creatine',       type: 'text' },
      { key: 'goal',     label: 'Campaign Goal',       placeholder: 'Drive $15k in sales, clear spring inventory', type: 'text' },
    ],
    buildPrompt: (f) => `You are an email marketing expert for MAXD Wellness, a DTC supplement brand.

Product/Promotion: ${f.product}
Audience: ${f.audience}
Goal: ${f.goal}

Write a 5-email campaign. For each: subject line + A/B variant, preview text, full body copy.

## Email 1: Announcement (Day 1)
## Email 2: The Why (Day 2)
## Email 3: Social Proof (Day 3)
## Email 4: Urgency (Day 4 — 24hrs left)
## Email 5: Last Chance (Day 5 — final hours)`,
  },
  {
    id: 'product-launch', icon: '🚀', name: 'Launch Kit', color: '#0CA678',
    desc: 'Enter a product and get a complete launch kit: product copy, 3 ad angles, email, and social captions.',
    fields: [
      { key: 'product',   label: 'Product Name',            placeholder: 'MAXD Creatine HCl 500g',                   type: 'text' },
      { key: 'keyPoints', label: 'Key Features / Benefits', placeholder: 'No bloat, faster absorption, 3g per serving', type: 'textarea' },
      { key: 'price',     label: 'Price',                   placeholder: '$49.99',                                     type: 'text' },
      { key: 'audience',  label: 'Target Audience',         placeholder: 'Serious athletes who want no water retention', type: 'text' },
    ],
    buildPrompt: (f) => `You are a DTC product launch expert for MAXD Wellness.

Product: ${f.product} | Price: ${f.price}
Key features/benefits: ${f.keyPoints}
Audience: ${f.audience}

Generate a complete launch kit:

## Shopify Product Description
(Headline + 2-sentence intro + 5 benefit bullets + CTA. SEO-optimized.)

## 3 Ad Angles
(Each: angle name, Meta headline, primary text under 100 words, target audience)

## Launch Email
(Subject line + preview text + full body — excitement-driven, benefit-forward, clear CTA)

## Instagram Launch Caption
(Under 150 words, strong hook, 8 hashtags)

## TikTok Launch Hook (3 options)
(First 3 seconds — pick the catchiest)`,
  },
]

// ── Shared output renderer ────────────────────────────────────────────────────
function renderOutput(text, accentColor = 'var(--blue)') {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## '))
      return <div key={i} style={{ fontSize: 14, fontWeight: 700, color: accentColor, marginTop: i > 0 ? '1.1rem' : 0, marginBottom: '0.2rem', paddingTop: i > 0 ? '0.9rem' : 0, borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>{line.replace('## ', '')}</div>
    if (line.startsWith('**') && line.endsWith('**'))
      return <div key={i} style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.4rem' }}>{line.replace(/\*\*/g, '')}</div>
    if (line.startsWith('- '))
      return <div key={i} style={{ color: 'var(--text-secondary)', paddingLeft: '1rem', lineHeight: 1.65, fontSize: 13 }}>• {line.slice(2)}</div>
    if (line.startsWith('---'))
      return <div key={i} style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0' }} />
    if (line.trim() === '')
      return <div key={i} style={{ height: 5 }} />
    return <div key={i} style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 13 }}>{line}</div>
  })
}

// ── Shared input style ────────────────────────────────────────────────────────
const INP = {
  display: 'block', width: '100%', marginTop: 5,
  padding: '9px 12px',
  background: 'rgba(255,255,255,0.75)',
  border: '1.5px solid rgba(99,102,241,0.15)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 13,
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AIStudio() {
  const { user } = useAuth()
  const email = user?.email || ''

  // Navigation: { type: 'agent', id } | { type: 'template', cat }
  const [mode, setMode] = useState({ type: 'agent', id: 'repurpose' })

  // Template state
  const [selectedTmpl, setSelectedTmpl] = useState(null)
  const [productName, setProductName]   = useState('MAXD Recovery Gummies')
  const [keyBenefit, setKeyBenefit]     = useState('creatine gummies for faster muscle recovery')
  const [targetAudience, setTargetAudience] = useState('fitness-focused adults 25–40')
  const [tone, setTone]                 = useState('Energetic')

  // Agent state
  const [agentFields, setAgentFields] = useState({})

  // Shared output
  const [output, setOutput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [showSaved, setShowSaved]   = useState(false)
  const [copies, setCopies]     = useState(() => loadCopies(email))
  const streamRef = useRef('')

  const agent       = mode.type === 'agent' ? AGENTS.find(a => a.id === mode.id) : null
  const catTemplates = mode.type === 'template' ? TEMPLATES.filter(t => t.cat === mode.cat) : []
  const accentColor = agent?.color || (mode.cat && CAT_META[mode.cat]?.color) || 'var(--blue)'

  const switchMode = (m) => {
    setMode(m)
    setOutput(''); setError('')
    setSelectedTmpl(null)
    streamRef.current = ''
    setAgentFields({})
  }

  const isActive = (m) => {
    if (m.type !== mode.type) return false
    return m.type === 'agent' ? m.id === mode.id : m.cat === mode.cat
  }

  // ── Run ──
  const run = async () => {
    let prompt = ''
    if (agent) {
      const missing = agent.fields.filter(f => !agentFields[f.key]?.trim())
      if (missing.length) { setError(`Fill in: ${missing.map(f => f.label).join(', ')}`); return }
      prompt = agent.buildPrompt(agentFields)
    } else {
      if (!selectedTmpl) { setError('Pick a template above.'); return }
      prompt = selectedTmpl.prompt
        .replace(/\{productName\}/g, productName || 'the product')
        .replace(/\{keyBenefit\}/g, keyBenefit || 'improved performance')
        .replace(/\{targetAudience\}/g, targetAudience || 'health-conscious adults')
        .replace(/\{tone\}/g, tone.toLowerCase())
    }
    setStreaming(true); setOutput(''); setError('')
    streamRef.current = ''
    await streamChat({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: agent ? 2048 : 1024,
      onToken:  (t) => { streamRef.current += t; setOutput(streamRef.current) },
      onDone:   () => setStreaming(false),
      onError:  (err) => { setError(err || 'Something went wrong'); setStreaming(false) },
    })
  }

  const copyOutput = () => {
    navigator.clipboard.writeText(output)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const saveOutput = () => {
    const entry = { id: nid(), date: new Date().toISOString().split('T')[0], name: agent?.name || selectedTmpl?.name || 'Output', icon: agent?.icon || selectedTmpl?.icon || '📋', text: output }
    const next = [entry, ...copies]
    setCopies(next); saveCopies(email, next)
    setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2000)
  }

  const deleteCopy = (id) => { const next = copies.filter(c => c.id !== id); setCopies(next); saveCopies(email, next) }

  const runLabel = agent
    ? `Run ${agent.name}`
    : selectedTmpl
      ? `Generate — ${selectedTmpl.name}`
      : 'Select a template above'

  // ── Render ──
  return (
    <>
      <PageHeader
        title="MAXD AI"
        subtitle="Generate on-brand copy for social, email, ads, and more"
        accent="var(--purple)"
        tag="Intelligence"
      >
        <button
          onClick={() => setShowSaved(s => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 50,
            background: showSaved ? 'var(--navy)' : 'rgba(255,255,255,0.75)',
            border: '1.5px solid rgba(99,102,241,0.18)',
            color: showSaved ? '#fff' : 'var(--text-secondary)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          📋 Saved
          {copies.length > 0 && (
            <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 99, padding: '0 6px', fontSize: 11, fontWeight: 700 }}>
              {copies.length}
            </span>
          )}
        </button>
      </PageHeader>

      {/* ── Saved panel ── */}
      {showSaved && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem', animation: 'fadeUp 0.2s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>Saved Outputs</span>
            {copies.length > 0 && (
              <button onClick={() => { setCopies([]); saveCopies(email, []) }} style={{ fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Clear all
              </button>
            )}
          </div>
          {copies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: 13 }}>
              No saved outputs yet. Generate something and click Save.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {copies.map(c => (
                <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.9rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{c.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{c.date}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.5)', borderRadius: 6, padding: '8px 10px', maxHeight: 120, overflowY: 'auto' }}>
                    {c.text}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={() => navigator.clipboard.writeText(c.text)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border-mid)', background: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}>
                      Copy
                    </button>
                    <button onClick={() => deleteCopy(c.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', fontWeight: 500 }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Main layout: left rail + workspace ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* Left rail */}
        <div className="card" style={{ padding: '0.5rem', position: 'sticky', top: 16 }}>
          {/* Agents section */}
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '8px 10px 4px' }}>
            AI Agents
          </div>
          {AGENTS.map(a => {
            const active = isActive({ type: 'agent', id: a.id })
            return (
              <button
                key={a.id}
                onClick={() => switchMode({ type: 'agent', id: a.id })}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 7,
                  background: active ? `${a.color}12` : 'none',
                  border: 'none',
                  borderLeft: active ? `2.5px solid ${a.color}` : '2.5px solid transparent',
                  cursor: 'pointer', textAlign: 'left', marginBottom: 1,
                  transition: 'all 0.12s',
                }}
              >
                <span style={{ fontSize: 13, flexShrink: 0 }}>{a.icon}</span>
                <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--navy)' : 'var(--text-secondary)', lineHeight: 1.2 }}>
                  {a.name}
                </span>
              </button>
            )
          })}

          {/* Templates section */}
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '12px 10px 4px', marginTop: 4, borderTop: '1px solid var(--border)' }}>
            Templates
          </div>
          {Object.entries(CAT_META).map(([cat, meta]) => {
            const active = isActive({ type: 'template', cat })
            return (
              <button
                key={cat}
                onClick={() => switchMode({ type: 'template', cat })}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 7,
                  background: active ? `${meta.color}12` : 'none',
                  border: 'none',
                  borderLeft: active ? `2.5px solid ${meta.color}` : '2.5px solid transparent',
                  cursor: 'pointer', textAlign: 'left', marginBottom: 1,
                  transition: 'all 0.12s',
                }}
              >
                <span style={{ fontSize: 13, flexShrink: 0 }}>{meta.icon}</span>
                <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--navy)' : 'var(--text-secondary)' }}>
                  {cat}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
                  {TEMPLATES.filter(t => t.cat === cat).length}
                </span>
              </button>
            )
          })}
        </div>

        {/* Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Mode header */}
          <div className="card" style={{ padding: '1.1rem 1.25rem', borderTop: `3px solid ${accentColor}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: agent ? '1.25rem' : '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {agent?.icon || CAT_META[mode.cat]?.icon}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', letterSpacing: '0.02em' }}>
                  {agent?.name || `${mode.cat} Templates`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {agent?.desc || `Pick a template below, fill in your details, and generate.`}
                </div>
              </div>
            </div>

            {/* Template picker pills */}
            {mode.type === 'template' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1.25rem' }}>
                {catTemplates.map(t => {
                  const sel = selectedTmpl?.id === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTmpl(t)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 12px', borderRadius: 50,
                        background: sel ? accentColor : 'rgba(255,255,255,0.75)',
                        border: `1.5px solid ${sel ? accentColor : 'rgba(99,102,241,0.15)'}`,
                        color: sel ? '#fff' : 'var(--text-secondary)',
                        fontSize: 12, fontWeight: sel ? 700 : 500,
                        cursor: 'pointer', transition: 'all 0.12s',
                      }}
                    >
                      <span style={{ fontSize: 12 }}>{t.icon}</span>
                      {t.name}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Input fields */}
            <div style={{ display: 'grid', gridTemplateColumns: agent ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
              {agent ? (
                agent.fields.map(f => (
                  <label key={f.key} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
                    {f.label}
                    {f.type === 'textarea'
                      ? <textarea
                          value={agentFields[f.key] || ''}
                          onChange={e => setAgentFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          rows={4}
                          style={{ ...INP, resize: 'vertical', lineHeight: 1.5 }}
                        />
                      : <input
                          value={agentFields[f.key] || ''}
                          onChange={e => setAgentFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          style={INP}
                        />
                    }
                  </label>
                ))
              ) : (
                <>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Product Name
                    <input value={productName} onChange={e => setProductName(e.target.value)} style={INP} placeholder="MAXD Recovery Gummies" />
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Tone
                    <select value={tone} onChange={e => setTone(e.target.value)} style={INP}>
                      {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Key Benefit / Topic
                    <input value={keyBenefit} onChange={e => setKeyBenefit(e.target.value)} style={INP} placeholder="creatine gummies for faster muscle recovery" />
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Target Audience
                    <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} style={INP} placeholder="fitness-focused adults 25–40" />
                  </label>
                </>
              )}
            </div>

            {error && (
              <div style={{ marginTop: '0.75rem', padding: '8px 12px', background: 'rgba(226,27,77,0.08)', border: '1px solid rgba(226,27,77,0.2)', borderRadius: 8, fontSize: 12, color: '#B91C1C' }}>
                {error}
              </div>
            )}

            {/* Generate button — pill shaped like Apple CTA */}
            <button
              onClick={run}
              disabled={streaming || (mode.type === 'template' && !selectedTmpl)}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '11px',
                borderRadius: 50,
                border: 'none',
                background: streaming
                  ? `${accentColor}80`
                  : (mode.type === 'template' && !selectedTmpl)
                    ? 'var(--border)'
                    : accentColor,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: streaming || (mode.type === 'template' && !selectedTmpl) ? 'default' : 'pointer',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {streaming ? (
                <>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
                  Generating…
                </>
              ) : runLabel}
            </button>
          </div>

          {/* Output panel */}
          {(output || streaming) && (
            <div className="card" style={{ padding: '1.25rem', animation: 'fadeUp 0.2s ease both' }}>
              {/* Output toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {streaming && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor, animation: 'pulse 1s ease infinite' }} />
                  )}
                  <span style={{ fontSize: 11, fontWeight: 700, color: streaming ? accentColor : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                    {streaming ? 'Streaming…' : 'Output'}
                  </span>
                </div>
                {!streaming && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={saveOutput}
                      style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, border: '1.5px solid var(--border-mid)', background: savedFlash ? 'var(--green)' : 'var(--surface-2)', color: savedFlash ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s' }}
                    >
                      {savedFlash ? '✓ Saved' : 'Save'}
                    </button>
                    <button
                      onClick={copyOutput}
                      style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, border: '1.5px solid var(--border-mid)', background: copied ? accentColor : 'var(--surface-2)', color: copied ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s' }}
                    >
                      {copied ? '✓ Copied' : 'Copy all'}
                    </button>
                    <button
                      onClick={() => setOutput('')}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Rendered output */}
              <div style={{ lineHeight: 1.65 }}>
                {renderOutput(output, accentColor)}
                {streaming && (
                  <span style={{ display: 'inline-block', width: 2, height: 14, background: accentColor, marginLeft: 2, verticalAlign: 'middle', animation: 'agent-blink 0.75s steps(1) infinite' }} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
