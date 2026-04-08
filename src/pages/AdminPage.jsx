import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/api'

/**
 * Admin panel — approve/reject land owners & specialists, moderate posts.
 */
export function AdminPage() {
  const qc = useQueryClient()

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

  const users = pendingQ.data?.users || []

  return (
    <div className="space-y-10">
      <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
        Admin panel
      </h1>

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
                      className="rounded-[8px] bg-[#222222] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#ff385c] disabled:opacity-50"
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
                      className="rounded-[8px] bg-[#222222] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#ff385c] disabled:opacity-50"
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
              className="accent-[#ff385c]"
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
            className="mt-5 rounded-[8px] bg-[#ff385c] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#e00b41] disabled:opacity-50"
          >
            Apply moderation
          </button>
        </form>
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
