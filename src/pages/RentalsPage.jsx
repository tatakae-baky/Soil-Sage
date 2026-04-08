import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rentalsApi } from '../lib/api'
import { useHasRole } from '../hooks/useHasRole'

/**
 * Rental dashboard — send requests, view outgoing/incoming, approve/reject.
 */
export function RentalsPage() {
  const qc = useQueryClient()
  const isOwner = useHasRole('land_owner')

  /* ── Outgoing (farmer) ── */
  const outgoing = useQuery({
    queryKey: ['rentals', 'outgoing'],
    queryFn: () => rentalsApi.outgoing(),
  })

  /* ── Incoming (land owner) ── */
  const incoming = useQuery({
    queryKey: ['rentals', 'incoming'],
    queryFn: () => rentalsApi.incoming(),
    enabled: isOwner,
  })

  /* ── Send request form ── */
  const [showForm, setShowForm] = useState(false)
  const [landId, setLandId] = useState('')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')

  const createMut = useMutation({
    mutationFn: (body) => rentalsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rentals'] })
      setShowForm(false)
      setLandId('')
      setMessage('')
      setFormError('')
    },
    onError: (e) => setFormError(e.message),
  })

  const decideMut = useMutation({
    mutationFn: ({ id, status }) => rentalsApi.decide(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rentals'] }),
  })

  function handleSendRequest(e) {
    e.preventDefault()
    setFormError('')
    if (!landId.trim()) return setFormError('Land ID is required')
    createMut.mutate({ landId: landId.trim(), message })
  }

  const statusBadge = (s) => {
    const map = {
      pending: 'bg-amber-50 text-amber-700',
      approved: 'bg-green-50 text-green-700',
      rejected: 'bg-red-50 text-[#c13515]',
    }
    return `inline-block rounded-[14px] px-2.5 py-0.5 text-[12px] font-semibold ${map[s] || 'bg-[#f2f2f2] text-[#6a6a6a]'}`
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
          Rental requests
        </h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-[8px] bg-[#222222] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#ff385c]"
          >
            + Send request
          </button>
        )}
      </div>

      {/* ── Send request form ── */}
      {showForm && (
        <form
          onSubmit={handleSendRequest}
          className="rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card"
        >
          <h2 className="text-[16px] font-semibold text-[#222222]">
            Request land rental
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[14px] font-medium text-[#222222]">Land ID</label>
              <input
                required
                value={landId}
                onChange={(e) => setLandId(e.target.value)}
                placeholder="Paste the land ID from the browse page"
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[14px] font-medium text-[#222222]">Message (optional)</label>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
              />
            </div>
          </div>
          {formError && <p className="mt-3 text-[14px] text-[#c13515]">{formError}</p>}
          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={createMut.isPending}
              className="rounded-[8px] bg-[#ff385c] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#e00b41] disabled:opacity-50"
            >
              Send request
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError('') }} className="rounded-[8px] border border-[#dddddd] px-5 py-2.5 text-[14px] font-medium text-[#222222] transition hover:bg-[#f2f2f2]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Outgoing ── */}
      <section>
        <h2 className="text-[20px] font-semibold tracking-[-0.18px] text-[#222222]">
          My outgoing requests
        </h2>
        {outgoing.isLoading && <p className="mt-2 text-[14px] text-[#6a6a6a]">Loading…</p>}
        {outgoing.error && <ErrBox msg={outgoing.error.message} />}
        <div className="mt-3 space-y-3">
          {(outgoing.data?.requests || []).map((r) => (
            <div key={r._id} className="rounded-[20px] border border-[#ebebeb] bg-white p-4 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-medium text-[#222222]">
                  Land: {r.landId?.title || r.landId?._id || '—'}
                </p>
                <span className={statusBadge(r.status)}>{r.status}</span>
              </div>
              {r.message && <p className="mt-1 text-[13px] text-[#6a6a6a]">{r.message}</p>}
              {r.agreementNote && <p className="mt-1 text-[13px] text-[#6a6a6a]">Agreement: {r.agreementNote}</p>}
              <p className="mt-1 text-[12px] text-[#6a6a6a]">Owner: {r.ownerId?.name || '—'}</p>
            </div>
          ))}
          {(outgoing.data?.requests || []).length === 0 && !outgoing.isLoading && (
            <p className="text-[14px] text-[#6a6a6a]">No outgoing requests yet.</p>
          )}
        </div>
      </section>

      {/* ── Incoming (land owner) ── */}
      {isOwner && (
        <section>
          <h2 className="text-[20px] font-semibold tracking-[-0.18px] text-[#222222]">
            Incoming requests (as land owner)
          </h2>
          {incoming.isLoading && <p className="mt-2 text-[14px] text-[#6a6a6a]">Loading…</p>}
          {incoming.error && <ErrBox msg={incoming.error.message} />}
          <div className="mt-3 space-y-3">
            {(incoming.data?.requests || []).map((r) => (
              <div key={r._id} className="rounded-[20px] border border-[#ebebeb] bg-white p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-medium text-[#222222]">
                    From: {r.requesterId?.name || '—'}
                  </p>
                  <span className={statusBadge(r.status)}>{r.status}</span>
                </div>
                <p className="mt-1 text-[13px] text-[#6a6a6a]">
                  Land: {r.landId?.title || r.landId?._id || '—'}
                </p>
                {r.message && <p className="mt-1 text-[13px] text-[#6a6a6a]">{r.message}</p>}
                {r.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => decideMut.mutate({ id: r._id, status: 'approved' })}
                      disabled={decideMut.isPending}
                      className="rounded-[8px] bg-[#222222] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#ff385c] disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => decideMut.mutate({ id: r._id, status: 'rejected' })}
                      disabled={decideMut.isPending}
                      className="rounded-[8px] border border-[#dddddd] px-4 py-2 text-[13px] font-medium text-[#c13515] transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            {(incoming.data?.requests || []).length === 0 && !incoming.isLoading && (
              <p className="text-[14px] text-[#6a6a6a]">No incoming requests.</p>
            )}
          </div>
        </section>
      )}
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
