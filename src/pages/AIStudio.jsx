import { useState, useMemo } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { getCredentials } from '../lib/credentials.js'

const COPIES_KEY = 'maxd_ai_copies'
const RECENT_KEY = 'maxd_ai_recent_templates'

// ── Templates ─────────────────────────────────────────────────────────────────
const TEMPLATES = [
  // Social Media
  { id: 'ig-caption',    cat: 'Social',   icon: '📸', name: 'Instagram Caption',       desc: 'Engaging caption with CTA and hashtags', prompt: `Write an Instagram caption for {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Include a clear call to action and 5–8 relevant hashtags. Keep it punchy — under 150 words.` },
  { id: 'tiktok-hook',   cat: 'Social',   icon: '🎵', name: 'TikTok Hook',              desc: 'First 3 seconds to stop the scroll',      prompt: `Write 3 different opening hook lines for a TikTok about {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Each hook should stop someone from scrolling in the first 3 seconds. Format: numbered list.` },
  { id: 'yt-title',      cat: 'Social',   icon: '▶',  name: 'YouTube Title + Desc',    desc: 'SEO-optimized title and description',     prompt: `Write a YouTube video title and description for a video about {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Title should be under 60 characters and SEO-optimized. Description should be 150–200 words with a CTA in the first 2 lines.` },
  { id: 'story-cta',     cat: 'Social',   icon: '⭕', name: 'Story CTA Slide',          desc: 'Short swipe-up or link-in-bio copy',      prompt: `Write 5 short Instagram/Facebook Story CTA slides for {productName}. Key benefit: {keyBenefit}. Tone: {tone}. Each should be under 10 words and drive action (swipe up / link in bio). Format: numbered list.` },

  // Email Marketing
  { id: 'email-subject', cat: 'Email',    icon: '✉️', name: 'Subject Line Variants',   desc: '5 subject line options to A/B test',      prompt: `Write 5 email subject line variants for a campaign about {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Mix styles: curiosity, urgency, benefit-led, question, bold claim. Include preview text for each.` },
  { id: 'email-welcome', cat: 'Email',    icon: '👋', name: 'Welcome Email',            desc: 'First email in a new subscriber sequence', prompt: `Write a welcome email for a new customer of {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Include: warm welcome, what to expect, one key benefit, and a soft CTA. Keep it under 200 words.` },
  { id: 'email-launch',  cat: 'Email',    icon: '🚀', name: 'Product Launch Email',     desc: 'Announce a new product or drop',          prompt: `Write a product launch email for {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Include: subject line, preheader, strong open, 3 key benefits, urgency element, and CTA. Aim for 200–250 words.` },
  { id: 'email-winback', cat: 'Email',    icon: '💌', name: 'Win-Back Email',           desc: 'Re-engage lapsed customers',              prompt: `Write a win-back email for lapsed customers of {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Acknowledge the time gap, restate the value, offer a reason to come back, and include a CTA. Under 200 words.` },

  // Ad Copy
  { id: 'meta-headline', cat: 'Ads',      icon: '📘', name: 'Meta Ad Headlines',       desc: '5 headline variants for Facebook/IG ads', prompt: `Write 5 Meta (Facebook/Instagram) ad headline variants for {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Each headline under 40 characters. Mix benefit-led, curiosity, urgency, and social proof angles.` },
  { id: 'meta-body',     cat: 'Ads',      icon: '📗', name: 'Meta Ad Primary Text',    desc: 'Full primary text for a Meta ad',         prompt: `Write primary text for a Meta ad promoting {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Hook in the first line, 2–3 benefit bullets, social proof element, and strong CTA. Under 125 words.` },
  { id: 'google-ad',     cat: 'Ads',      icon: '🔍', name: 'Google Search Ad',        desc: 'Headlines and descriptions for Google',   prompt: `Write a Google Search ad for {productName}. Key benefit: {keyBenefit}. Tone: {tone}. Format: 3 headlines (max 30 chars each), 2 descriptions (max 90 chars each). Include keywords naturally and end with a CTA.` },
  { id: 'tiktok-script', cat: 'Ads',      icon: '🎬', name: 'TikTok Ad Script',         desc: 'Paid UGC-style video script 15–30 sec',   prompt: `Write a 15–30 second TikTok ad script for {productName}. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Format: Hook (0–3s), Problem (3–8s), Solution (8–20s), CTA (last 5s). Written as natural UGC speech, not polished ad copy.` },

  // Product Content
  { id: 'prod-desc',     cat: 'Product',  icon: '📦', name: 'Product Description',     desc: 'Shopify-ready product page copy',         prompt: `Write a product description for {productName} to use on a Shopify product page. Key benefit: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Include: short punchy headline, 2–3 sentence intro, 4–5 benefit bullets, brief closing with CTA. SEO-friendly.` },
  { id: 'ingredient',    cat: 'Product',  icon: '🧪', name: 'Ingredient Callout',      desc: 'Feature a key ingredient with science',   prompt: `Write a short ingredient callout for {productName} to use on a product page or packaging. Key benefit: {keyBenefit}. Tone: {tone}. Include the ingredient name, what it does scientifically, why it matters for the customer. Under 80 words. Credible and clear.` },
  { id: 'faq',           cat: 'Product',  icon: '❓', name: 'FAQ Answer',              desc: 'Answer a common customer question',       prompt: `Write a helpful FAQ answer for {productName}. The question is about: {keyBenefit}. Target audience: {targetAudience}. Tone: {tone}. Be direct, reassuring, and under 100 words. Avoid sounding like a legal disclaimer.` },

  // Brand Voice
  { id: 'blog-intro',    cat: 'Brand',    icon: '📝', name: 'Blog Intro',              desc: 'First 150 words of a blog post',          prompt: `Write the opening paragraph (about 150 words) of a blog post about {keyBenefit} for {productName}. Target audience: {targetAudience}. Tone: {tone}. Hook the reader with a relatable problem or surprising fact, then transition into what the post will cover.` },
  { id: 'about-snippet', cat: 'Brand',    icon: '🏢', name: 'About Us Snippet',        desc: 'Short brand story for website or bio',    prompt: `Write a 100-word "About Us" snippet for {productName} brand. Key benefit: {keyBenefit}. Tone: {tone}. Capture the brand's mission, what makes it different, and who it's for. Avoid corporate clichés.` },

  // B2B Sales Outreach
  { id: 'sales-cold',       cat: 'Sales', icon: '🧊', name: 'Cold Outreach Email',       desc: 'First-touch email to a new prospect',          prompt: `Write a cold B2B outreach email from a supplement brand rep at {productName} to {targetAudience}. We sell: {keyBenefit}. Tone: {tone}. Keep it under 120 words. Lead with a specific observation about their business, not a generic compliment. One clear CTA — ask for a 15-minute call or a sample. No attachments mentioned. Subject line included.` },
  { id: 'sales-warm',       cat: 'Sales', icon: '🔥', name: 'Warm Follow-Up Email',      desc: 'Follow up after first contact or meeting',     prompt: `Write a warm follow-up email for {productName}. We previously connected with {targetAudience} about: {keyBenefit}. Tone: {tone}. Reference the prior conversation naturally, add one new piece of value (a stat, case study, or insight), and move toward a next step. Under 150 words. Subject line included.` },
  { id: 'sales-hot',        cat: 'Sales', icon: '⚡', name: 'Hot Lead Closing Email',    desc: 'Push a warm lead to a decision',               prompt: `Write a closing email for a hot B2B lead at {productName}. The prospect is {targetAudience} and we're discussing: {keyBenefit}. Tone: {tone}. Create gentle urgency (limited inventory, promo window, or season), make the ask clear and easy to say yes to, and remove any remaining friction. Under 150 words. Subject line included.` },
  { id: 'sales-followup',   cat: 'Sales', icon: '⏰', name: 'No Response Follow-Up',     desc: 'Re-engage a prospect who went quiet',          prompt: `Write a "just checking in" follow-up email for {productName} to a prospect ({targetAudience}) who hasn't responded in 1–2 weeks. Topic: {keyBenefit}. Tone: {tone}. Be direct, not desperate. Acknowledge they're busy, restate the value in one sentence, and give them an easy out or an easy yes. Under 100 words. Subject line included.` },
  { id: 'sales-partnership', cat: 'Sales', icon: '🤝', name: 'Partnership Proposal',    desc: 'Propose a wholesale or retail partnership',    prompt: `Write a partnership proposal email for {productName} targeting {targetAudience}. The opportunity: {keyBenefit}. Tone: {tone}. Frame it as a win for their business (margins, customer value, exclusivity if applicable). Include: what we offer, why it fits their business, suggested next step. 200–250 words. Subject line included.` },
  { id: 'sales-event',      cat: 'Sales', icon: '🎪', name: 'Event Follow-Up',           desc: 'Follow up after a trade show or event',        prompt: `Write a post-event follow-up email for {productName}. We met {targetAudience} at {keyBenefit} (fill in event name). Tone: {tone}. Remind them of the conversation, reference any samples or materials shared, and push toward a next concrete step (call, sample order, meeting). Under 150 words. Subject line included.` },
  { id: 'sales-intro',      cat: 'Sales', icon: '👋', name: 'Intro + Sample Offer',      desc: 'Offer free samples to open a conversation',    prompt: `Write a B2B intro email for {productName} offering free samples to {targetAudience}. We make: {keyBenefit}. Tone: {tone}. Lead with the free sample offer, explain why their customers would love it, and make claiming it dead simple. Under 120 words. Subject line included.` },
  { id: 'sales-wholesale',  cat: 'Sales', icon: '📦', name: 'Wholesale Pricing Email',   desc: 'Share wholesale terms and pricing overview',   prompt: `Write a wholesale pricing overview email for {productName} to {targetAudience}. Product/opportunity: {keyBenefit}. Tone: {tone}. Cover: our wholesale program basics, typical margin %, MOQ, lead time, and support we provide. End with a CTA to schedule a call or request a full price list. 200 words. Subject line included.` },
  { id: 'sales-gym',        cat: 'Sales', icon: '🏋️', name: 'Gym / Studio Pitch',       desc: 'Pitch a gym or CrossFit box on stocking MAXD',  prompt: `Write a sales pitch email to the owner of {targetAudience} (a gym or fitness studio) about stocking {productName}. Key selling point: {keyBenefit}. Tone: {tone}. Speak their language — members love performance supplements, it adds revenue without extra staff, and we handle restocking. Under 175 words. Subject line included.` },
  { id: 'sales-linkedin',   cat: 'Sales', icon: '💼', name: 'LinkedIn DM',               desc: 'Short DM to open a B2B conversation on LinkedIn', prompt: `Write a LinkedIn DM to {targetAudience} about {productName}. Key hook: {keyBenefit}. Tone: {tone}. Max 75 words. No pitching in the first message — make it a genuine, specific observation that invites a response. Conversational, not salesy.` },
]

const CATEGORIES = ['All', 'Social', 'Email', 'Ads', 'Product', 'Brand', 'Sales']
const TONES = ['Energetic', 'Scientific', 'Casual', 'Premium', 'Motivational', 'Educational', 'Direct & Professional']
const CAT_ICONS = { Social: '📱', Email: '✉️', Ads: '💰', Product: '📦', Brand: '🏷️', Sales: '🤝', All: '⚡' }

function loadCopies() { try { return JSON.parse(localStorage.getItem(COPIES_KEY) || '[]') } catch { return [] } }
function saveCopies(d) { localStorage.setItem(COPIES_KEY, JSON.stringify(d)) }
function loadRecent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] } }
function saveRecent(d) { localStorage.setItem(RECENT_KEY, JSON.stringify(d)) }
function getApiKey() { return getCredentials('anthropic')?.apiKey?.trim() || '' }
function nid() { return `c_${Date.now()}_${Math.random().toString(36).slice(2,5)}` }

const inp = { display: 'block', width: '100%', marginTop: 4, padding: '0.45rem 0.6rem', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }
const btnPrimary = { background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.1rem', fontSize: 14, cursor: 'pointer', fontWeight: 600 }
const btnGhost = { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 1rem', fontSize: 14, cursor: 'pointer' }

function TemplateCard({ tmpl, selected, onSelect, isRecent }) {
  return (
    <div onClick={() => onSelect(tmpl)} style={{ padding: '0.75rem', background: selected ? 'var(--navy)' : 'var(--surface)', border: `1px solid ${selected ? 'var(--navy)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={e => !selected && (e.currentTarget.style.borderColor = 'var(--border-mid)')}
      onMouseLeave={e => !selected && (e.currentTarget.style.borderColor = 'var(--border)')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 14 }}>{tmpl.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: selected ? '#fff' : 'var(--text-primary)' }}>{tmpl.name}</span>
        {isRecent && <span style={{ marginLeft: 'auto', fontSize: 10, color: selected ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 4 }}>recent</span>}
      </div>
      <div style={{ fontSize: 11, color: selected ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)' }}>{tmpl.desc}</div>
    </div>
  )
}

// ── AI Agents ──────────────────────────────────────────────────────────────────
const AGENTS = [
  {
    id: 'repurpose',
    icon: '♻️',
    name: 'Content Repurposer',
    tagline: 'Write once, post everywhere',
    desc: 'Turn one script or idea into ready-to-post content for every platform simultaneously.',
    color: '#8b5cf6',
    fields: [
      { key: 'script',   label: 'Script or Idea',     placeholder: 'Paste your video script, hook, or content idea here…', type: 'textarea' },
      { key: 'product',  label: 'Product',             placeholder: 'MAXD Recovery Gummies',                                  type: 'text'     },
      { key: 'audience', label: 'Target Audience',     placeholder: 'Fitness-focused adults 25–40',                           type: 'text'     },
    ],
    buildPrompt: (f) => `You are a social media expert for a supplement brand called MAXD.

Given this script/idea:
"""
${f.script}
"""

Product: ${f.product}
Audience: ${f.audience}

Generate ALL of the following, clearly labeled with headers:

## Instagram Caption
(Under 150 words, punchy, 6 hashtags at the end)

## TikTok Caption
(Under 100 words, energetic, 4–5 trending hashtags)

## Email Subject Lines (3 Options)
(List 3 options with preview text for each)

## Meta Ad Headline (3 Options)
(Under 40 chars each, benefit-led)

## Meta Ad Primary Text
(Under 125 words, hook + 3 bullets + CTA)

## LinkedIn Post
(Professional tone, 150 words, ends with a question)

## Tweet / X Post
(Under 280 chars, punchy)

Be specific to the content, not generic. Match the energy of the original.`,
  },
  {
    id: 'sales-sequence',
    icon: '📬',
    name: 'Sales Email Sequence',
    tagline: 'Cold to closed in 3 emails',
    desc: 'Enter a prospect and get a personalized 3-email outreach sequence: cold intro, warm follow-up, and closing push.',
    color: '#E21B4D',
    fields: [
      { key: 'company',    label: 'Company Name',          placeholder: 'Iron Peak Fitness',                               type: 'text'     },
      { key: 'contactName',label: 'Contact Name & Title',  placeholder: 'Marcus Rivera, Owner',                            type: 'text'     },
      { key: 'theirBiz',   label: 'What They Do',          placeholder: 'High-traffic gym in Austin, TX with ~800 members', type: 'text'     },
      { key: 'offer',      label: 'What You\'re Pitching', placeholder: 'Wholesale floor display of MAXD Creatine Gummies', type: 'text'     },
      { key: 'sender',     label: 'Your Name & Role',      placeholder: 'Kyle Peterson, Founder @ MAXD Wellness',          type: 'text'     },
    ],
    buildPrompt: (f) => `You are a B2B sales expert writing outreach emails for MAXD Wellness, a supplement brand.

Company: ${f.company}
Contact: ${f.contactName}
Their business: ${f.theirBiz}
What we're pitching: ${f.offer}
Sender: ${f.sender}

Write a 3-email outreach sequence. Each email must have a subject line, preheader, and body. Be specific to their business — no generic lines.

---

## Email 1: Cold Intro
(Under 120 words. Lead with a specific insight about their business. One soft CTA — ask for a quick call or sample.)

---

## Email 2: Warm Follow-Up
(Send 5 days later if no response. Under 130 words. Reference Email 1 naturally. Add one new value point — a stat, case study, or angle they haven't considered. Push toward a response.)

---

## Email 3: Closing Push
(Send 4 days after Email 2. Under 110 words. Create gentle urgency. Give them an easy yes or an easy out. Professional, not desperate.)`,
  },
  {
    id: 'content-ideas',
    icon: '💡',
    name: 'Weekly Content Ideas',
    tagline: 'Never wonder what to post',
    desc: 'Tell it your products and goals and get 7 ready-to-execute content ideas with hooks, platform recommendations, and angles.',
    color: '#f59e0b',
    fields: [
      { key: 'products',   label: 'Current Products',    placeholder: 'Creatine Gummies 30ct, 60ct, Recovery Bundles',    type: 'text'     },
      { key: 'goals',      label: 'This Week\'s Goals',  placeholder: 'Drive spring bundle sales, grow TikTok',           type: 'text'     },
      { key: 'recent',     label: 'Recent Posts (skip)', placeholder: 'Before/after transformation, ingredient breakdown', type: 'text'     },
      { key: 'audience',   label: 'Audience',            placeholder: 'Gym-goers, CrossFit athletes, health-conscious adults', type: 'text' },
    ],
    buildPrompt: (f) => `You are a content strategist for MAXD Wellness, a supplement brand (creatine gummies).

Products: ${f.products}
This week's goals: ${f.goals}
Recent content to avoid repeating: ${f.recent}
Audience: ${f.audience}

Generate 7 content ideas for this week. For each idea, provide:

**Idea [#]: [Title]**
- Platform: (Instagram Reel / TikTok / YouTube Short / Carousel / Story / etc.)
- Hook: (The exact first line or opening 3 seconds)
- Angle: (What makes it shareable — education, entertainment, social proof, urgency, etc.)
- CTA: (What you want them to do)
- Notes: (Any specific tips for filming or writing this one)

Mix content types: educational, entertaining, social proof, product-focused, lifestyle. Prioritize the week's goals.`,
  },
  {
    id: 'email-campaign',
    icon: '📧',
    name: 'Email Campaign Builder',
    tagline: 'Full campaign in one shot',
    desc: 'Give it a product or promotion and get a complete 5-email campaign flow — welcome, benefit, social proof, urgency, and last chance.',
    color: '#3b82f6',
    fields: [
      { key: 'product',    label: 'Product / Promotion',   placeholder: 'Spring Bundle — 20% off for 72 hours',           type: 'text'     },
      { key: 'audience',   label: 'Email List Segment',    placeholder: 'Past customers who bought creatine',              type: 'text'     },
      { key: 'goal',       label: 'Campaign Goal',         placeholder: 'Drive $15k in sales, clear spring inventory',    type: 'text'     },
      { key: 'listSize',   label: 'Approx. List Size',     placeholder: '8,000 subscribers',                              type: 'text'     },
    ],
    buildPrompt: (f) => `You are an email marketing expert for MAXD Wellness, a DTC supplement brand.

Product/Promotion: ${f.product}
Audience segment: ${f.audience}
Campaign goal: ${f.goal}
List size: ${f.listSize}

Write a complete 5-email campaign sequence. For each email:
- Subject line (and 1 A/B variant)
- Preview text (under 90 chars)
- Full body copy (formatted, ready to send)

---

## Email 1: Announcement (Send Day 1)
(Build excitement, introduce the offer clearly, strong CTA)

---

## Email 2: The Why (Send Day 2)
(Educate on the product/benefit. Less selling, more value. Soft CTA)

---

## Email 3: Social Proof (Send Day 3)
(Customer story or results. Build trust. Remind of offer.)

---

## Email 4: Urgency (Send Day 4 — 24hrs left)
(Create genuine urgency. Countdown framing. Strong CTA.)

---

## Email 5: Last Chance (Send Day 5 — final hours)
(Short and direct. Last call. No fluff. Hard CTA.)`,
  },
  {
    id: 'product-launch',
    icon: '🚀',
    name: 'Product Launch Kit',
    tagline: 'Everything you need for launch day',
    desc: 'Enter a new product and get a complete launch kit: press blurb, product description, 3 ad angles, email announcement, and social captions.',
    color: '#22c55e',
    fields: [
      { key: 'product',     label: 'Product Name',         placeholder: 'MAXD Creatine HCl 500g',                         type: 'text'     },
      { key: 'keyPoints',   label: 'Key Features / Benefits', placeholder: 'No bloat, faster absorption, 3g per serving', type: 'textarea' },
      { key: 'price',       label: 'Price',                placeholder: '$49.99',                                         type: 'text'     },
      { key: 'audience',    label: 'Target Audience',      placeholder: 'Serious athletes who want creatine without water retention', type: 'text' },
    ],
    buildPrompt: (f) => `You are a DTC product launch expert for MAXD Wellness, a supplement brand.

New product: ${f.product}
Key features/benefits: ${f.keyPoints}
Price: ${f.price}
Target audience: ${f.audience}

Generate a complete product launch kit with all of the following:

## Press / PR Blurb (150 words)
(For press releases, media kits, or influencer briefs)

## Shopify Product Description
(Headline + 2-sentence intro + 5 benefit bullets + closing CTA. SEO-optimized.)

## 3 Ad Angles
(Each with: Angle name, Meta headline, primary text under 100 words, and which audience it targets)

## Launch Email (Send to full list)
(Subject line + preview text + full email body — excitement-driven, benefit-forward, clear CTA)

## Instagram Launch Caption
(Under 150 words, strong hook, 8 hashtags)

## TikTok Launch Hook (3 options)
(First 3 seconds for a launch video — pick the catchiest)`,
  },
]

// ── Single Agent Runner ─────────────────────────────────────────────────────
function AgentRunner({ agent, apiKey }) {
  const [fields, setFields] = useState({})
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const set = (k, v) => setFields(f => ({ ...f, [k]: v }))

  const run = async () => {
    const missing = agent.fields.filter(f => !fields[f.key]?.trim())
    if (missing.length) { setError(`Fill in: ${missing.map(f => f.label).join(', ')}`); return }
    if (!apiKey) { setError('No API key — go to Settings → Integrations → Anthropic'); return }
    setRunning(true); setResult(''); setError('')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          messages: [{ role: 'user', content: agent.buildPrompt(fields) }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || `API error ${res.status}`)
      setResult(data.content?.[0]?.text || '')
    } catch (e) { setError(e.message || 'Something went wrong') }
    finally { setRunning(false) }
  }

  const copy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const inp = { display: 'block', width: '100%', marginTop: 4, padding: '0.5rem 0.65rem', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }

  // Render markdown-ish headers in output
  const renderOutput = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <div key={i} style={{ fontSize: 15, fontWeight: 700, color: agent.color, marginTop: i > 0 ? '1.25rem' : 0, marginBottom: '0.25rem', paddingTop: i > 0 ? '1rem' : 0, borderTop: i > 0 ? `1px solid var(--border)` : 'none' }}>{line.replace('## ', '')}</div>
      if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.5rem' }}>{line.replace(/\*\*/g, '')}</div>
      if (line.startsWith('- ')) return <div key={i} style={{ color: 'var(--text-secondary)', paddingLeft: '1rem', lineHeight: 1.6, fontSize: 13 }}>• {line.slice(2)}</div>
      if (line.trim() === '') return <div key={i} style={{ height: 6 }} />
      return <div key={i} style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 13 }}>{line}</div>
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.25rem', alignItems: 'start' }}>
      {/* Input panel */}
      <div style={{ background: 'var(--surface-2)', border: `1px solid ${agent.color}44`, borderRadius: 10, padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
          <span style={{ fontSize: 20 }}>{agent.icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{agent.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{agent.tagline}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {agent.fields.map(f => (
            <label key={f.key} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {f.label}
              {f.type === 'textarea'
                ? <textarea value={fields[f.key] || ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} rows={4} style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
                : <input value={fields[f.key] || ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} style={inp} />
              }
            </label>
          ))}
        </div>
        {error && <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, color: '#991b1b' }}>{error}</div>}
        <button onClick={run} disabled={running || !apiKey} style={{ marginTop: '1rem', width: '100%', padding: '0.6rem', background: agent.color, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: running || !apiKey ? 'not-allowed' : 'pointer', opacity: running || !apiKey ? 0.6 : 1 }}>
          {running ? '⏳ Running agent…' : `▶ Run ${agent.name}`}
        </button>
        {!apiKey && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>Connect Anthropic in Settings first</div>}
      </div>

      {/* Output panel */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', minHeight: 400 }}>
        {!result && !running && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 350, color: 'var(--text-muted)', gap: '0.75rem' }}>
            <div style={{ fontSize: 40 }}>{agent.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{agent.desc}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 320, textAlign: 'center', lineHeight: 1.6 }}>
              Fill in the fields on the left and click Run to generate your full output.
            </div>
          </div>
        )}
        {running && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 350, flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${agent.color}33`, borderTopColor: agent.color, animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Agent is working…</div>
          </div>
        )}
        {result && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem', gap: '0.5rem' }}>
              <button onClick={copy} style={{ padding: '0.35rem 0.8rem', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                {copied ? '✅ Copied all' : '📋 Copy all'}
              </button>
              <button onClick={() => setResult('')} style={{ padding: '0.35rem 0.8rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>
                Clear
              </button>
            </div>
            <div style={{ lineHeight: 1.6 }}>
              {renderOutput(result)}
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Agents Tab ──────────────────────────────────────────────────────────────
function AgentsTab({ apiKey }) {
  const [activeAgent, setActiveAgent] = useState(AGENTS[0].id)
  const agent = AGENTS.find(a => a.id === activeAgent)

  return (
    <div>
      {/* Agent selector */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {AGENTS.map(a => (
          <button key={a.id} onClick={() => setActiveAgent(a.id)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 1rem',
            background: activeAgent === a.id ? a.color : 'var(--surface-2)',
            border: `1px solid ${activeAgent === a.id ? a.color : 'var(--border)'}`,
            borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 16 }}>{a.icon}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: activeAgent === a.id ? '#fff' : 'var(--text-primary)' }}>{a.name}</div>
              <div style={{ fontSize: 10, color: activeAgent === a.id ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{a.tagline}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Active agent */}
      {agent && <AgentRunner key={agent.id} agent={agent} apiKey={apiKey} />}
    </div>
  )
}

export default function AIStudio() {
  const [tab, setTab] = useState('generate')
  const [catFilter, setCatFilter] = useState('All')
  const [selectedTmpl, setSelectedTmpl] = useState(null)
  const [productName, setProductName] = useState('MAXD Recovery Gummies')
  const [keyBenefit, setKeyBenefit] = useState('creatine gummies for faster muscle recovery')
  const [targetAudience, setTargetAudience] = useState('fitness-focused adults 25–40')
  const [tone, setTone] = useState('Energetic')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copies, setCopies] = useState(loadCopies)
  const [recent, setRecent] = useState(loadRecent)
  const [copied, setCopied] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const apiKey = getApiKey()

  const filteredTemplates = useMemo(() => {
    return catFilter === 'All' ? TEMPLATES : TEMPLATES.filter(t => t.cat === catFilter)
  }, [catFilter])

  const selectTemplate = (tmpl) => {
    setSelectedTmpl(tmpl)
    setOutput('')
    setError('')
    const next = [tmpl.id, ...recent.filter(id => id !== tmpl.id)].slice(0, 8)
    setRecent(next)
    saveRecent(next)
  }

  const buildPrompt = () => {
    if (!selectedTmpl) return ''
    return selectedTmpl.prompt
      .replace(/\{productName\}/g, productName || 'the product')
      .replace(/\{keyBenefit\}/g, keyBenefit || 'improved performance')
      .replace(/\{targetAudience\}/g, targetAudience || 'health-conscious adults')
      .replace(/\{tone\}/g, tone.toLowerCase())
  }

  const generate = async () => {
    if (!apiKey) { setError('No API key found. Go to Settings → Integrations to add your Anthropic API key.'); return }
    if (!selectedTmpl) { setError('Select a template first.'); return }
    setLoading(true); setError(''); setOutput('')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, messages: [{ role: 'user', content: buildPrompt() }] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || `API error ${res.status}`)
      setOutput(data.content?.[0]?.text || '')
    } catch (e) {
      setError(e.message || 'Something went wrong. Check your API key.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const saveCopy = () => {
    const entry = { id: nid(), date: new Date().toISOString().split('T')[0], templateId: selectedTmpl.id, templateName: selectedTmpl.name, cat: selectedTmpl.cat, icon: selectedTmpl.icon, productName, text: output }
    const next = [entry, ...copies]
    setCopies(next); saveCopies(next)
    setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2000)
  }

  const deleteCopy = (id) => { const next = copies.filter(c => c.id !== id); setCopies(next); saveCopies(next) }

  const tabStyle = (t) => ({
    padding: '0.45rem 1rem', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500,
    background: tab === t ? 'var(--navy)' : 'transparent',
    color: tab === t ? '#fff' : 'var(--text-secondary)',
    border: tab === t ? 'none' : '1px solid var(--border)',
  })

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader title="AI Studio" subtitle="Generate on-brand copy for social, email, ads & more" />

      {!apiKey && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: 14, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🔑</span>
          <span>No Anthropic API key found. Go to <strong>Settings → Integrations</strong> and connect Anthropic to enable generation.</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button style={tabStyle('agents')} onClick={() => setTab('agents')}>
          🤖 Agents <span style={{ fontSize: 10, background: '#E21B4D', color: '#fff', padding: '1px 5px', borderRadius: 4, marginLeft: 4, fontWeight: 700 }}>NEW</span>
        </button>
        <button style={tabStyle('generate')} onClick={() => setTab('generate')}>✨ Templates</button>
        <button style={tabStyle('saved')} onClick={() => setTab('saved')}>
          📋 Saved {copies.length > 0 && <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '0 6px', marginLeft: 4, fontSize: 12 }}>{copies.length}</span>}
        </button>
      </div>

      {tab === 'agents' && <AgentsTab apiKey={apiKey} />}

      {tab === 'generate' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Template browser */}
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: '0.75rem' }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCatFilter(c)} style={{ padding: '0.3rem 0.65rem', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: catFilter === c ? 600 : 400, background: catFilter === c ? 'var(--navy)' : 'var(--surface-3)', color: catFilter === c ? '#fff' : 'var(--text-secondary)', border: 'none' }}>
                  {CAT_ICONS[c]} {c}
                </button>
              ))}
            </div>

            {catFilter === 'All' && recent.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: '0.4rem' }}>Recently Used</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '0.75rem' }}>
                  {recent.slice(0, 3).map(id => {
                    const t = TEMPLATES.find(x => x.id === id)
                    return t ? <TemplateCard key={t.id} tmpl={t} selected={selectedTmpl?.id === t.id} onSelect={selectTemplate} isRecent /> : null
                  })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: '0.4rem' }}>All Templates</div>
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 500, overflowY: 'auto', paddingRight: 2 }}>
              {filteredTemplates.map(t => <TemplateCard key={t.id} tmpl={t} selected={selectedTmpl?.id === t.id} onSelect={selectTemplate} />)}
            </div>
          </div>

          {/* Editor + output */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {selectedTmpl ? `${selectedTmpl.icon} ${selectedTmpl.name}` : 'Select a template to start'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Product Name
                  <input value={productName} onChange={e => setProductName(e.target.value)} style={inp} />
                </label>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tone
                  <select value={tone} onChange={e => setTone(e.target.value)} style={inp}>
                    {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Key Benefit / Topic
                  <input value={keyBenefit} onChange={e => setKeyBenefit(e.target.value)} style={inp} />
                </label>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Target Audience
                  <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} style={inp} />
                </label>
              </div>

              {selectedTmpl && (
                <div style={{ marginTop: '0.75rem', background: 'var(--surface-3)', borderRadius: 6, padding: '0.6rem 0.75rem' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>PROMPT PREVIEW</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{buildPrompt()}</div>
                </div>
              )}

              <button onClick={generate} disabled={loading || !selectedTmpl || !apiKey} style={{ ...btnPrimary, marginTop: '0.75rem', opacity: (!selectedTmpl || !apiKey) ? 0.5 : 1, width: '100%' }}>
                {loading ? '⏳ Generating…' : '✨ Generate Copy'}
              </button>
            </div>

            {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem', fontSize: 13, color: '#991b1b' }}>{error}</div>}

            {output && (
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output</div>
                <textarea readOnly value={output} style={{ ...inp, minHeight: 180, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit', marginTop: 0 }} />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button onClick={copyToClipboard} style={btnPrimary}>{copied ? '✅ Copied!' : '📋 Copy'}</button>
                  <button onClick={saveCopy} style={btnGhost}>{savedFlash ? '✅ Saved!' : '💾 Save'}</button>
                  <button onClick={() => { setOutput(''); setError('') }} style={{ ...btnGhost, marginLeft: 'auto' }}>Clear</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'saved' && (
        <div>
          {copies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: '0.5rem' }}>📋</div>
              <div>No saved copies yet. Generate something and click Save.</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                <button onClick={() => { setCopies([]); saveCopies([]) }} style={{ ...btnGhost, color: 'var(--red)', borderColor: 'var(--red)', fontSize: 12 }}>Clear All</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {copies.map(c => (
                  <div key={c.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
                      <span>{c.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.templateName}</span>
                      <span style={{ fontSize: 11, background: 'var(--surface-3)', color: 'var(--text-muted)', padding: '2px 7px', borderRadius: 4 }}>{c.cat}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.productName}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{c.date}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--surface-3)', borderRadius: 6, padding: '0.6rem 0.75rem', maxHeight: 160, overflowY: 'auto' }}>
                      {c.text}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                      <button onClick={() => navigator.clipboard.writeText(c.text)} style={{ ...btnGhost, fontSize: 12, padding: '0.3rem 0.75rem' }}>📋 Copy</button>
                      <button onClick={() => deleteCopy(c.id)} style={{ ...btnGhost, fontSize: 12, padding: '0.3rem 0.75rem', color: 'var(--red)', borderColor: 'var(--red)' }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
