import { useState } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { generateWithClaude, MAXD_SYSTEM_PROMPT } from '../lib/api.js'

const CONTENT_TYPES = [
  { id: 'script',   label: 'Video Script',     icon: '▶', desc: 'Full short-form script with hook, problem, value, product plug, payoff, and CTA' },
  { id: 'caption',  label: 'Social Caption',   icon: '✎', desc: 'Platform-optimized captions for Instagram, TikTok, or Facebook' },
  { id: 'email',    label: 'Email Copy',        icon: '✉', desc: 'Email for TOFU/MOFU/BOFU — welcome, nurture, or conversion sequences' },
  { id: 'ad',       label: 'Ad Copy',           icon: '$', desc: 'Short-form ad copy using BAB, PAS, or 4Ps framework' },
  { id: 'repurpose',label: 'Repurpose Script',  icon: '↻', desc: 'Turn one script into 4 content variants (caption, email, tweet, IG post)' },
]

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Email']
const FUNNELS   = ['TOFU — Awareness', 'MOFU — Trust', 'BOFU — Conversion']
const FRAMEWORKS = ['BAB (Before-After-Bridge)', 'PAS (Problem-Agitate-Solve)', '4Ps (Promise-Picture-Proof-Push)']

function buildPrompt(type, topic, platform, funnel, framework) {
  const funnelTag = funnel.split('—')[0].trim()
  const fwTag = framework.split('(')[0].trim()

  if (type === 'script') {
    return `Write a complete short-form video script for MAXD Wellness about: "${topic}"
Platform: ${platform} | Funnel stage: ${funnelTag}
Use the MAXD video framework exactly: Hook (0-3s) → Problem (3-8s) → Value (8-25s) → Product Integration (natural plug for creatine gummies) → Payoff (25-35s) → CTA
Include VERBAL HOOK, WRITTEN HOOK, VISUAL DIRECTION, and CAPTION for ${platform}.`
  }
  if (type === 'caption') {
    return `Write a ${platform} caption for MAXD Wellness about: "${topic}"
Funnel stage: ${funnelTag}. Include a hook, value, and CTA. Add relevant hashtags.`
  }
  if (type === 'email') {
    return `Write a ${funnelTag} email for MAXD Wellness about: "${topic}"
Include: subject line, preview text, body copy, and CTA button text.
Use ${fwTag} framework. Keep it mobile-friendly and under 200 words body.`
  }
  if (type === 'ad') {
    return `Write ad copy for MAXD Wellness for ${platform} about: "${topic}"
Funnel: ${funnelTag}. Framework: ${fwTag}.
Include: primary text, headline, description, and CTA.`
  }
  if (type === 'repurpose') {
    return `Repurpose this script/idea into 4 content variants for MAXD Wellness:
Topic: "${topic}"
Generate: 1) TikTok caption with hooks and hashtags, 2) Instagram caption, 3) Email newsletter intro paragraph, 4) Short tweet/X post.
Label each clearly.`
  }
  return `Create ${type} content for MAXD Wellness about: "${topic}"`
}

export default function AIStudio() {
  const [type,      setType]      = useState('script')
  const [topic,     setTopic]     = useState('')
  const [platform,  setPlatform]  = useState('Instagram')
  const [funnel,    setFunnel]    = useState('TOFU — Awareness')
  const [framework, setFramework] = useState('BAB (Before-After-Bridge)')
  const [output,    setOutput]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const generate = async () => {
    if (!topic.trim()) { setError('Enter a topic or idea first.'); return }
    setError('')
    setLoading(true)
    setOutput('')
    try {
      const prompt = buildPrompt(type, topic, platform, funnel, framework)
      const result = await generateWithClaude(MAXD_SYSTEM_PROMPT, prompt)
      setOutput(result)
    } catch (e) {
      setError('Generation failed. Check your Anthropic API key in .env')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const copyOutput = () => navigator.clipboard.writeText(output)

  return (
    <div>
      <PageHeader
        title="AI Studio"
        subtitle="Generate on-brand content using Claude — scripts, captions, emails, ads"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

        {/* Left — Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Content type selector */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', letterSpacing: '0.06em', marginBottom: 10, textTransform: 'uppercase' }}>Content type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CONTENT_TYPES.map(ct => (
                <button key={ct.id} onClick={() => setType(ct.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 'var(--radius)',
                  border: type === ct.id ? '1.5px solid var(--red)' : '1px solid var(--gray-100)',
                  background: type === ct.id ? '#FDE8EE' : 'var(--gray-50)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s',
                }}>
                  <span style={{ fontSize: 16, color: type === ct.id ? 'var(--red)' : 'var(--gray-400)', width: 20 }}>{ct.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: type === ct.id ? 'var(--navy)' : 'var(--gray-800)' }}>{ct.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1 }}>{ct.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Parameters</div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-600)', display: 'block', marginBottom: 5 }}>Topic / idea</label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. The cost of waiting to start your fitness journey"
                rows={3}
                style={{
                  width: '100%', padding: '8px 10px',
                  border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)',
                  fontSize: 13, resize: 'vertical', fontFamily: 'var(--font-body)',
                  outline: 'none', background: 'var(--white)',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-600)', display: 'block', marginBottom: 5 }}>Platform</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: 13, background: 'var(--white)' }}>
                  {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-600)', display: 'block', marginBottom: 5 }}>Funnel stage</label>
                <select value={funnel} onChange={e => setFunnel(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: 13, background: 'var(--white)' }}>
                  {FUNNELS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>

            {(type === 'ad' || type === 'email') && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-600)', display: 'block', marginBottom: 5 }}>Copy framework</label>
                <select value={framework} onChange={e => setFramework(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: 13, background: 'var(--white)' }}>
                  {FRAMEWORKS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            )}

            {error && <div style={{ fontSize: 12, color: 'var(--red)', background: '#FDE8EE', padding: '8px 10px', borderRadius: 'var(--radius)' }}>{error}</div>}

            <button onClick={generate} disabled={loading} style={{
              padding: '10px', borderRadius: 'var(--radius)',
              background: loading ? 'var(--gray-200)' : 'var(--navy)',
              color: loading ? 'var(--gray-400)' : 'var(--white)',
              border: 'none', fontFamily: 'var(--font-heading)',
              fontSize: 14, fontWeight: 600, letterSpacing: '0.08em',
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.12s',
            }}>
              {loading ? 'GENERATING...' : '✦ GENERATE CONTENT'}
            </button>
          </div>
        </div>

        {/* Right — Output */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Output</div>
            {output && (
              <button onClick={copyOutput} style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 6,
                border: '1px solid var(--gray-200)', background: 'var(--white)',
                cursor: 'pointer', color: 'var(--gray-600)',
              }}>
                Copy
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--gray-400)' }}>
              <div style={{ fontSize: 28 }}>✦</div>
              <div style={{ fontSize: 13 }}>Claude is generating...</div>
            </div>
          ) : output ? (
            <pre style={{
              flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontSize: 13, lineHeight: 1.75, color: 'var(--gray-800)',
              fontFamily: 'var(--font-body)', margin: 0,
              borderTop: '1px solid var(--gray-100)', paddingTop: 12,
              overflowY: 'auto', maxHeight: 600,
            }}>
              {output}
            </pre>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--gray-400)' }}>
              <div style={{ fontSize: 36, opacity: 0.3 }}>✦</div>
              <div style={{ fontSize: 13 }}>Your content will appear here</div>
              <div style={{ fontSize: 11, textAlign: 'center', maxWidth: 220 }}>Select a content type, enter your topic, and click generate</div>
            </div>
          )}
        </div>
      </div>

      {/* Coming soon: Imagen + Veo */}
      <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { icon: '◫', label: 'Imagen 3 — AI Image Generator', desc: 'Generate product shots, ad creatives, and social graphics using your brand colors. Coming soon via Google Vertex AI.' },
          { icon: '▶', label: 'Veo 2 — AI Video Generator', desc: 'Generate B-roll footage, product reveals, and brand clips to pair with your voiceover scripts. Coming soon via Google Vertex AI.' },
        ].map(item => (
          <div key={item.label} className="card" style={{ display: 'flex', gap: 14, opacity: 0.7 }}>
            <div style={{ fontSize: 28, color: 'var(--gray-200)' }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-800)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', lineHeight: 1.6 }}>{item.desc}</div>
              <span className="badge badge-navy" style={{ marginTop: 8, fontSize: 10 }}>Coming soon</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
