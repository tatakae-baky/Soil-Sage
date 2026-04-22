import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { notificationsApi } from '../lib/api'

const POLL_MS = 12_000

/**
 * Floating notifications popover — opened from the bell button in AppShell.
 * Shares the ['notifications'] query cache with the shell bell badge.
 */
export function NotificationsDropdown({ onClose, anchorEl, panelRef }) {
  const [style, setStyle] = useState({ top: 0, right: 0 })

  useLayoutEffect(() => {
    if (!anchorEl) return
    function compute() {
      const rect = anchorEl.getBoundingClientRect()
      setStyle({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [anchorEl])

  const qc = useQueryClient()

  const listQ = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    staleTime: 8_000,
    refetchInterval: POLL_MS,
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

  return createPortal(
    <div
      ref={panelRef}
      style={{ top: style.top, right: style.right }}
      className="fixed z-9999 flex w-80 flex-col overflow-hidden rounded-xl border border-border-light bg-surface shadow-xl ring-1 ring-black/5 md:w-96"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-light px-4 py-3">
        <span className="text-sm font-semibold text-text-primary">
          Notifications{unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={readAllMut.isPending}
              onClick={() => readAllMut.mutate()}
              className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-text-primary transition hover:bg-surface-secondary disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
          <button
            type="button"
            aria-label="Close notifications"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition hover:bg-surface-secondary hover:text-text-primary"
          >
            <X className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="max-h-105 overflow-y-auto">
        {listQ.isLoading && (
          <p className="px-4 py-6 text-center text-sm text-text-secondary">Loading…</p>
        )}

        {listQ.error && (
          <p className="m-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-error">
            {listQ.error.message}
          </p>
        )}

        {!listQ.isLoading && !listQ.error && notifications.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-text-primary">No notifications yet</p>
            <p className="mt-1 text-xs text-text-secondary">
              Rental alerts and diagnosis reports will appear here.
            </p>
          </div>
        )}

        {!listQ.isLoading && !listQ.error && notifications.length > 0 && (
          <ul className="divide-y divide-border-light">
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
                  className={`px-4 py-3 transition ${
                    n.read
                      ? 'bg-surface'
                      : 'cursor-pointer bg-amber-50/40 hover:bg-amber-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-semibold text-text-primary">{n.title}</p>
                        {!n.read && (
                          <span className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            New
                          </span>
                        )}
                      </div>
                      {n.body && (
                        <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      {n.createdAt && (
                        <p className="mt-1 text-[10px] text-zinc-400">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {n.type === 'diagnosis_ready' && n.relatedId && (
                        <Link
                          to={`/app/diagnose/${String(n.relatedId)}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onClose()
                          }}
                          className="text-[11px] font-semibold text-brand hover:underline"
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
                          className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-text-primary transition hover:bg-white disabled:opacity-50"
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
      </div>
    </div>,
    document.body,
  )
}
