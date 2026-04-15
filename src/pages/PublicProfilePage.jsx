import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { usersApi, followsApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useHasRole } from '../hooks/useHasRole'

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

  if (q.isLoading) {
    return <p className="text-[14px] text-[#6a6a6a]">Loading profile…</p>
  }
  if (q.error) {
    return (
      <div className="rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card">
        <p className="text-[14px] text-[#c13515]">{q.error.message}</p>
        <Link to="/app/lands" className="mt-4 inline-block text-[14px] font-medium text-[#ff385c]">
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
          </p>
          <p className="mt-2 text-[13px] text-[#6a6a6a]">
            {followerCount} followers · {followingCount} following
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
                  className="rounded-[8px] bg-[#ff385c] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#e00b41] disabled:opacity-50"
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
        className="inline-block text-[14px] font-medium text-[#ff385c] underline"
      >
        Back to lands
      </Link>
    </div>
  )
}
