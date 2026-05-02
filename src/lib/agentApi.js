// ============================================================
// AGENT API — client-side streaming helper
//
// streamChat()        — sends messages to /api/ai-stream, calls
//                       onToken for each streamed chunk
// buildSystemPrompt() — assembles a module-aware system prompt
//                       with MAXD brand context + live data
// parseQueueActions() — extracts ---QUEUE--- blocks from response
// stripQueueBlocks()  — removes those blocks before display
// ============================================================

// ── Streaming client ──────────────────────────────────────────────────────────

export async function streamChat({
  messages,
  systemPrompt,
  model,
  maxTokens = 1500,
  onToken,
  onDone,
  onError,
}) {
  let res
  try {
    res = await fetch('/api/ai-stream', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, systemPrompt, model, maxTokens }),
    })
  } catch (err) {
    onError?.(err.message || 'Network error')
    return
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    onError?.(errData.error || `Error ${res.status}`)
    return
  }

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') { onDone?.(); return }
        try {
          const ev = JSON.parse(payload)
          if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
            onToken?.(ev.delta.text)
          }
          if (ev.type === 'message_stop') { onDone?.(); return }
        } catch { /* skip malformed SSE lines */ }
      }
    }
  } catch (err) {
    onError?.(err.message || 'Stream interrupted')
    return
  }

  onDone?.()
}

// ── System prompt builder ─────────────────────────────────────────────────────

const BRAND_CONTEXT = `You are an AI assistant embedded in the MAXD Business OS — an internal command center for MAXD Wellness, a DTC supplement brand.

Brand: MAXD Wellness
Flagship product: Creatine Gummies (USA-manufactured, FDA-certified facility, third-party tested, 100% transparent ingredients)
Mission: Empower individuals through clean, transparent supplementation
Tagline: "Go Beyond Your Limits"
Target customer: Jake Thompson — 25-35, gym 5x/week, skeptical of supplement claims, values convenience
Founder: Kyle Peterson (kyle@trymaxd.com)
Brand voice: Direct, confident, science-backed, human. No fluff. No generic supplement language.`

const MODULE_ROLES = {
  dashboard:  'You are the Dashboard Agent. Analyze overall business KPIs, surface the most important insights, and help the founder decide what to focus on today.',
  content:    'You are the Content Pipeline Agent. Help plan, script, and schedule content across TikTok, Instagram, and YouTube. You can see the live content pipeline.',
  social:     'You are the Social Growth Agent. Analyze follower growth, engagement trends, and suggest content angles to grow the audience.',
  queue:      'You are the Action Queue Agent. Help review pending actions, suggest approvals or rejections, and draft new queue items for posts, emails, and campaigns.',
  sales:      'You are the Sales Agent. Draft outreach emails, help analyze the sales pipeline, and push follow-up actions to the queue.',
  marketing:  'You are the Marketing Agent. Analyze ad spend and email performance, surface ROAS trends, and suggest campaign strategies.',
  analytics:  'You are the Analytics Agent. Surface patterns in post and ad performance, identify top-performing content, and suggest optimizations.',
  operations: 'You are the Operations Agent. Monitor inventory levels, flag reorder points, and track production batch status.',
  finance:    'You are the Finance Agent. Analyze P&L trends, surface margin risks, flag budget anomalies, and help with financial planning.',
  launches:   'You are the Launches Agent. Help plan and execute product launches, track milestone completion, and draft launch copy.',
  scripts:    'You are the Scripts Agent. Help write, refine, and improve video scripts for TikTok, Instagram Reels, and YouTube.',
  ads:        'You are the Ads Agent. Analyze Meta and TikTok ad performance, suggest creative angles, and help write ad copy.',
  products:   'You are the Product Agent. Help manage product descriptions, pricing strategy, and Shopify catalog.',
}

const ACTION_INSTRUCTIONS = `

When you want to suggest a specific action the user should take (a post to publish, email to send, etc.), include it at the end of your response using EXACTLY this format:

---QUEUE---
type: instagram_post
title: Short descriptive title
content: The actual post caption, email body, or content to use
---END---

Supported types: instagram_post, tiktok_post, facebook_post, youtube_post, email_campaign, gmail_draft

Rules:
- Only suggest an action when it adds clear value (don't force it)
- One action per response maximum
- Keep the content field ready-to-use (the user shouldn't need to edit it)
- Always be concise. The founder is busy. Lead with the most important thing.`

export function buildSystemPrompt(module, contextData) {
  const role = MODULE_ROLES[module] || MODULE_ROLES.dashboard
  const ctx  = contextData
    ? `\n\nCurrent module data:\n${JSON.stringify(contextData, null, 2)}`
    : ''
  return `${BRAND_CONTEXT}\n\n${role}${ctx}${ACTION_INSTRUCTIONS}`
}

// ── Queue action parsing ──────────────────────────────────────────────────────

export function parseQueueActions(text) {
  const actions = []
  const regex   = /---QUEUE---\n([\s\S]*?)---END---/g
  let match
  while ((match = regex.exec(text)) !== null) {
    const block = match[1]
    const get   = (key) => {
      const m = block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
      return m ? m[1].trim() : ''
    }
    const type  = get('type')
    const title = get('title')
    // content may span multiple lines
    const contentMatch = block.match(/^content:\s*([\s\S]+)/m)
    const content = contentMatch ? contentMatch[1].trim() : ''
    if (type && title) actions.push({ type, title, content })
  }
  return actions
}

export function stripQueueBlocks(text) {
  return text.replace(/\n?---QUEUE---[\s\S]*?---END---/g, '').trim()
}
