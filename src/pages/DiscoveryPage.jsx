import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Flame } from 'lucide-react'
import { discoveryApi } from '../lib/api'

const KIND_LABEL = {
  research: 'Research',
  alert: 'Alert',
  policy: 'Policy',
  general: 'Update',
}

const KIND_TONE = {
  research: 'from-blue-900 via-blue-700 to-blue-500',
  alert: 'from-red-900 via-red-700 to-red-500',
  policy: 'from-amber-900 via-amber-700 to-amber-500',
  general: 'from-zinc-900 via-zinc-800 to-zinc-600',
}

function kindBadgeClass(kind) {
  const k = kind || 'general'
  if (k === 'research') return 'bg-blue-50 text-blue-800 ring-1 ring-blue-100'
  if (k === 'alert') return 'bg-red-50 text-red-800 ring-1 ring-red-100'
  if (k === 'policy') return 'bg-amber-50 text-amber-900 ring-1 ring-amber-100'
  return 'bg-zinc-100 text-text-primary ring-1 ring-border'
}

/**
 * Discovery page: highlighted channels first, then merged articles from those channels.
 */
export function DiscoveryPage() {
  const q = useQuery({
    queryKey: ['discovery', 'articles'],
    queryFn: () => discoveryApi.articles({ limit: 50 }),
  })

  const articles = q.data?.articles || []

  const kindStats = useMemo(() => {
    const base = new Map()
    for (const key of Object.keys(KIND_LABEL)) {
      base.set(key, {
        kind: key,
        count: 0,
        likeTotal: 0,
        commentTotal: 0,
      })
    }
    for (const a of articles) {
      const key = base.has(a.kind) ? a.kind : 'general'
      const stat = base.get(key)
      stat.count += 1
      stat.likeTotal += Number(a.likeCount) || 0
      stat.commentTotal += Number(a.commentCount) || 0
    }
    return [...base.values()]
  }, [articles])

  const highlightedKinds = useMemo(
    () =>
      kindStats
        .filter((k) => k.count > 0)
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count
          return b.commentTotal - a.commentTotal
        })
        .slice(0, 4),
    [kindStats],
  )

  const highlightedKindSet = useMemo(
    () => new Set(highlightedKinds.map((k) => k.kind)),
    [highlightedKinds],
  )

  const articleFeed = useMemo(() => {
    const list = highlightedKindSet.size
      ? articles.filter((a) => highlightedKindSet.has(a.kind || 'general'))
      : articles
    return [...list].sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime()
      const tb = new Date(b.createdAt || 0).getTime()
      return tb - ta
    })
  }, [articles, highlightedKindSet])

  const mostDiscussed = useMemo(
    () =>
      [...articleFeed]
        .sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0))
        .slice(0, 8),
    [articleFeed],
  )

  const reactionTotal = useMemo(
    () =>
      articleFeed.reduce(
        (sum, a) => sum + (Number(a.likeCount) || 0) + (Number(a.dislikeCount) || 0),
        0,
      ),
    [articleFeed],
  )

  const totalComments = useMemo(
    () => articleFeed.reduce((sum, a) => sum + (Number(a.commentCount) || 0), 0),
    [articleFeed],
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Discovery</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Highlighted channels first, then a combined stream from those channels.
        </p>
      </div>

      {highlightedKinds.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {highlightedKinds.map((item) => (
            <article
              key={item.kind}
              className="relative overflow-hidden rounded-2xl border border-border-light text-white shadow-card"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${KIND_TONE[item.kind] || KIND_TONE.general}`} />
              <div className="absolute inset-0 bg-black/25" />
              <div className="relative flex min-h-48 flex-col justify-end p-5">
                <p className="text-2xl font-semibold leading-tight">{KIND_LABEL[item.kind] || 'Update'}</p>
                <p className="mt-2 text-sm text-white/85">
                  {item.count} articles · {item.commentTotal} comments
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-border-light bg-surface p-5 shadow-card">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Articles from highlighted channels</h2>
              <p className="mt-1 text-sm text-text-secondary">
                {q.isLoading ? 'Loading articles...' : `${articleFeed.length} articles`}
              </p>
            </div>
            <BookOpen className="h-5 w-5 text-text-secondary" aria-hidden />
          </div>

          {q.isLoading && <p className="text-sm text-text-secondary">Loading...</p>}
          {q.isError && <p className="text-sm text-error">{q.error.message}</p>}

          {q.isSuccess && articles.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border-light bg-surface p-8 text-center shadow-card">
              <p className="text-sm text-text-secondary">No articles yet. Admins can publish from the Admin panel.</p>
            </div>
          )}

          {q.isSuccess && articles.length > 0 && articleFeed.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border-light bg-surface p-8 text-center shadow-card">
              <p className="text-sm text-text-secondary">No articles found for highlighted channels.</p>
            </div>
          )}

          <div className="space-y-3">
            {articleFeed.map((a) => (
              <Link
                key={a._id}
                to={`/app/discovery/${a._id}`}
                className="block rounded-2xl border border-border-light bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-hover"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-lg px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${kindBadgeClass(a.kind)}`}
                  >
                    {KIND_LABEL[a.kind] || a.kind}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-semibold leading-snug text-text-primary">{a.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-secondary">{a.body}</p>
                <div className="mt-4 flex flex-wrap gap-3 border-t border-border-light pt-3 text-xs font-medium text-text-secondary">
                  <span>{a.likeCount || 0} likes</span>
                  <span>{a.dislikeCount || 0} dislikes</span>
                  <span>{a.commentCount || 0} comments</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-brand">
                    Read more
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-2xl border border-border-light bg-surface p-5 shadow-card">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Feed stats</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border-light bg-surface-secondary p-3">
                <p className="text-xs text-text-secondary">Channels</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{highlightedKinds.length}</p>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-secondary p-3">
                <p className="text-xs text-text-secondary">Articles</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{articleFeed.length}</p>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-secondary p-3">
                <p className="text-xs text-text-secondary">Reactions</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{reactionTotal}</p>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-secondary p-3">
                <p className="text-xs text-text-secondary">Comments</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{totalComments}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border-light bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Most discussed</h3>
              <Flame className="h-4 w-4 text-brand" aria-hidden />
            </div>
            <div className="mt-4 space-y-2">
              {mostDiscussed.length === 0 && <p className="text-sm text-text-secondary">No discussion data yet.</p>}
              {mostDiscussed.map((a, idx) => (
                <Link
                  key={a._id}
                  to={`/app/discovery/${a._id}`}
                  className="block rounded-lg border border-border-light px-3 py-2 text-sm transition hover:border-brand/40 hover:bg-surface-secondary"
                >
                  <p className="line-clamp-1">
                    {idx + 1}. {a.title}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">{a.commentCount || 0} comments</p>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
