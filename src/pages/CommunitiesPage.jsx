import { useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'
import { ArrowRight, MessageCircle, Plus, Users } from 'lucide-react'
import { communitiesApi } from '../lib/api'

const HIGHLIGHT_TONES = [
  'from-emerald-900 via-emerald-700 to-emerald-500',
  'from-cyan-900 via-cyan-700 to-cyan-500',
  'from-zinc-900 via-zinc-800 to-zinc-600',
  'from-amber-900 via-amber-700 to-amber-500',
]

/**
 * Community hub: highlighted communities on top + aggregated posts from those communities.
 */
export function CommunitiesPage() {
  const qc = useQueryClient()

  const listQ = useQuery({
    queryKey: ['communities'],
    queryFn: () => communitiesApi.list(),
  })

  const [showCreate, setShowCreate] = useState(false)
  const [cName, setCName] = useState('')
  const [cDesc, setCDesc] = useState('')

  const createMut = useMutation({
    mutationFn: (b) => communitiesApi.create(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communities'] })
      setShowCreate(false)
      setCName('')
      setCDesc('')
    },
  })

  const joinMut = useMutation({
    mutationFn: (id) => communitiesApi.join(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communities'] })
      qc.invalidateQueries({ queryKey: ['community-posts-highlighted'] })
    },
  })

  const leaveMut = useMutation({
    mutationFn: (id) => communitiesApi.leave(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communities'] })
      qc.invalidateQueries({ queryKey: ['community-posts-highlighted'] })
    },
  })

  const communities = listQ.data?.communities || []

  const highlighted = useMemo(
    () =>
      [...communities]
        .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
        .slice(0, 4),
    [communities],
  )

  const joinedCount = useMemo(
    () => communities.filter((c) => c.isMember).length,
    [communities],
  )

  const postsQueries = useQueries({
    queries: highlighted.map((c) => ({
      queryKey: ['community-posts-highlighted', c._id],
      queryFn: () => communitiesApi.posts(c._id),
      enabled: Boolean(c._id),
      staleTime: 30_000,
    })),
  })

  const postsLoading = highlighted.length > 0 && postsQueries.some((q) => q.isLoading)
  const postsError = postsQueries.find((q) => q.error)?.error

  const highlightedPosts = useMemo(() => {
    const all = []
    highlighted.forEach((community, idx) => {
      const posts = postsQueries[idx]?.data?.posts || []
      for (const p of posts) {
        all.push({
          ...p,
          __community: {
            _id: community._id,
            name: community.name,
          },
        })
      }
    })
    all.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime()
      const tb = new Date(b.createdAt || 0).getTime()
      return tb - ta
    })
    return all
  }, [highlighted, postsQueries])

  const contributors = useMemo(() => {
    const ids = new Set()
    highlightedPosts.forEach((p) => {
      const id = p.authorId?._id || p.authorId
      if (id) ids.add(String(id))
    })
    return ids.size
  }, [highlightedPosts])

  const totalComments = useMemo(
    () => highlightedPosts.reduce((sum, p) => sum + (Number(p.commentCount) || 0), 0),
    [highlightedPosts],
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Community</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Highlighted communities first, then all recent posts from those highlighted groups.
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Create community
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border-light pb-3">
        <NavLink
          to="/app/communities"
          end
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-brand/10 text-brand' : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
            }`
          }
        >
          Community
        </NavLink>
        <NavLink
          to="/app/following"
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-brand/10 text-brand' : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
            }`
          }
        >
          Following
        </NavLink>
      </div>

      {showCreate && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMut.mutate({ name: cName, description: cDesc })
          }}
          className="rounded-2xl border border-border-light bg-surface p-6 shadow-card"
        >
          <h2 className="text-lg font-semibold text-text-primary">Start a new community</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Give your community a clear topic so members can quickly decide to join.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Name *</label>
              <input
                required
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none transition focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Description</label>
              <input
                value={cDesc}
                onChange={(e) => setCDesc(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none transition focus:ring-2 focus:ring-brand/30"
              />
            </div>
          </div>
          {createMut.error && <p className="mt-3 text-sm text-error">{createMut.error.message}</p>}
          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={createMut.isPending}
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {createMut.isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {listQ.isLoading && <p className="text-sm text-text-secondary">Loading communities...</p>}
      {listQ.error && <p className="text-sm text-error">{listQ.error.message}</p>}

      {listQ.isSuccess && highlighted.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-light bg-surface p-8 text-center shadow-card">
          <p className="text-sm text-text-secondary">
            No communities yet. Create the first one and invite people to start the discussion.
          </p>
        </div>
      )}

      {highlighted.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {highlighted.map((c, idx) => (
            <article
              key={c._id}
              className="relative overflow-hidden rounded-2xl border border-border-light text-white shadow-card"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${HIGHLIGHT_TONES[idx % HIGHLIGHT_TONES.length]}`} />
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative flex min-h-52 flex-col justify-between p-5">
                <div>
                  <h2 className="line-clamp-2 text-2xl font-semibold leading-tight">{c.name}</h2>
                  <p className="mt-2 text-sm text-white/85">
                    {c.description || 'Farmer discussion space'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/85">
                    {typeof c.memberCount === 'number' ? `${c.memberCount} members` : 'Members unavailable'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      to={`/app/communities/${c._id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-100"
                    >
                      Open
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                    {c.isMember ? (
                      <button
                        onClick={() => leaveMut.mutate(c._id)}
                        disabled={leaveMut.isPending}
                        className="rounded-lg border border-white/60 bg-transparent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
                      >
                        {leaveMut.isPending ? 'Leaving...' : 'Leave'}
                      </button>
                    ) : (
                      <button
                        onClick={() => joinMut.mutate(c._id)}
                        disabled={joinMut.isPending}
                        className="rounded-lg border border-white/60 bg-transparent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
                      >
                        {joinMut.isPending ? 'Joining...' : 'Join'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-border-light bg-surface p-5 shadow-card">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Posts from highlighted communities</h2>
              <p className="mt-1 text-sm text-text-secondary">
                {postsLoading ? 'Loading posts...' : `${highlightedPosts.length} posts`}
              </p>
            </div>
            <MessageCircle className="h-5 w-5 text-text-secondary" aria-hidden />
          </div>

          {postsLoading && <p className="text-sm text-text-secondary">Loading posts...</p>}
          {postsError && <p className="text-sm text-error">{postsError.message}</p>}

          {!postsLoading && !postsError && highlightedPosts.length === 0 && highlighted.length > 0 && (
            <div className="rounded-2xl border border-dashed border-border-light bg-surface p-8 text-center shadow-card">
              <p className="text-sm text-text-secondary">
                No posts yet from highlighted communities.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {highlightedPosts.map((post) => {
              const authorName = post.authorId?.name || 'Member'
              const authorId = post.authorId?._id || null
              const initial = authorName.charAt(0).toUpperCase()
              const communityName = post.__community?.name || post.communityId?.name || 'Community'
              const communityId = post.__community?._id || post.communityId?._id

              return (
                <article
                  key={`${post._id}-${communityId || 'community'}`}
                  className="rounded-2xl border border-border-light bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-hover"
                >
                  <div className="flex gap-3">
                    <Link
                      to={authorId ? `/app/users/${authorId}` : '/app/communities'}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white"
                    >
                      {initial}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                        <span className="font-semibold text-text-primary">{authorName}</span>
                        <span className="rounded-lg bg-zinc-100 px-2 py-0.5 font-medium text-text-primary">
                          {communityName}
                        </span>
                        <time dateTime={post.createdAt}>
                          {post.createdAt ? new Date(post.createdAt).toLocaleString() : ''}
                        </time>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-text-primary">
                        {post.body}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-light pt-3">
                        <span className="rounded-lg bg-zinc-50 px-2.5 py-1 text-xs font-medium text-text-secondary">
                          {post.likeCount || 0} likes
                        </span>
                        <span className="rounded-lg bg-zinc-50 px-2.5 py-1 text-xs font-medium text-text-secondary">
                          {post.commentCount || 0} comments
                        </span>
                        <Link
                          to={communityId ? `/app/communities/${communityId}` : '/app/communities'}
                          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                        >
                          Open community
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-2xl border border-border-light bg-surface p-5 shadow-card">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Overview</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border-light bg-surface-secondary p-3">
                <p className="text-xs text-text-secondary">Communities</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{communities.length}</p>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-secondary p-3">
                <p className="text-xs text-text-secondary">Joined</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{joinedCount}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-border-light bg-surface-secondary p-3">
                <p className="text-xs text-text-secondary">Highlighted now</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{highlighted.length}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border-light bg-surface p-5 shadow-card">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Post activity</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border-light bg-surface-secondary p-3">
                <p className="text-xs text-text-secondary">Posts</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{highlightedPosts.length}</p>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-secondary p-3">
                <p className="text-xs text-text-secondary">Contributors</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{contributors}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-border-light bg-surface-secondary p-3">
                <p className="text-xs text-text-secondary">Comments</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{totalComments}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
