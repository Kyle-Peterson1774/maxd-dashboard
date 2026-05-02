import { useState, useEffect, useRef, useCallback } from 'react'
import { streamChat, buildSystemPrompt, parseQueueActions, stripQueueBlocks } from '../../lib/agentApi.js'
import { dbSet, dbGet } from '../../lib/db.js'
import { pushToQueue, setQueueUser } from '../../pages/Queue.jsx'
import { useAuth } from '../../lib/auth.jsx'

// ── Module config ─────────────────────────────────────────────────────────────
const MODULE_META = {
  dashboard:  { icon: '◈', label: 'Dashboard Agent',   color: '#2563EB' },
  content:    { icon: '◻', label: 'Content Agent',      color: '#E21B4D' },
  social:     { icon: '◎', label: 'Social Agent',       color: '#E1306C' },
  queue:      { icon: '☑', label: 'Queue Agent',        color: '#f59e0b' },
  sales:      { icon: '↗', label: 'Sales Agent',        color: '#059669' },
  marketing:  { icon: '◈', label: 'Marketing Agent',    color: '#7C3AED' },
  analytics:  { icon: '▲', label: 'Analytics Agent',    color: '#2563EB' },
  operations: { icon: '⚙', label: 'Ops Agent',          color: '#D97706' },
  finance:    { icon: '◎', label: 'Finance Agent',      color: '#065F46' },
  launches:   { icon: '◈', label: 'Launch Agent',       color: '#E21B4D' },
  scripts:    { icon: '✍', label: 'Scripts Agent',      color: '#8B5CF6' },
  ads:        { icon: '◈', label: 'Ads Agent',          color: '#F59E0B' },
  products:   { icon: '◻', label: 'Product Agent',      color: '#0891B2' },
}

const GREETINGS = {
  dashboard:  "Hey — I can see your dashboard overview. Ask me to analyze performance, surface key insights, or help you decide what to prioritize today.",
  content:    "I can see your content pipeline. Ask me to write captions, plan next week's content, script a reel, or tell you what to film next.",
  social:     "I'm your social growth advisor. Ask me about content angles, hashtag strategy, best times to post, or how to grow faster.",
  queue:      "I can help manage your action queue. Ask me to draft a post, review pending items, or create new queue actions.",
  sales:      "I'm your sales assistant. Ask me to write cold outreach, draft follow-ups, or help you close a deal.",
  marketing:  "I can analyze your marketing performance and suggest campaigns. What would you like to work on?",
  analytics:  "I can see your content analytics. Ask me to identify what's working, what to double down on, or how to improve performance.",
  operations: "I'm watching your inventory and ops. Ask about stock levels, reorder timing, or production status.",
  finance:    "I can help you analyze financials — margins, cash flow, P&L trends. What do you need?",
  launches:   "I can help plan and execute launches. Ask about milestone tracking, launch copy, or pre-launch strategy.",
  scripts:    "I'm your scriptwriting assistant. Give me a topic or angle and I'll write a full video script.",
  ads:        "I can help with ad strategy and copy. Ask me to write headlines, analyze performance, or brainstorm new creatives.",
  products:   "I can help with product copy, pricing, and Shopify catalog. What do you need?",
}

function nid() { return `m_${Date.now()}_${Math.random().toString(36).slice(2, 5)}` }

// ── Component ─────────────────────────────────────────────────────────────────

export default function AgentPanel({ module = 'dashboard', contextData = null }) {
  const { user } = useAuth()
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [streaming, setStreaming] = useState(false)

  const streamRef  = useRef('')
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const storageKey = `agent:${module}`

  const meta = MODULE_META[module] || MODULE_META.dashboard

  // Ensure pushToQueue always has the right user email
  useEffect(() => {
    if (user?.email) setQueueUser(user.email)
  }, [user?.email])

  // Load conversation history when panel opens
  useEffect(() => {
    if (!open) return
    dbGet(storageKey)
      .then(saved => {
        if (Array.isArray(saved?.messages) && saved.messages.length > 0) {
          setMessages(saved.messages)
        } else {
          setMessages([{
            id: nid(), role: 'assistant',
            content: GREETINGS[module] || GREETINGS.dashboard,
          }])
        }
      })
      .catch(() => {
        setMessages([{
          id: nid(), role: 'assistant',
          content: GREETINGS[module] || GREETINGS.dashboard,
        }])
      })
    setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Persist history (debounced via useEffect dependency on messages)
  useEffect(() => {
    if (messages.length > 0 && open) {
      dbSet(storageKey, { messages: messages.filter(m => !m.streaming).slice(-40) })
    }
  }, [messages, open])

  // Escape key closes panel
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const systemPrompt = buildSystemPrompt(module, contextData)

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    const userMsg      = { id: nid(), role: 'user',      content: text }
    const assistantId  = nid()
    const assistantMsg = { id: assistantId, role: 'assistant', content: '', streaming: true }

    setMessages(prev => [...prev, userMsg, assistantMsg])

    // Build clean messages array for API (no streaming placeholders)
    const apiMessages = [...messages, userMsg]
      .filter(m => !m.streaming)
      .map(m => ({ role: m.role, content: m.content }))

    setStreaming(true)
    streamRef.current = ''

    await streamChat({
      messages:     apiMessages,
      systemPrompt,
      maxTokens:    1500,
      onToken: (token) => {
        streamRef.current += token
        const text = streamRef.current
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: text } : m
        ))
      },
      onDone: () => {
        setStreaming(false)
        const final = streamRef.current
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: final, streaming: false } : m
        ))
      },
      onError: (err) => {
        setStreaming(false)
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `Error: ${err}`, streaming: false, error: true }
            : m
        ))
      },
    })
  }, [input, streaming, messages, systemPrompt])

  const clear = () => {
    const greeting = [{ id: nid(), role: 'assistant', content: GREETINGS[module] || GREETINGS.dashboard }]
    setMessages(greeting)
    dbSet(storageKey, { messages: [] })
  }

  const handlePushToQueue = (action) => {
    pushToQueue({
      type:   action.type,
      title:  action.title,
      body:   action.content,
      source: `AI — ${meta.label}`,
    })
  }

  // ── Collapsed state — floating trigger button ─────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title={`Open ${meta.label}`}
        style={{
          position:     'fixed',
          bottom:       24,
          right:        24,
          width:        52,
          height:       52,
          borderRadius: '50%',
          background:   'var(--navy)',
          border:       '2px solid rgba(255,255,255,0.1)',
          color:        '#fff',
          fontSize:     20,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          cursor:       'pointer',
          boxShadow:    '0 4px 20px rgba(15,25,41,0.28), 0 2px 8px rgba(15,25,41,0.18)',
          zIndex:       500,
          transition:   'all 0.18s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background  = 'var(--red)'
          e.currentTarget.style.transform   = 'scale(1.08)'
          e.currentTarget.style.boxShadow   = '0 6px 24px rgba(226,27,77,0.4), 0 2px 8px rgba(0,0,0,0.2)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background  = 'var(--navy)'
          e.currentTarget.style.transform   = 'scale(1)'
          e.currentTarget.style.boxShadow   = '0 4px 20px rgba(15,25,41,0.28), 0 2px 8px rgba(15,25,41,0.18)'
        }}
      >
        ⚡
      </button>
    )
  }

  // ── Expanded state — chat panel ───────────────────────────────────────────
  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="agent-backdrop"
        style={{ position: 'fixed', inset: 0, zIndex: 499 }}
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div
        className="agent-panel"
        style={{
          position:      'fixed',
          bottom:        24,
          right:         24,
          width:         384,
          height:        540,
          display:       'flex',
          flexDirection: 'column',
          background:    'var(--surface-2)',
          border:        '1px solid var(--border)',
          borderRadius:  'var(--radius-xl)',
          boxShadow:     'var(--shadow-xl)',
          zIndex:        500,
          overflow:      'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          background:    'var(--navy)',
          padding:       '13px 16px',
          display:       'flex',
          alignItems:    'center',
          gap:           10,
          flexShrink:    0,
        }}>
          <div style={{
            width:          32,
            height:         32,
            borderRadius:   8,
            background:     `${meta.color}25`,
            border:         `1px solid ${meta.color}45`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       14,
            color:          meta.color,
            flexShrink:     0,
          }}>
            {meta.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize:      12,
              fontWeight:    700,
              color:         '#fff',
              fontFamily:    'var(--font-heading)',
              letterSpacing: '0.07em',
            }}>
              {meta.label.toUpperCase()}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
              MAXD Business OS · AI
            </div>
          </div>

          <button
            onClick={clear}
            title="Clear conversation"
            style={{
              background:   'none',
              border:       'none',
              color:        'rgba(255,255,255,0.28)',
              cursor:       'pointer',
              fontSize:     11,
              padding:      '4px 8px',
              borderRadius: 6,
              fontFamily:   'var(--font-body)',
              transition:   'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.28)'}
          >
            Clear
          </button>

          <button
            onClick={() => setOpen(false)}
            style={{
              background: 'none',
              border:     'none',
              color:      'rgba(255,255,255,0.35)',
              cursor:     'pointer',
              fontSize:   18,
              lineHeight: 1,
              padding:    '2px 4px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
          >
            ×
          </button>
        </div>

        {/* ── Messages ── */}
        <div style={{
          flex:          1,
          overflowY:     'auto',
          padding:       '1rem',
          display:       'flex',
          flexDirection: 'column',
          gap:           10,
        }}>
          {messages.map(msg => {
            const isUser    = msg.role === 'user'
            const display   = isUser ? msg.content : stripQueueBlocks(msg.content)
            const actions   = !isUser && !msg.streaming ? parseQueueActions(msg.content) : []

            return (
              <div key={msg.id}>
                {/* Bubble */}
                <div style={{
                  maxWidth:    '88%',
                  marginLeft:  isUser ? 'auto' : 0,
                  marginRight: isUser ? 0 : 'auto',
                }}>
                  <div style={{
                    padding:      '9px 13px',
                    borderRadius: isUser
                      ? '14px 14px 4px 14px'
                      : '4px 14px 14px 14px',
                    background:   isUser ? 'var(--navy)' : 'var(--surface-3)',
                    color:        isUser ? '#fff' : 'var(--text-primary)',
                    fontSize:     13,
                    lineHeight:   1.65,
                    whiteSpace:   'pre-wrap',
                    wordBreak:    'break-word',
                    border:       msg.error
                      ? '1px solid #fca5a5'
                      : !isUser
                        ? '1px solid var(--border)'
                        : 'none',
                  }}>
                    {display || (msg.streaming ? '' : '—')}
                    {msg.streaming && (
                      <span style={{
                        display:       'inline-block',
                        width:         2,
                        height:        13,
                        background:    'var(--text-secondary)',
                        marginLeft:    2,
                        verticalAlign: 'middle',
                        animation:     'agent-blink 0.75s steps(1) infinite',
                      }} />
                    )}
                  </div>
                </div>

                {/* Suggested queue actions */}
                {actions.map((action, i) => (
                  <div key={i} style={{
                    marginTop:      7,
                    padding:        '10px 13px',
                    borderRadius:   10,
                    background:     'var(--surface)',
                    border:         '1px solid var(--border-mid)',
                    display:        'flex',
                    alignItems:     'center',
                    gap:            10,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize:      10,
                        fontWeight:    700,
                        color:         'var(--text-muted)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginBottom:  3,
                      }}>
                        Suggested Action
                      </div>
                      <div style={{
                        fontSize:   12,
                        fontWeight: 600,
                        color:      'var(--text-primary)',
                        marginBottom: 2,
                        overflow:   'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {action.title}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {action.type.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePushToQueue(action)}
                      className="btn btn-primary"
                      style={{ fontSize: 11, padding: '5px 12px', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      + Queue
                    </button>
                  </div>
                ))}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div style={{
          padding:       '11px 14px',
          borderTop:     '1px solid var(--border)',
          background:    'var(--surface-3)',
          flexShrink:    0,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
              placeholder={streaming ? 'AI is responding…' : 'Ask anything…'}
              disabled={streaming}
              rows={1}
              style={{
                flex:       1,
                padding:    '8px 11px',
                borderRadius: 10,
                border:     '1px solid var(--border-mid)',
                background: 'var(--surface-2)',
                color:      'var(--text-primary)',
                fontSize:   13,
                resize:     'none',
                outline:    'none',
                fontFamily: 'var(--font-body)',
                lineHeight: 1.5,
                maxHeight:  96,
                overflow:   'auto',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || streaming}
              className="btn btn-primary"
              style={{
                padding:    '8px 13px',
                opacity:    (!input.trim() || streaming) ? 0.45 : 1,
                flexShrink: 0,
                fontSize:   16,
              }}
            >
              ↑
            </button>
          </div>
          <div style={{
            fontSize:   10,
            color:      'var(--text-muted)',
            marginTop:  6,
            textAlign:  'center',
            lineHeight: 1.4,
          }}>
            Enter to send · Shift+Enter for new line · Esc to close
          </div>
        </div>
      </div>

      <style>{`
        @keyframes agent-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @media (max-width: 480px) {
          .agent-panel {
            width: calc(100vw - 32px) !important;
            right: 16px !important;
            bottom: 16px !important;
            height: 70vh !important;
          }
          .agent-backdrop { display: block !important; }
        }
        @media (min-width: 481px) {
          .agent-backdrop { display: none !important; }
        }
      `}</style>
    </>
  )
}
