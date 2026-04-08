import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useHasRole } from '../hooks/useHasRole'
import { landsApi, rentalsApi, notificationsApi } from '../lib/api'

/**
 * Authenticated dashboard — lands, rentals, and notification snapshot.
 */
export function DashboardPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const isOwner = useHasRole('land_owner')

  const landsQ = useQuery({
    queryKey: ['lands', 'mine'],
    queryFn: () => landsApi.mine(),
  })
  const outgoingQ = useQuery({
    queryKey: ['rentals', 'outgoing'],
    queryFn: () => rentalsApi.outgoing(),
  })
  const incomingQ = useQuery({
    queryKey: ['rentals', 'incoming'],
    queryFn: () => rentalsApi.incoming(),
    enabled: isOwner,
  })
  const notifQ = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
  })

  const landCount = landsQ.data?.lands?.length ?? '—'
  const unreadCount = (notifQ.data?.notifications || []).filter((n) => !n.read)
    .length

  const pendingRentals = useMemo(() => {
    const out = outgoingQ.data?.requests || []
    const inc = incomingQ.data?.requests || []
    const pending = (r) => r.status === 'pending'
    return out.filter(pending).length + inc.filter(pending).length
  }, [outgoingQ.data, incomingQ.data])

  const approvalBadge = (status) => {
    const map = {
      approved: 'bg-green-50 text-green-700',
      pending: 'bg-amber-50 text-amber-700',
      rejected: 'bg-red-50 text-[#c13515]',
      not_applicable: 'bg-[#f2f2f2] text-[#6a6a6a]',
    }
    return `inline-block rounded-[14px] px-2.5 py-0.5 text-[12px] font-semibold ${map[status] || map.not_applicable}`
  }

  async function markAllRead() {
    await notificationsApi.readAll()
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const cards = [
    { label: 'My lands', value: landCount, to: '/app/lands' },
    { label: 'Pending rental actions', value: pendingRentals, to: '/app/rentals' },
    { label: 'Unread notifications', value: unreadCount, to: '#' },
  ]

  return (
    <div className="space-y-10">
      <div className="rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card">
        <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
          Welcome, {user?.name}
        </h1>
        <p className="mt-1 text-[14px] text-[#6a6a6a]">{user?.email}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <span className={approvalBadge('approved')}>
            Roles: {(user?.roles || []).join(', ')}
          </span>
          {user?.roles?.includes('land_owner') && (
            <span className={approvalBadge(user.landOwnerApproval)}>
              Land owner: {user.landOwnerApproval}
            </span>
          )}
          {user?.roles?.includes('specialist') && (
            <span className={approvalBadge(user.specialistApproval)}>
              Specialist: {user.specialistApproval}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-[20px] border border-[#ebebeb] bg-white p-5 shadow-card transition hover:shadow-hover"
          >
            <p className="text-[14px] font-medium text-[#6a6a6a]">{c.label}</p>
            <p className="mt-2 text-[28px] font-bold leading-[1.43] text-[#222222]">
              {c.value}
            </p>
          </Link>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-semibold tracking-[-0.18px] text-[#222222]">
            Recent notifications
          </h2>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="rounded-[8px] border border-[#dddddd] px-3 py-1.5 text-[13px] font-medium text-[#222222] transition hover:bg-[#f2f2f2]"
            >
              Mark all read
            </button>
          )}
        </div>
        {notifQ.isLoading && (
          <p className="mt-2 text-[14px] text-[#6a6a6a]">Loading…</p>
        )}
        <div className="mt-3 space-y-2">
          {(notifQ.data?.notifications || []).slice(0, 10).map((n) => (
            <div
              key={n._id}
              className={`rounded-[14px] border border-[#ebebeb] px-4 py-3 ${
                n.read ? 'bg-white' : 'bg-[#f7f7f7]'
              }`}
            >
              <p className="text-[14px] font-medium text-[#222222]">{n.title}</p>
              {n.body && (
                <p className="text-[13px] text-[#6a6a6a]">{n.body}</p>
              )}
            </div>
          ))}
          {(notifQ.data?.notifications || []).length === 0 && !notifQ.isLoading && (
            <p className="text-[14px] text-[#6a6a6a]">No notifications yet.</p>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            label: 'Add land',
            to: '/app/lands',
            desc: 'Register land with GPS and soil details',
          },
          {
            label: 'Browse rentals',
            to: '/app/rentals',
            desc: 'Send or manage rental requests',
          },
        ].map((l) => (
          <Link
            key={l.label}
            to={l.to}
            className="rounded-[20px] border border-[#ebebeb] bg-white p-5 shadow-card transition hover:shadow-hover"
          >
            <p className="text-[16px] font-semibold text-[#222222]">{l.label}</p>
            <p className="mt-1 text-[13px] text-[#6a6a6a]">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
