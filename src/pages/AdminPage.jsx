import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { adminApi, diagnosesApi } from '../lib/api'
import { LandMapPicker } from '../components/LandMapPicker'

const PROVIDER_CAT_OPTS = [
  ['seeds', 'Seeds'],
  ['fertilizer', 'Fertilizer'],
  ['pesticide', 'Pesticide'],
  ['tools', 'Tools'],
  ['extension', 'Extension'],
  ['general', 'General'],
]

const DISCOVERY_KINDS = ['general', 'research', 'alert', 'policy']

/**
 * Admin panel — approvals, moderation, solution providers, discovery articles.
 */
export function AdminPage() {
  const qc = useQueryClient()

  /* ── Platform stats ── */
  const statsQ = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.stats(),
  })

  const monthlyQ = useQuery({
    queryKey: ['admin', 'diagnoses', 'monthly'],
    queryFn: () => diagnosesApi.monthlyStats(),
  })

  /* ── User search ── */
  const [userSearch, setUserSearch] = useState('')
  const [userRole, setUserRole] = useState('')
  const [userPage, setUserPage] = useState(1)

  const usersListQ = useQuery({
    queryKey: ['admin', 'users', userSearch, userRole, userPage],
    queryFn: () =>
      adminApi.usersList({
        ...(userSearch ? { q: userSearch } : {}),
        ...(userRole ? { role: userRole } : {}),
        page: userPage,
        limit: 20,
      }),
  })

  /* ── Pending approvals ── */
  const pendingQ = useQuery({
    queryKey: ['admin', 'pending'],
    queryFn: () => adminApi.pendingApprovals(),
  })

  const approvalMut = useMutation({
    mutationFn: (body) => adminApi.setApproval(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pending'] }),
  })

  /* ── Post moderation ── */
  const [modPostId, setModPostId] = useState('')
  const [modHidden, setModHidden] = useState(false)
  const [modNote, setModNote] = useState('')

  const moderateMut = useMutation({
    mutationFn: ({ postId, body }) => adminApi.moderatePost(postId, body),
    onSuccess: () => {
      setModPostId('')
      setModHidden(false)
      setModNote('')
    },
  })

  const providersQ = useQuery({
    queryKey: ['admin', 'providers'],
    queryFn: () => adminApi.providersList(),
  })

  const [provName, setProvName] = useState('')
  const [provDesc, setProvDesc] = useState('')
  const [provPhone, setProvPhone] = useState('')
  const [provWebsite, setProvWebsite] = useState('')
  const [provLat, setProvLat] = useState('23.8103')
  const [provLng, setProvLng] = useState('90.4125')
  const [provCats, setProvCats] = useState(() => new Set(['general']))

  const providerCreateMut = useMutation({
    mutationFn: () =>
      adminApi.providerCreate({
        name: provName.trim(),
        description: provDesc.trim(),
        phone: provPhone.trim(),
        website: provWebsite.trim(),
        categories: [...provCats],
        lat: Number(provLat),
        lng: Number(provLng),
        isActive: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'providers'] })
      setProvName('')
      setProvDesc('')
      setProvPhone('')
      setProvWebsite('')
    },
  })

  const providerDeleteMut = useMutation({
    mutationFn: (id) => adminApi.providerDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'providers'] }),
  })

  const discoveryQ = useQuery({
    queryKey: ['admin', 'discovery'],
    queryFn: () => adminApi.discoveryArticles(),
  })

  const [discTitle, setDiscTitle] = useState('')
  const [discBody, setDiscBody] = useState('')
  const [discKind, setDiscKind] = useState('general')
  const [discHidden, setDiscHidden] = useState(false)

  const discoveryCreateMut = useMutation({
    mutationFn: () =>
      adminApi.discoveryArticleCreate({
        title: discTitle.trim(),
        body: discBody.trim(),
        kind: discKind,
        hiddenByAdmin: discHidden,
        tags: [],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'discovery'] })
      qc.invalidateQueries({ queryKey: ['discovery', 'articles'] })
      setDiscTitle('')
      setDiscBody('')
      setDiscKind('general')
      setDiscHidden(false)
    },
  })

  const discoveryDeleteMut = useMutation({
    mutationFn: (id) => adminApi.discoveryArticleDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'discovery'] })
      qc.invalidateQueries({ queryKey: ['discovery', 'articles'] })
    },
  })

  const users = pendingQ.data?.users || []

  return (
    <div className="space-y-10">
      <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
        Admin panel
      </h1>

      {/* ── Stats tiles ── */}
      <section>
        <h2 className="text-[20px] font-semibold tracking-[-0.18px] text-[#222222]">
          Platform overview
        </h2>
        {statsQ.isLoading && <p className="mt-2 text-[14px] text-[#6a6a6a]">Loading…</p>}
        {statsQ.data && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: 'Total users', value: statsQ.data.totalUsers },
              { label: 'Approved specialists', value: statsQ.data.totalSpecialists },
              { label: 'Diagnoses run', value: statsQ.data.totalDiagnoses },
              { label: 'Land records', value: statsQ.data.totalLands },
              { label: 'Community posts', value: statsQ.data.totalPosts },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-[14px] border border-[#ebebeb] bg-white p-4 shadow-card text-center"
              >
                <p className="text-[28px] font-bold text-[#222222]">{value ?? '—'}</p>
                <p className="mt-1 text-[12px] text-[#6a6a6a]">{label}</p>
              </div>
            ))}
          </div>
        )}
        {(monthlyQ.data?.months?.length ?? 0) > 0 && (
          <div className="mt-6 rounded-[16px] border border-[#ebebeb] bg-white p-5 shadow-card">
            <p className="mb-3 text-[14px] font-semibold text-[#222222]">
              Platform diagnoses (last 12 months)
            </p>
            <ResponsiveContainer width="100%" height={180}>
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
                <Bar dataKey="count" fill="#222222" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ── User search ── */}
      <section>
        <h2 className="text-[20px] font-semibold tracking-[-0.18px] text-[#222222]">
          All users
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search name or email…"
            value={userSearch}
            onChange={(e) => { setUserSearch(e.target.value); setUserPage(1) }}
            className="rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px] text-[#222222] outline-none focus:border-[#222222] focus:ring-2 focus:ring-[#222222] w-60"
          />
          <select
            value={userRole}
            onChange={(e) => { setUserRole(e.target.value); setUserPage(1) }}
            className="rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px] text-[#222222] outline-none focus:border-[#222222]"
          >
            <option value="">All roles</option>
            <option value="farmer">Farmer</option>
            <option value="land_owner">Land owner</option>
            <option value="specialist">Specialist</option>
            <option value="admin">Admin</option>
          </select>
          {usersListQ.data && (
            <span className="text-[13px] text-[#6a6a6a]">
              {usersListQ.data.total} result{usersListQ.data.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {usersListQ.isLoading && <p className="mt-3 text-[14px] text-[#6a6a6a]">Loading…</p>}
        {usersListQ.error && <ErrBox msg={usersListQ.error.message} />}
        {usersListQ.data && (
          <>
            <div className="mt-3 overflow-x-auto rounded-[14px] border border-[#ebebeb] bg-white shadow-card">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#ebebeb] text-[#6a6a6a]">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Roles</th>
                    <th className="px-4 py-3 font-medium">Land</th>
                    <th className="px-4 py-3 font-medium">Specialist</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {usersListQ.data.users.map((u) => (
                    <tr key={u._id} className="border-b border-[#ebebeb] last:border-0 hover:bg-[#fafafa]">
                      <td className="px-4 py-3 font-medium text-[#222222]">{u.name}</td>
                      <td className="px-4 py-3 text-[#6a6a6a]">{u.email}</td>
                      <td className="px-4 py-3 text-[#6a6a6a]">{(u.roles || []).join(', ')}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          u.landOwnerApproval === 'approved' ? 'bg-green-50 text-green-700' :
                          u.landOwnerApproval === 'pending' ? 'bg-amber-50 text-amber-700' :
                          u.landOwnerApproval === 'rejected' ? 'bg-red-50 text-red-700' :
                          'bg-[#f2f2f2] text-[#6a6a6a]'
                        }`}>
                          {u.landOwnerApproval || 'n/a'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          u.specialistApproval === 'approved' ? 'bg-blue-50 text-blue-700' :
                          u.specialistApproval === 'pending' ? 'bg-purple-50 text-purple-700' :
                          u.specialistApproval === 'rejected' ? 'bg-red-50 text-red-700' :
                          'bg-[#f2f2f2] text-[#6a6a6a]'
                        }`}>
                          {u.specialistApproval || 'n/a'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6a6a6a]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {usersListQ.data.users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-[14px] text-[#6a6a6a]">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {usersListQ.data.pages > 1 && (
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  disabled={userPage <= 1}
                  className="rounded-[8px] border border-[#dddddd] px-3 py-1.5 text-[13px] disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-[13px] text-[#6a6a6a]">
                  Page {userPage} of {usersListQ.data.pages}
                </span>
                <button
                  type="button"
                  onClick={() => setUserPage((p) => Math.min(usersListQ.data.pages, p + 1))}
                  disabled={userPage >= usersListQ.data.pages}
                  className="rounded-[8px] border border-[#dddddd] px-3 py-1.5 text-[13px] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Pending approvals ── */}
      <section>
        <h2 className="text-[20px] font-semibold tracking-[-0.18px] text-[#222222]">
          Pending approvals
        </h2>
        {pendingQ.isLoading && <p className="mt-2 text-[14px] text-[#6a6a6a]">Loading…</p>}
        {pendingQ.error && <ErrBox msg={pendingQ.error.message} />}

        {users.length === 0 && !pendingQ.isLoading ? (
          <p className="mt-2 text-[14px] text-[#6a6a6a]">No pending approvals.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {users.map((u) => (
              <div
                key={u._id}
                className="rounded-[20px] border border-[#ebebeb] bg-white p-5 shadow-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[16px] font-semibold text-[#222222]">
                      {u.name}
                    </p>
                    <p className="text-[14px] text-[#6a6a6a]">{u.email}</p>
                    <p className="mt-1 text-[13px] text-[#6a6a6a]">
                      Roles: {(u.roles || []).join(', ')}
                    </p>
                  </div>
                </div>

                {/* ── Land owner approval ── */}
                {u.landOwnerApproval === 'pending' && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="inline-block rounded-[14px] bg-amber-50 px-2.5 py-0.5 text-[12px] font-semibold text-amber-700">
                      Land owner — pending
                    </span>
                    <button
                      onClick={() =>
                        approvalMut.mutate({
                          userId: u._id,
                          landOwner: 'approved',
                        })
                      }
                      disabled={approvalMut.isPending}
                      className="rounded-[8px] bg-[#222222] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#3d7a52] disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() =>
                        approvalMut.mutate({
                          userId: u._id,
                          landOwner: 'rejected',
                        })
                      }
                      disabled={approvalMut.isPending}
                      className="rounded-[8px] border border-[#dddddd] px-4 py-2 text-[13px] font-medium text-[#c13515] transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {/* ── Specialist approval ── */}
                {u.specialistApproval === 'pending' && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="inline-block rounded-[14px] bg-purple-50 px-2.5 py-0.5 text-[12px] font-semibold text-purple-700">
                      Specialist — pending
                    </span>
                    <button
                      onClick={() =>
                        approvalMut.mutate({
                          userId: u._id,
                          specialist: 'approved',
                        })
                      }
                      disabled={approvalMut.isPending}
                      className="rounded-[8px] bg-[#222222] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#3d7a52] disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() =>
                        approvalMut.mutate({
                          userId: u._id,
                          specialist: 'rejected',
                        })
                      }
                      disabled={approvalMut.isPending}
                      className="rounded-[8px] border border-[#dddddd] px-4 py-2 text-[13px] font-medium text-[#c13515] transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Post moderation ── */}
      <section>
        <h2 className="text-[20px] font-semibold tracking-[-0.18px] text-[#222222]">
          Moderate a post
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!modPostId.trim()) return
            moderateMut.mutate({
              postId: modPostId.trim(),
              body: { hiddenByAdmin: modHidden, moderationNote: modNote },
            })
          }}
          className="mt-3 rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[14px] font-medium text-[#222222]">
                Post ID
              </label>
              <input
                required
                value={modPostId}
                onChange={(e) => setModPostId(e.target.value)}
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[14px] font-medium text-[#222222]">
                Moderation note
              </label>
              <input
                value={modNote}
                onChange={(e) => setModNote(e.target.value)}
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
              />
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-[14px] text-[#222222]">
            <input
              type="checkbox"
              checked={modHidden}
              onChange={(e) => setModHidden(e.target.checked)}
              className="accent-[#3d7a52]"
            />
            Hide post from feed
          </label>
          {moderateMut.error && (
            <p className="mt-3 text-[14px] text-[#c13515]">{moderateMut.error.message}</p>
          )}
          {moderateMut.isSuccess && (
            <p className="mt-3 text-[14px] text-green-700">Post moderation updated.</p>
          )}
          <button
            type="submit"
            disabled={moderateMut.isPending}
            className="mt-5 rounded-[8px] bg-[#3d7a52] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#2a5c3b] disabled:opacity-50"
          >
            Apply moderation
          </button>
        </form>
      </section>

      {/* ── Solution providers (map seed / CRUD) ── */}
      <section>
        <h2 className="text-[20px] font-semibold tracking-[-0.18px] text-[#222222]">
          Solution providers
        </h2>
        <p className="mt-1 text-[14px] text-[#6a6a6a]">
          Appear on the public Providers map. Use coordinates consistent with GeoJSON (lng, lat
          internally — pick on map below).
        </p>

        <div className="mt-4 rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card">
          <h3 className="text-[16px] font-semibold text-[#222222]">Add provider</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-medium">Name</label>
              <input
                value={provName}
                onChange={(e) => setProvName(e.target.value)}
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium">Phone</label>
              <input
                value={provPhone}
                onChange={(e) => setProvPhone(e.target.value)}
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[13px] font-medium">Website (optional)</label>
              <input
                value={provWebsite}
                onChange={(e) => setProvWebsite(e.target.value)}
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[13px] font-medium">Description</label>
              <textarea
                value={provDesc}
                onChange={(e) => setProvDesc(e.target.value)}
                rows={2}
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px]"
              />
            </div>
          </div>
          <p className="mt-4 text-[13px] font-medium text-[#222222]">Categories</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROVIDER_CAT_OPTS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setProvCats((prev) => {
                    const n = new Set(prev)
                    if (n.has(key)) n.delete(key)
                    else n.add(key)
                    if (n.size === 0) n.add('general')
                    return n
                  })
                }}
                className={`rounded-full px-3 py-1 text-[12px] font-medium ${
                  provCats.has(key) ? 'bg-[#222222] text-white' : 'border border-[#dddddd]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-[13px] font-medium text-[#222222]">Location</p>
          <div className="mt-2 h-[220px] overflow-hidden rounded-[12px] border border-[#ebebeb]">
            <LandMapPicker
              lat={provLat}
              lng={provLng}
              onChange={(la, ln) => {
                setProvLat(la)
                setProvLng(ln)
              }}
            />
          </div>
          {providerCreateMut.error && (
            <p className="mt-2 text-[13px] text-[#c13515]">{providerCreateMut.error.message}</p>
          )}
          <button
            type="button"
            disabled={providerCreateMut.isPending || !provName.trim()}
            onClick={() => providerCreateMut.mutate()}
            className="mt-4 rounded-[8px] bg-[#222222] px-5 py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
          >
            Save provider
          </button>
        </div>

        <div className="mt-6 space-y-2">
          {providersQ.isLoading && <p className="text-[14px] text-[#6a6a6a]">Loading providers…</p>}
          {(providersQ.data?.providers || []).map((p) => (
            <div
              key={p._id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[#ebebeb] bg-white px-4 py-3 text-[14px]"
            >
              <span className="font-medium text-[#222222]">{p.name}</span>
              <button
                type="button"
                onClick={() => providerDeleteMut.mutate(p._id)}
                disabled={providerDeleteMut.isPending}
                className="text-[13px] font-medium text-[#c13515] underline disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Discovery articles ── */}
      <section>
        <h2 className="text-[20px] font-semibold tracking-[-0.18px] text-[#222222]">
          Discovery articles
        </h2>
        <div className="mt-4 rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card">
          <h3 className="text-[16px] font-semibold text-[#222222]">Publish article</h3>
          <div className="mt-4 grid gap-4">
            <div>
              <label className="mb-1 block text-[13px] font-medium">Title</label>
              <input
                value={discTitle}
                onChange={(e) => setDiscTitle(e.target.value)}
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium">Kind</label>
              <select
                value={discKind}
                onChange={(e) => setDiscKind(e.target.value)}
                className="w-full max-w-xs rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px]"
              >
                {DISCOVERY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium">Body</label>
              <textarea
                value={discBody}
                onChange={(e) => setDiscBody(e.target.value)}
                rows={6}
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px]"
              />
            </div>
            <label className="flex items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                checked={discHidden}
                onChange={(e) => setDiscHidden(e.target.checked)}
                className="accent-[#3d7a52]"
              />
              Hidden (draft — not shown on public Discovery)
            </label>
          </div>
          {discoveryCreateMut.error && (
            <p className="mt-2 text-[13px] text-[#c13515]">{discoveryCreateMut.error.message}</p>
          )}
          <button
            type="button"
            disabled={discoveryCreateMut.isPending || !discTitle.trim() || !discBody.trim()}
            onClick={() => discoveryCreateMut.mutate()}
            className="mt-4 rounded-[8px] bg-[#3d7a52] px-5 py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
          >
            Publish
          </button>
        </div>

        <div className="mt-6 space-y-2">
          {discoveryQ.isLoading && <p className="text-[14px] text-[#6a6a6a]">Loading articles…</p>}
          {(discoveryQ.data?.articles || []).map((a) => (
            <div
              key={a._id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[#ebebeb] bg-white px-4 py-3 text-[14px]"
            >
              <span className="font-medium text-[#222222]">{a.title}</span>
              <button
                type="button"
                onClick={() => discoveryDeleteMut.mutate(a._id)}
                disabled={discoveryDeleteMut.isPending}
                className="text-[13px] font-medium text-[#c13515] underline disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ErrBox({ msg }) {
  return (
    <div className="mt-2 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-[#c13515]">
      {msg}
    </div>
  )
}
