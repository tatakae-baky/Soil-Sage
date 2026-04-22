import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Star, ArrowLeft } from 'lucide-react'
import { usersApi, followsApi, reviewsApi, appointmentsApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useHasRole } from '../hooks/useHasRole'

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          className={`leading-none ${s <= value ? 'text-amber-400' : 'text-[#dddddd]'} ${onChange ? 'hover:text-amber-300' : 'cursor-default'}`}
          aria-label={`${s} star${s !== 1 ? 's' : ''}`}
        >
          <Star className="h-5 w-5" fill={s <= value ? 'currentColor' : 'none'} aria-hidden />
        </button>
      ))}
    </div>
  )
}

/**
 * Public land-owner / farmer card — lists their active lands and rental availability (no email).
 */
export function PublicProfilePage() {
  const { userId } = useParams()
  const qc = useQueryClient()
  const { user: me } = useAuth()
  const isFarmer = useHasRole('farmer')

  const q = useQuery({
    queryKey: ['users', 'public', userId],
    queryFn: () => usersApi.publicProfile(userId),
    enabled: Boolean(userId),
  })

  const followStatusQ = useQuery({
    queryKey: ['follows', 'status', userId],
    queryFn: () => followsApi.status(userId),
    enabled: Boolean(userId && me && userId !== me._id && isFarmer),
  })

  const isSpecialist = q.data?.user?.specialistApproval === 'approved'

  const reviewsQ = useQuery({
    queryKey: ['reviews', 'specialist', userId],
    queryFn: () => reviewsApi.list(userId),
    enabled: Boolean(userId && isSpecialist),
  })

  const [reviewRating, setReviewRating] = useState(5)
  const [reviewBody, setReviewBody] = useState('')
  const [reviewError, setReviewError] = useState('')

  const followMut = useMutation({
    mutationFn: () => followsApi.follow(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follows', 'status', userId] })
      qc.invalidateQueries({ queryKey: ['users', 'public', userId] })
    },
  })

  const unfollowMut = useMutation({
    mutationFn: () => followsApi.unfollow(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follows', 'status', userId] })
      qc.invalidateQueries({ queryKey: ['users', 'public', userId] })
    },
  })

  const submitReviewMut = useMutation({
    mutationFn: () => reviewsApi.create(userId, { rating: reviewRating, body: reviewBody }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', 'specialist', userId] })
      setReviewBody('')
      setReviewRating(5)
      setReviewError('')
    },
    onError: (e) => setReviewError(e.message),
  })

  const deleteReviewMut = useMutation({
    mutationFn: () => reviewsApi.remove(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews', 'specialist', userId] }),
  })

  /* ── Book appointment ── */
  const [apptTitle, setApptTitle] = useState('')
  const [apptNotes, setApptNotes] = useState('')
  const [apptDate, setApptDate] = useState('')
  const [apptError, setApptError] = useState('')
  const [apptSuccess, setApptSuccess] = useState(false)

  const bookMut = useMutation({
    mutationFn: () =>
      appointmentsApi.create({
        specialistId: userId,
        title: apptTitle.trim(),
        notes: apptNotes.trim(),
        ...(apptDate ? { requestedAt: new Date(apptDate).toISOString() } : {}),
      }),
    onSuccess: () => {
      setApptTitle('')
      setApptNotes('')
      setApptDate('')
      setApptError('')
      setApptSuccess(true)
    },
    onError: (e) => { setApptError(e.message); setApptSuccess(false) },
  })

  if (q.isLoading) {
    return <p className="text-[14px] text-[#6a6a6a]">Loading profile…</p>
  }
  if (q.error) {
    return (
      <div className="rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card">
        <p className="text-[14px] text-[#c13515]">{q.error.message}</p>
        <Link to="/app/lands" className="mt-4 inline-block text-[14px] font-medium text-[#3d7a52]">
          Back to lands
        </Link>
      </div>
    )
  }

  const { user, lands } = q.data || {}
  if (!user) return null

  const isSelf = me && String(user._id) === String(me._id)
  const following = followStatusQ.data?.following
  const followerCount = user.followerCount ?? followStatusQ.data?.followerCount ?? 0
  const followingCount = user.followingCount ?? followStatusQ.data?.followingCount ?? 0

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#222222] text-xl font-semibold text-white">
          {user.profilePhotoUrl ? (
            <img src={user.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            user.name?.charAt(0)?.toUpperCase() || '?'
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
            {user.name}
          </h1>
          <p className="mt-1 text-[14px] text-[#6a6a6a]">
            Roles: {(user.roles || []).join(', ')}
            {user.roles?.includes('land_owner') && (
              <span className="ml-2 rounded-[14px] bg-[#f2f2f2] px-2 py-0.5 text-[12px] font-semibold text-[#222222]">
                Land owner: {user.landOwnerApproval}
              </span>
            )}
            {user.roles?.includes('specialist') && (
              <span className="ml-2 rounded-[14px] bg-blue-50 px-2 py-0.5 text-[12px] font-semibold text-blue-800">
                Specialist: {user.specialistApproval}
              </span>
            )}
          </p>
          <p className="mt-2 text-[13px] text-[#6a6a6a]">
            {followerCount} followers · {followingCount} following
            {isSpecialist && reviewsQ.data?.averageRating != null && (
              <span className="ml-3 text-amber-500 font-medium inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden /> {reviewsQ.data.averageRating} ({reviewsQ.data.total} review{reviewsQ.data.total !== 1 ? 's' : ''})
              </span>
            )}
          </p>
          {isFarmer && !isSelf && (
            <div className="mt-3">
              {following ? (
                <button
                  type="button"
                  onClick={() => unfollowMut.mutate()}
                  disabled={unfollowMut.isPending}
                  className="rounded-[8px] border border-[#dddddd] px-4 py-2 text-[13px] font-medium text-[#222222] hover:bg-[#f2f2f2] disabled:opacity-50"
                >
                  Unfollow
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => followMut.mutate()}
                  disabled={followMut.isPending}
                  className="rounded-[8px] bg-[#3d7a52] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#2a5c3b] disabled:opacity-50"
                >
                  Follow
                </button>
              )}
              {(followMut.error || unfollowMut.error) && (
                <p className="mt-2 text-[12px] text-[#c13515]">
                  {(followMut.error || unfollowMut.error)?.message}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <section>
        <h2 className="text-[18px] font-semibold text-[#222222]">Lands on Soil Sage</h2>
        {(!lands || lands.length === 0) && (
          <p className="mt-2 text-[14px] text-[#6a6a6a]">No active land records.</p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(lands || []).map((land) => (
            <article
              key={land._id}
              className="rounded-[20px] border border-[#ebebeb] bg-white p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[16px] font-semibold text-[#222222]">
                  {land.title?.trim() || 'Untitled'}
                </h3>
                {land.availableForRent ? (
                  <span className="shrink-0 rounded-[14px] bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                    Available for rent
                  </span>
                ) : (
                  <span className="shrink-0 rounded-[14px] bg-[#f2f2f2] px-2 py-0.5 text-[11px] font-semibold text-[#6a6a6a]">
                    Not listed for rent
                  </span>
                )}
              </div>
              {land.cropType && (
                <p className="mt-2 text-[13px] text-[#6a6a6a]">Crop: {land.cropType}</p>
              )}
              {land.size && (
                <p className="text-[13px] text-[#6a6a6a]">Size: {land.size}</p>
              )}
              <p className="mt-3 font-mono text-[11px] text-[#6a6a6a]">ID: {land._id}</p>
            </article>
          ))}
        </div>
      </section>

      <Link
        to="/app/lands"
        className="inline-block text-[14px] font-medium text-[#3d7a52] underline"
      >
        <ArrowLeft className="inline h-4 w-4" aria-hidden /> Back to lands
      </Link>

      {isSpecialist && (
        <section className="space-y-4">
          <h2 className="text-[18px] font-semibold text-[#222222]">Reviews</h2>

          {reviewsQ.isLoading && <p className="text-[14px] text-[#6a6a6a]">Loading reviews…</p>}

          {reviewsQ.data && (
            <>
              {reviewsQ.data.total === 0 && (
                <p className="text-[14px] text-[#6a6a6a]">No reviews yet.</p>
              )}
              <div className="space-y-3">
                {(reviewsQ.data.reviews || []).map((r) => (
                  <div
                    key={r._id}
                    className="rounded-[14px] border border-[#ebebeb] bg-white p-4 shadow-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#222222] text-sm font-semibold text-white">
                        {r.reviewerId?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#222222]">
                          {r.reviewerId?.name || 'Farmer'}
                        </p>
                        <div className="flex items-center gap-1 text-[14px] text-amber-400">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} className={i < r.rating ? 'text-amber-400' : 'text-[#dddddd]'}>★</span>
                          ))}
                        </div>
                      </div>
                      <span className="ml-auto text-[11px] text-[#6a6a6a]">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {r.body && (
                      <p className="mt-2 text-[13px] text-[#6a6a6a] leading-relaxed">{r.body}</p>
                    )}
                    {me && r.reviewerId?._id === me._id && (
                      <button
                        type="button"
                        onClick={() => deleteReviewMut.mutate()}
                        disabled={deleteReviewMut.isPending}
                        className="mt-2 text-[12px] text-[#c13515] underline disabled:opacity-50"
                      >
                        Delete my review
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {isFarmer && !isSelf && !reviewsQ.data.myReview && (
                <div className="rounded-[14px] border border-[#ebebeb] bg-white p-4 shadow-card">
                  <h3 className="text-[15px] font-semibold text-[#222222]">Write a review</h3>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      submitReviewMut.mutate()
                    }}
                    className="mt-3 space-y-3"
                  >
                    <StarRating value={reviewRating} onChange={setReviewRating} />
                    <textarea
                      value={reviewBody}
                      onChange={(e) => setReviewBody(e.target.value)}
                      placeholder="Share your experience (optional)"
                      rows={3}
                      maxLength={1000}
                      className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-[13px] text-[#222222] outline-none focus:border-[#222222] focus:ring-2 focus:ring-[#222222] resize-none"
                    />
                    {reviewError && (
                      <p className="text-[13px] text-[#c13515]">{reviewError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={submitReviewMut.isPending}
                      className="rounded-[8px] bg-[#3d7a52] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#2a5c3b] disabled:opacity-50"
                    >
                      {submitReviewMut.isPending ? 'Submitting…' : 'Submit review'}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ── Book appointment ── */}
      {isSpecialist && isFarmer && !isSelf && (
        <section>
          <h2 className="text-[18px] font-semibold text-[#222222]">Book an appointment</h2>
          {apptSuccess ? (
            <div className="mt-4 rounded-[14px] border border-green-200 bg-green-50 px-4 py-4">
              <p className="text-[14px] font-semibold text-green-800">Appointment request sent!</p>
              <p className="mt-1 text-[13px] text-green-700">
                The specialist will confirm or decline your request.{' '}
                <Link to="/app/appointments" className="underline font-medium">
                  View your appointments
                </Link>
              </p>
              <button
                type="button"
                onClick={() => setApptSuccess(false)}
                className="mt-3 text-[13px] text-green-700 underline"
              >
                Book another
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); bookMut.mutate() }}
              className="mt-4 rounded-[16px] border border-[#ebebeb] bg-white p-5 shadow-card space-y-3"
            >
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[#222222]">
                  Subject *
                </label>
                <input
                  required
                  value={apptTitle}
                  onChange={(e) => setApptTitle(e.target.value)}
                  placeholder="e.g. Soil health consultation"
                  maxLength={200}
                  className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px] text-[#222222] outline-none focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[#222222]">
                  Preferred date/time (optional)
                </label>
                <input
                  type="datetime-local"
                  value={apptDate}
                  onChange={(e) => setApptDate(e.target.value)}
                  className="rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px] text-[#222222] outline-none focus:border-[#222222]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[#222222]">
                  Additional notes (optional)
                </label>
                <textarea
                  value={apptNotes}
                  onChange={(e) => setApptNotes(e.target.value)}
                  placeholder="Describe what you need help with…"
                  rows={3}
                  maxLength={2000}
                  className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2 text-[14px] text-[#222222] outline-none focus:border-[#222222] focus:ring-2 focus:ring-[#222222] resize-none"
                />
              </div>
              {apptError && (
                <p className="text-[13px] text-[#c13515]">{apptError}</p>
              )}
              <button
                type="submit"
                disabled={bookMut.isPending || !apptTitle.trim()}
                className="rounded-[8px] bg-[#222222] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#3d7a52] disabled:opacity-50"
              >
                {bookMut.isPending ? 'Sending…' : 'Send appointment request'}
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  )
}
