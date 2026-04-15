import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { discoveryApi } from '../lib/api'

const KIND_LABEL = {
  research: 'Research',
  alert: 'Alert',
  policy: 'Policy',
  general: 'Update',
}

/** Colour-coded pills so scan length matches admin intent. */
function kindBadgeClass(kind) {
  const k = kind || 'general'
  if (k === 'research') return 'bg-blue-50 text-blue-800 ring-1 ring-blue-100'
  if (k === 'alert') return 'bg-red-50 text-red-800 ring-1 ring-red-100'
  if (k === 'policy') return 'bg-amber-50 text-amber-900 ring-1 ring-amber-100'
  return 'bg-zinc-100 text-text-primary ring-1 ring-border'
}

/**
 * Public discovery feed — admin-authored science, alerts, and policy notes (Module 2).
 */
export function DiscoveryPage() {
  const q = useQuery({
    queryKey: ['discovery', 'articles'],
    queryFn: () => discoveryApi.articles({ limit: 50 }),
  })

  const articles = q.data?.articles || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Discovery</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Curated updates from Soil Sage admins — research, alerts, and policy. Separate from
          community forums.
        </p>
      </div>

      {q.isLoading && <p className="text-sm text-text-secondary">Loading…</p>}
      {q.isError && <p className="text-sm text-error">{q.error.message}</p>}

      <div className="space-y-4">
        {articles.map((a) => (
          <Link
            key={a._id}
            to={`/app/discovery/${a._id}`}
            className="block rounded-2xl border border-border-light bg-surface p-5 shadow-card transition hover:border-brand/30 hover:shadow-hover"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${kindBadgeClass(a.kind)}`}>
                {KIND_LABEL[a.kind] || a.kind}
              </span>
              <span className="text-xs text-text-secondary">
                {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}
              </span>
            </div>
            <h2 className="mt-3 text-lg font-semibold leading-snug text-text-primary">{a.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-secondary">{a.body}</p>
            <div className="mt-4 flex flex-wrap gap-3 border-t border-border-light pt-3 text-xs font-medium text-text-secondary">
              <span>{a.likeCount || 0} likes</span>
              <span>{a.dislikeCount || 0} dislikes</span>
              <span>{a.commentCount || 0} comments</span>
              <span className="ml-auto text-brand">Read more →</span>
            </div>
          </Link>
        ))}
      </div>

      {q.isSuccess && articles.length === 0 && (
        <p className="text-sm text-text-secondary">No articles yet. Admins can publish from the Admin panel.</p>
      )}
    </div>
  )
}
