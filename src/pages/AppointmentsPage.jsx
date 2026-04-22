import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentsApi } from '../lib/api'
import { useHasRole } from '../hooks/useHasRole'

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[status] || 'bg-[#f2f2f2] text-[#6a6a6a]'}`}
    >
      {status}
    </span>
  )
}

export function AppointmentsPage() {
  const qc = useQueryClient()
  const isFarmer = useHasRole('farmer')
  const isSpecialist = useHasRole('specialist')

  /* ── Farmer: outgoing view ── */
  const outgoingQ = useQuery({
    queryKey: ['appointments', 'outgoing'],
    queryFn: () => appointmentsApi.outgoing(),
    enabled: isFarmer,
  })

  /* ── Specialist: incoming view ── */
  const incomingQ = useQuery({
    queryKey: ['appointments', 'incoming'],
    queryFn: () => appointmentsApi.incoming(),
    enabled: isSpecialist,
  })

  /* ── Farmer: cancel pending ── */
  const cancelMut = useMutation({
    mutationFn: (id) => appointmentsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments', 'outgoing'] }),
  })

  /* ── Specialist: update status ── */
  const [specialistNote, setSpecialistNote] = useState({})

  const statusMut = useMutation({
    mutationFn: ({ id, status }) =>
      appointmentsApi.updateStatus(id, {
        status,
        specialistNote: specialistNote[id] || '',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments', 'incoming'] }),
  })

  return (
    <div className="space-y-8">
      <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
        Appointments
      </h1>

      {/* ── Specialist: incoming ── */}
      {isSpecialist && (
        <section>
          <h2 className="text-[18px] font-semibold text-[#222222]">Incoming requests</h2>
          {incomingQ.isLoading && (
            <p className="mt-2 text-[14px] text-[#6a6a6a]">Loading…</p>
          )}
          {!incomingQ.isLoading && (incomingQ.data?.appointments || []).length === 0 && (
            <p className="mt-2 text-[14px] text-[#6a6a6a]">No appointment requests yet.</p>
          )}
          <div className="mt-4 space-y-4">
            {(incomingQ.data?.appointments || []).map((appt) => (
              <div
                key={appt._id}
                className="rounded-[16px] border border-[#ebebeb] bg-white p-5 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-[#222222]">{appt.title}</p>
                      <StatusBadge status={appt.status} />
                    </div>
                    <p className="mt-1 text-[13px] text-[#6a6a6a]">
                      From:{' '}
                      <Link
                        to={`/app/users/${appt.farmerId?._id}`}
                        className="font-medium text-[#222222] hover:underline"
                      >
                        {appt.farmerId?.name || 'Farmer'}
                      </Link>
                    </p>
                    {appt.requestedAt && (
                      <p className="mt-1 text-[12px] text-[#6a6a6a]">
                        Requested for: {new Date(appt.requestedAt).toLocaleString()}
                      </p>
                    )}
                    {appt.notes && (
                      <p className="mt-2 text-[13px] text-[#6a6a6a] leading-relaxed">
                        {appt.notes}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-[#6a6a6a]">
                    {new Date(appt.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {appt.status === 'pending' && (
                  <div className="mt-4 space-y-2">
                    <textarea
                      value={specialistNote[appt._id] || ''}
                      onChange={(e) =>
                        setSpecialistNote((p) => ({ ...p, [appt._id]: e.target.value }))
                      }
                      placeholder="Optional note to farmer…"
                      rows={2}
                      maxLength={1000}
                      className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-[13px] text-[#222222] outline-none focus:border-[#222222] resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => statusMut.mutate({ id: appt._id, status: 'confirmed' })}
                        disabled={statusMut.isPending}
                        className="rounded-[8px] bg-[#222222] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[#3d7a52] disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => statusMut.mutate({ id: appt._id, status: 'cancelled' })}
                        disabled={statusMut.isPending}
                        className="rounded-[8px] border border-[#dddddd] px-4 py-1.5 text-[13px] font-medium text-[#c13515] hover:bg-red-50 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {appt.status === 'confirmed' && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => statusMut.mutate({ id: appt._id, status: 'completed' })}
                      disabled={statusMut.isPending}
                      className="rounded-[8px] bg-green-600 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Mark completed
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Farmer: outgoing ── */}
      {isFarmer && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[18px] font-semibold text-[#222222]">My appointment requests</h2>
            <p className="text-[13px] text-[#6a6a6a]">
              Book via a{' '}
              <Link to="/app/communities" className="text-[#3d7a52] hover:underline font-medium">
                specialist's profile
              </Link>
            </p>
          </div>
          {outgoingQ.isLoading && (
            <p className="mt-2 text-[14px] text-[#6a6a6a]">Loading…</p>
          )}
          {!outgoingQ.isLoading && (outgoingQ.data?.appointments || []).length === 0 && (
            <p className="mt-2 text-[14px] text-[#6a6a6a]">
              No appointment requests yet. Browse{' '}
              <Link to="/app/communities" className="text-[#3d7a52] hover:underline">
                communities
              </Link>{' '}
              or visit a specialist's profile to book.
            </p>
          )}
          <div className="mt-4 space-y-3">
            {(outgoingQ.data?.appointments || []).map((appt) => (
              <div
                key={appt._id}
                className="rounded-[16px] border border-[#ebebeb] bg-white p-5 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-[#222222]">{appt.title}</p>
                      <StatusBadge status={appt.status} />
                    </div>
                    <p className="mt-1 text-[13px] text-[#6a6a6a]">
                      With:{' '}
                      <Link
                        to={`/app/users/${appt.specialistId?._id}`}
                        className="font-medium text-[#222222] hover:underline"
                      >
                        {appt.specialistId?.name || 'Specialist'}
                      </Link>
                    </p>
                    {appt.requestedAt && (
                      <p className="mt-1 text-[12px] text-[#6a6a6a]">
                        Requested for: {new Date(appt.requestedAt).toLocaleString()}
                      </p>
                    )}
                    {appt.notes && (
                      <p className="mt-2 text-[13px] text-[#6a6a6a]">{appt.notes}</p>
                    )}
                    {appt.specialistNote && (
                      <p className="mt-2 rounded-[8px] bg-blue-50 px-3 py-2 text-[12px] text-blue-800">
                        <strong>Specialist note:</strong> {appt.specialistNote}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-[#6a6a6a]">
                    {new Date(appt.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {appt.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => cancelMut.mutate(appt._id)}
                    disabled={cancelMut.isPending}
                    className="mt-3 text-[12px] font-medium text-[#c13515] underline disabled:opacity-50"
                  >
                    Cancel request
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
