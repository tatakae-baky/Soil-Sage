import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Layers, Package, Bell, Users, Sparkles, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useHasRole } from '../hooks/useHasRole'
import {
  landsApi,
  inventoryApi,
  notificationsApi,
  communitiesApi,
  diagnosesApi,
} from '../lib/api'

/** Morning / afternoon / evening copy for the hero greeting. */
function greetingForHour(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Authenticated dashboard — hero greeting, Nexus-style overview metric cards,
 * recent diagnoses (farmers), quick actions. Notifications live on `/app/notifications`.
 */
export function DashboardPage() {
  const { user } = useAuth()
  const isFarmer = useHasRole('farmer')

  const landsQ = useQuery({ queryKey: ['lands', 'mine'], queryFn: () => landsApi.mine() })
  const invQ = useQuery({ queryKey: ['inventory', 'items'], queryFn: () => inventoryApi.items() })
  const notifQ = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    staleTime: 8_000,
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
  })
  const commQ = useQuery({ queryKey: ['communities', 'mine'], queryFn: () => communitiesApi.mine() })
  const diagQ = useQuery({
    queryKey: ['diagnoses', 'recent'],
    queryFn: () => diagnosesApi.mine({ limit: 5 }),
    enabled: isFarmer,
  })

  const monthlyQ = useQuery({
    queryKey: ['diagnoses', 'monthly'],
    queryFn: () => diagnosesApi.monthlyStats(),
    enabled: isFarmer,
  })

  const landsN = landsQ.data?.lands?.length
  const invN = invQ.data?.items?.length
  const commN = commQ.data?.communities?.length
  const diagTotal = diagQ.data?.total
  const unreadCount = (notifQ.data?.notifications || []).filter((n) => !n.read).length

  const landCount = landsQ.isLoading ? '—' : landsN ?? 0
  const itemCount = invQ.isLoading ? '—' : invN ?? 0
  const communityCount = commQ.isLoading ? '—' : commN ?? 0
  const diagnosisCount = diagQ.isLoading ? '—' : diagTotal ?? 0

  const landsHint =
    landsQ.isLoading ? 'Loading…' : landsN === 0 ? 'Register your first plot' : `${landsN} plot${landsN === 1 ? '' : 's'} on file`
  const invHint =
    invQ.isLoading ? 'Loading…' : invN === 0 ? 'Add seeds, tools, or inputs' : `${invN} line item${invN === 1 ? '' : 's'} tracked`
  const notifHint =
    notifQ.isLoading ? 'Loading…' : unreadCount === 0 ? "You're all caught up" : `${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`
  const commHint =
    commQ.isLoading ? 'Loading…' : commN === 0 ? 'Discover groups to join' : `${commN} communit${commN === 1 ? 'y' : 'ies'} joined`
  const diagHint =
    !isFarmer
      ? ''
      : diagQ.isLoading
        ? 'Loading…'
        : (diagTotal ?? 0) === 0
          ? 'Upload a photo to get AI insight'
          : `${diagTotal} report${diagTotal === 1 ? '' : 's'} total`

  const hour = new Date().getHours()
  const greeting = greetingForHour(hour)

  const approvalBadge = (status) => {
    const map = {
      approved: 'bg-green-50 text-green-700',
      pending: 'bg-amber-50 text-amber-700',
      rejected: 'bg-red-50 text-error',
      not_applicable: 'bg-zinc-100 text-text-secondary',
    }
    return `inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] || map.not_applicable}`
  }

  /** Overview metrics — neutral “Nexus”-style tiles (no heavy left stripe). */
  const statCards = [
    {
      label: 'My lands',
      value: landCount,
      hint: landsHint,
      to: '/app/lands',
      icon: <Layers className="h-5 w-5" aria-hidden />,
    },
    {
      label: 'Inventory items',
      value: itemCount,
      hint: invHint,
      to: '/app/inventory',
      icon: <Package className="h-5 w-5" aria-hidden />,
    },
    {
      label: 'Unread notifications',
      value: unreadCount,
      hint: notifHint,
      to: '/app/notifications',
      icon: <Bell className="h-5 w-5" aria-hidden />,
    },
    {
      label: 'Communities',
      value: communityCount,
      hint: commHint,
      to: '/app/communities',
      icon: <Users className="h-5 w-5" aria-hidden />,
    },
    ...(isFarmer
      ? [
          {
            label: 'AI diagnoses (total)',
            value: diagnosisCount,
            hint: diagHint,
            to: '/app/diagnose',
            icon: <Sparkles className="h-5 w-5" aria-hidden />,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-10">
      {/* ── Hero greeting + account context ── */}
      <div className="overflow-hidden rounded-2xl border border-border-light bg-linear-to-br from-white via-white to-zinc-50 shadow-card">
        <div className="border-b border-border-light bg-white/80 px-6 py-5 backdrop-blur-sm">
          <p className="text-sm font-medium text-text-secondary">{greeting},</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary md:text-[26px]">
            {user?.name}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{user?.email}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={approvalBadge('approved')}>
              Roles: {(user?.roles || []).join(', ') || '—'}
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
        <p className="px-6 py-3 text-xs text-text-secondary">
          Here&apos;s a snapshot of your farm workspace. Use the sidebar to jump anywhere, or open a quick action below.
        </p>
      </div>

      {/* ── Overview metrics (Nexus-style: white tile, hairline border, soft lift) ── */}
      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Overview
        </p>
        <div
          className={`grid min-w-0 gap-5 sm:grid-cols-2 ${isFarmer ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-2 xl:grid-cols-4'}`}
        >
          {statCards.map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className="group flex min-w-0 flex-col rounded-[10px] border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:border-zinc-300 hover:shadow-[0_4px_14px_rgba(15,23,42,0.07)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100/90 text-zinc-600 transition group-hover:bg-zinc-100 group-hover:text-zinc-800">
                  {c.icon}
                </span>
                {c.label === 'Unread notifications' && unreadCount > 0 && (
                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-100">
                    {unreadCount > 99 ? '99+' : unreadCount} new
                  </span>
                )}
              </div>
              <p className="mt-5 text-[13px] font-medium leading-none text-zinc-500">{c.label}</p>
              <p className="mt-2.5 text-[32px] font-bold leading-none tracking-tight text-zinc-900 tabular-nums">
                {c.value}
              </p>
              <p className="mt-3 text-xs leading-snug text-zinc-400">{c.hint}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Recent diagnoses (farmers) ── */}
      {isFarmer && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-text-primary">Recent diagnoses</h2>
            <Link to="/app/diagnose" className="text-sm font-semibold text-brand hover:underline">
              New diagnosis
            </Link>
          </div>
          {diagQ.isLoading && <p className="mt-2 text-sm text-text-secondary">Loading…</p>}
          <div className="mt-3 space-y-2">
            {(diagQ.data?.diagnoses || []).map((d) => (
              <Link
                key={d._id}
                to={`/app/diagnose/${d._id}`}
                className="block rounded-xl border border-border-light bg-surface px-4 py-3 shadow-card transition hover:border-zinc-300 hover:shadow-hover"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm font-medium text-text-primary">
                    {d.result?.summary?.slice(0, 120)}
                    {(d.result?.summary?.length || 0) > 120 ? '…' : ''}
                  </p>
                  <span className="shrink-0 inline-flex items-center gap-0.5 text-xs font-semibold text-brand" aria-hidden>
                    View <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {d.createdAt && new Date(d.createdAt).toLocaleString()}
                </p>
              </Link>
            ))}
            {(diagQ.data?.diagnoses || []).length === 0 && !diagQ.isLoading && (
              <p className="text-sm text-text-secondary">
                No diagnoses yet.{' '}
                <Link to="/app/diagnose" className="font-semibold text-brand hover:underline">
                  Run your first
                </Link>
                .
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Diagnoses chart (farmers) ── */}
      {isFarmer && (monthlyQ.data?.months?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-text-primary">
            Your diagnoses (last 12 months)
          </h2>
          <div className="rounded-[16px] border border-[#ebebeb] bg-white p-5 shadow-card">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={monthlyQ.data.months.map((m) => ({
                  month: m.month.slice(5),
                  count: m.count,
                }))}
                margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6a6a6a' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6a6a6a' }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #ebebeb' }}
                  formatter={(v) => [v, 'Diagnoses']}
                />
                <Bar dataKey="count" fill="#3d7a52" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ── Quick actions ── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-text-primary">Quick actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Add land', to: '/app/lands', desc: 'Register land with GPS and soil details' },
            { label: 'Browse rentals', to: '/app/rentals', desc: 'Send or manage rental requests' },
            { label: 'Join a community', to: '/app/communities', desc: 'Post questions and discuss with peers' },
            { label: 'Manage inventory', to: '/app/inventory', desc: 'Track seeds, tools, and fertilizers' },
            ...(isFarmer
              ? [
                  {
                    label: 'Soil / crop diagnosis',
                    to: '/app/diagnose',
                    desc: 'Upload photos for AI-guided recommendations',
                  },
                ]
              : []),
          ].map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="rounded-xl border border-border-light bg-surface p-5 shadow-card transition hover:shadow-hover"
            >
              <p className="text-base font-semibold text-text-primary">{l.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">{l.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
