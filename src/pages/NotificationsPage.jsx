import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { notificationsApi } from '../lib/api'

/** Poll interval so the inbox stays fresh without WebSockets (MVP “near real-time”). */
const NOTIFICATIONS_POLL_MS = 12_000

/**
 * Full notifications inbox — list, mark one read on open, mark all read.
 * Shares `['notifications']` query with the shell bell and dashboard stat tile.
 */
export function NotificationsPage() {
  const qc = useQueryClient()

  const listQ = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    staleTime: 8_000,
    /** Re-fetch on an interval while the app is open so new alerts appear without refresh. */
    refetchInterval: NOTIFICATIONS_POLL_MS,
    refetchIntervalInBackground: false,
  })

  const markOneMut = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const readAllMut = useMutation({
    mutationFn: () => notificationsApi.readAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const notifications = listQ.data?.notifications || []
  const unreadCount = notifications.filter((n) => !n.read).length

  function openNotification(n) {
    if (!n.read && n._id) markOneMut.mutate(String(n._id))
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Notifications</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Rental alerts, diagnosis reports, and system updates. Refreshes automatically every few
            seconds while you keep this tab open.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            disabled={readAllMut.isPending}
            onClick={() => readAllMut.mutate()}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-secondary disabled:opacity-50"
          >
            Mark all read
          </button>
        )}
      </div>

      {listQ.isLoading && <p className="text-sm text-text-secondary">Loading…</p>}
      {listQ.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {listQ.error.message}
        </p>
      )}

      {!listQ.isLoading && !listQ.error && (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n._id}>
              <div
                role={n.read ? undefined : 'button'}
                tabIndex={n.read ? undefined : 0}
                onClick={() => !n.read && openNotification(n)}
                onKeyDown={(e) => {
                  if (!n.read && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    openNotification(n)
                  }
                }}
                className={`rounded-xl border border-border-light px-4 py-3 transition ${
                  n.read
                    ? 'bg-surface'
                    : 'cursor-pointer bg-amber-50/40 ring-1 ring-amber-100/80 hover:bg-amber-50/70'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">{n.title}</p>
                      {!n.read && (
                        <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          New
                        </span>
                      )}
                    </div>
                    {n.body && <p className="mt-1 text-xs leading-relaxed text-text-secondary">{n.body}</p>}
                    {n.createdAt && (
                      <p className="mt-2 text-[11px] text-zinc-400">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                    {n.type === 'diagnosis_ready' && n.relatedId && (
                      <Link
                        to={`/app/diagnose/${String(n.relatedId)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        View report
                      </Link>
                    )}
                    {!n.read && (
                      <button
                        type="button"
                        disabled={markOneMut.isPending}
                        onClick={(e) => {
                          e.stopPropagation()
                          openNotification(n)
                        }}
                        className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-text-primary hover:bg-white disabled:opacity-50"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {notifications.length === 0 && !listQ.isLoading && !listQ.error && (
        <div className="rounded-xl border border-dashed border-border-light bg-surface-secondary/50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-text-primary">No notifications yet</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-text-secondary">
            When rentals change or a diagnosis finishes, they will show up here and in the header
            bell.
          </p>
        </div>
      )}
    </div>
  )
}
