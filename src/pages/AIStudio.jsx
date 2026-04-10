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
]

const CATEGORIES = ['All', 'Social', 'Email', 'Ads', 'Product', 'Brand']
const TONES = ['Energetic', 'Scientific', 'Casual', 'Premium', 'Motivational', 'Educational']
const CAT_ICONS = { Social: '📱', Email: '✉️', Ads: '💰', Product: '📦', Brand: '🏷️', All: '⚡' }

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
        <button style={tabStyle('generate')} onClick={() => setTab('generate')}>✨ Generate</button>
        <button style={tabStyle('saved')} onClick={() => setTab('saved')}>
          📋 Saved {copies.length > 0 && <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '0 6px', marginLeft: 4, fontSize: 12 }}>{copies.length}</span>}
        </button>
      </div>

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
