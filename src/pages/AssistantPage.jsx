import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { chatApi } from '../lib/api'

const STORAGE_KEY = 'soil_sage_chat_sessions'

/** Stable empty list so hooks that depend on `messages` do not see a new [] each render. */
const EMPTY_MESSAGES = []

/** @typedef {{ id: string; title: string; messages: Array<{ role: string; content: string }>; updatedAt: string }} ChatSession */

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** First user line becomes the sidebar label. */
function titleFromMessages(msgs) {
  const u = msgs.find((m) => m.role === 'user')
  if (!u?.content) return 'New chat'
  const t = u.content.trim().replace(/\s+/g, ' ')
  return t.length > 42 ? `${t.slice(0, 42)}…` : t
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.length) return null
    return parsed.map((s) => ({
      id: String(s.id || newId()),
      title: typeof s.title === 'string' ? s.title : 'Chat',
      messages: Array.isArray(s.messages) ? s.messages : [],
      updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : new Date().toISOString(),
    }))
  } catch {
    return null
  }
}

function persistSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    /* quota / private mode */
  }
}

/** Single initializer so `activeId` always matches a real session row. */
function initAssistant() {
  const loaded = loadSessions()
  if (loaded?.length) {
    return { sessions: loaded, activeId: loaded[0].id }
  }
  const id = newId()
  return {
    sessions: [{ id, title: 'New chat', messages: [], updatedAt: new Date().toISOString() }],
    activeId: id,
  }
}

/**
 * Renders assistant markdown (Gemini often returns **bold**, lists, etc.).
 * Scoped styles — no @tailwindcss/typography dependency.
 */
const markdownComponents = {
  p: (props) => <p className="mb-2 text-sm leading-relaxed last:mb-0" {...props} />,
  strong: (props) => <strong className="font-semibold text-text-primary" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  ul: (props) => <ul className="my-2 list-disc space-y-1 pl-5 text-sm" {...props} />,
  ol: (props) => <ol className="my-2 list-decimal space-y-1 pl-5 text-sm" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  h1: (props) => <h1 className="mb-2 text-base font-semibold text-text-primary" {...props} />,
  h2: (props) => <h2 className="mb-2 mt-3 text-sm font-semibold text-text-primary" {...props} />,
  h3: (props) => <h3 className="mb-1 mt-2 text-sm font-semibold text-text-primary" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-2 border-l-2 border-brand/40 pl-3 text-sm text-text-secondary italic"
      {...props}
    />
  ),
  a: (props) => (
    <a className="font-medium text-brand underline hover:text-brand-dark" target="_blank" rel="noopener noreferrer" {...props} />
  ),
  hr: (props) => <hr className="my-3 border-border-light" {...props} />,
  table: (props) => (
    <div className="my-2 max-w-full overflow-x-auto rounded-lg border border-border-light">
      <table className="min-w-full border-collapse text-left text-xs" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-surface-secondary" {...props} />,
  th: (props) => <th className="border border-border-light px-2 py-1.5 font-semibold" {...props} />,
  td: (props) => <td className="border border-border-light px-2 py-1.5" {...props} />,
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes('language-'))
    if (isBlock) {
      return (
        <code className={`font-mono text-[12px] text-zinc-100 ${className || ''}`} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[12px] text-text-primary" {...props}>
        {children}
      </code>
    )
  },
  pre: (props) => <pre className="my-2 overflow-x-auto rounded-lg bg-zinc-900 p-3" {...props} />,
}

function MarkdownMessage({ content }) {
  if (!content?.trim()) return null
  return (
    <div className="markdown-msg max-w-none text-text-primary">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

/**
 * Inventory-aware assistant — two-pane layout, localStorage sessions,
 * SSE streaming replies, markdown rendering. Server stays stateless per turn.
 */
export function AssistantPage() {
  const initial = initAssistant()
  const [sessions, setSessions] = useState(initial.sessions)
  const [activeId, setActiveId] = useState(initial.activeId)
  const [input, setInput] = useState('')
  const [err, setErr] = useState('')
  const [sessionsOpen, setSessionsOpen] = useState(false)
  /** Partial assistant text while the SSE stream is open. */
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const bottomRef = useRef(null)
  const streamAbortRef = useRef(null)
  const activeSession = sessions.find((s) => s.id === activeId)
  const messages = activeSession?.messages ?? EMPTY_MESSAGES

  useEffect(() => {
    persistSessions(sessions)
  }, [sessions])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  async function send() {
    const text = input.trim()
    if (!text || isStreaming) return

    streamAbortRef.current?.abort()
    const ac = new AbortController()
    streamAbortRef.current = ac

    const sessionId = activeId
    const next = [...messages, { role: 'user', content: text }]
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: next,
              title: titleFromMessages(next),
              updatedAt: new Date().toISOString(),
            }
          : s,
      ),
    )
    setInput('')
    setErr('')
    setIsStreaming(true)
    setStreamingContent('')

    try {
      const reply = await chatApi.stream({
        messages: next,
        signal: ac.signal,
        onDelta: (chunk) => {
          setStreamingContent((prev) => prev + chunk)
        },
      })
      if (!reply) {
        setErr('Empty response from assistant.')
        return
      }
      setErr('')
      const withReply = [...next, { role: 'model', content: reply }]
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: withReply,
                title: titleFromMessages(withReply),
                updatedAt: new Date().toISOString(),
              }
            : s,
        ),
      )
    } catch (e) {
      if (/** @type {any} */ (e)?.name === 'AbortError') return
      setErr(e?.message || 'Request failed')
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
      streamAbortRef.current = null
    }
  }

  function newChat() {
    streamAbortRef.current?.abort()
    const id = newId()
    const session = {
      id,
      title: 'New chat',
      messages: [],
      updatedAt: new Date().toISOString(),
    }
    setSessions((prev) => [session, ...prev])
    setActiveId(id)
    setErr('')
    setStreamingContent('')
    setIsStreaming(false)
    setSessionsOpen(false)
  }

  function deleteSession(id) {
    if (id === activeId) streamAbortRef.current?.abort()
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (!next.length) {
        const fresh = { id: newId(), title: 'New chat', messages: [], updatedAt: new Date().toISOString() }
        setActiveId(fresh.id)
        return [fresh]
      }
      if (id === activeId) setActiveId(next[0].id)
      return next
    })
  }

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  const welcomeText =
    "Hi — I'm Soil Sage's assistant. Ask about crops, soil care, or your inventory. I give general guidance only; always follow local laws and product labels."

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-4 md:flex-row">
      {/* Mobile session toggle */}
      <button
        type="button"
        className="flex items-center justify-between rounded-xl border border-border-light bg-surface px-4 py-3 text-sm font-medium text-text-primary md:hidden"
        onClick={() => setSessionsOpen((o) => !o)}
      >
        <span>Chats ({sessions.length})</span>
        <span aria-hidden>{sessionsOpen ? '▲' : '▼'}</span>
      </button>

      {/* Sessions sidebar */}
      <aside
        className={`flex w-full shrink-0 flex-col rounded-2xl border border-border-light bg-surface shadow-card md:w-52 ${
          sessionsOpen ? 'flex' : 'hidden md:flex'
        }`}
      >
        <div className="border-b border-border-light p-3">
          <button
            type="button"
            onClick={newChat}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            New chat
          </button>
        </div>
        <nav className="flex max-h-[50vh] flex-1 flex-col gap-0.5 overflow-y-auto p-2 md:max-h-none">
          {sortedSessions.map((s) => (
            <div key={s.id} className="group relative">
              <button
                type="button"
                onClick={() => {
                  setActiveId(s.id)
                  setErr('')
                  setSessionsOpen(false)
                }}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-xs font-medium transition ${
                  s.id === activeId
                    ? 'bg-red-50 text-brand ring-1 ring-brand/20'
                    : 'text-text-primary hover:bg-zinc-50'
                }`}
              >
                <span className="line-clamp-2">{s.title}</span>
              </button>
              <button
                type="button"
                onClick={() => deleteSession(s.id)}
                className="absolute right-1 top-1 rounded p-1 text-[10px] text-text-secondary opacity-0 transition hover:bg-red-50 hover:text-error group-hover:opacity-100"
                aria-label={`Delete ${s.title}`}
              >
                ✕
              </button>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main chat */}
      <div className="flex min-h-[min(560px,75vh)] flex-1 flex-col overflow-hidden rounded-2xl border border-border-light bg-surface shadow-card">
        <header className="border-b border-border-light px-4 py-3 md:px-5">
          <h1 className="text-lg font-semibold text-text-primary">Farming assistant</h1>
          {/* <p className="mt-0.5 text-xs text-text-secondary">
            Uses your Soil Sage inventory on the server. Sessions are saved in this browser only.
            Replies stream in as they generate. Requires{' '}
            <code className="rounded bg-zinc-100 px-1 font-mono text-[11px]">GEMINI_API_KEY</code> on the API.
          </p> */}
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-surface-page/50 px-4 py-4 md:px-6">
          <div className="mr-auto flex max-w-[85%] gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              S
            </div>
            <div className="rounded-2xl rounded-tl-md border border-border-light bg-surface px-4 py-3 text-sm leading-relaxed text-text-primary shadow-sm">
              <MarkdownMessage content={welcomeText} />
            </div>
          </div>

          {messages.map((m, i) => (
            <div
              key={`${i}-${m.role}-${m.content?.slice(0, 12)}`}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'model' && (
                <div className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  S
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'rounded-tr-md bg-brand text-white shadow-sm'
                    : 'rounded-tl-md border border-border-light bg-surface text-text-primary shadow-sm'
                }`}
              >
                {m.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <MarkdownMessage content={m.content} />
                )}
              </div>
            </div>
          ))}

          {isStreaming && (
            <div className="flex justify-start gap-2">
              <div className="mr-0 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                S
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-border-light bg-surface px-4 py-3 shadow-sm">
                {streamingContent ? (
                  <>
                    <MarkdownMessage content={streamingContent} />
                    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-brand align-middle" aria-hidden />
                  </>
                ) : (
                  <span className="text-sm text-text-secondary">Thinking…</span>
                )}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border-light bg-surface p-4 md:p-5">
          {err && <p className="mb-2 text-sm text-error">{err}</p>}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              className="min-h-[52px] flex-1 resize-y rounded-xl border border-border px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/30"
              placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={isStreaming || !input.trim()}
              className="rounded-xl bg-text-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand disabled:opacity-50 sm:shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
