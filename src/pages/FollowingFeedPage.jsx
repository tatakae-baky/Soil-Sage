import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, NavLink } from 'react-router-dom'
import { ArrowRight, Flame, MessageCircle } from 'lucide-react'
import { postsApi } from '../lib/api'

const HIGHLIGHT_TONES = [
  'from-cyan-900 via-cyan-700 to-cyan-500',
  'from-emerald-900 via-emerald-700 to-emerald-500',
  'from-zinc-900 via-zinc-800 to-zinc-600',
  'from-amber-900 via-amber-700 to-amber-500',
]

/**
 * Following page: highlighted communities first, then merged posts from those communities.
 */
export function FollowingFeedPage() {
  const q = useQuery({
    queryKey: ['posts', 'following-feed'],
    queryFn: () => postsApi.followingFeed({ limit: 40 }),
  })

  const posts = q.data?.posts || []

  const highlightedCommunities = useMemo(() => {
    const byCommunity = new Map()
    for (const p of posts) {
      const id = p.communityId?._id
      if (!id) continue
      const existing = byCommunity.get(id) || {
        id,
        name: p.communityId?.name || 'Community',
        postCount: 0,
        likeTotal: 0,
        commentTotal: 0,
      }
      existing.postCount += 1
      existing.likeTotal += Number(p.likeCount) || 0
      existing.commentTotal += Number(p.commentCount) || 0
      byCommunity.set(id, existing)
    }
    return [...byCommunity.values()]
      .sort((a, b) => {
        if (b.postCount !== a.postCount) return b.postCount - a.postCount
        return b.likeTotal - a.likeTotal
      })
      .slice(0, 4)
  }, [posts])

  const highlightedIds = useMemo(
    () => new Set(highlightedCommunities.map((c) => c.id)),
    [highlightedCommunities],
  )

  const feedPosts = useMemo(() => {
    if (highlightedIds.size === 0) return posts
    return posts.filter((p) => highlightedIds.has(p.communityId?._id))
  }, [posts, highlightedIds])

  const topStreaks = useMemo(() => {
    const byAuthor = new Map()
    for (const p of feedPosts) {
      const authorId = p.authorId?._id || p.authorId || 'unknown'
      const existing = byAuthor.get(authorId) || {
        id: authorId,
        name: p.authorId?.name || 'Member',
        posts: 0,
        likes: 0,
      }
      existing.posts += 1
      existing.likes += Number(p.likeCount) || 0
      byAuthor.set(authorId, existing)
    }
    return [...byAuthor.values()]
      .sort((a, b) => {
        if (b.posts !== a.posts) return b.posts - a.posts
        return b.likes - a.likes
      })
      .slice(0, 10)
  }, [feedPosts])

  const totalComments = useMemo(
    () => feedPosts.reduce((sum, p) => sum + (Number(p.commentCount) || 0), 0),
    [feedPosts],
  )

  const totalLikes = useMemo(
    () => feedPosts.reduce((sum, p) => sum + (Number(p.likeCount) || 0), 0),
    [feedPosts],
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Following feed</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Community view scoped to people you follow.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border-light pb-3">
        <NavLink
          to="/app/communities"
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
          end
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-brand/10 text-brand' : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
            }`
          }
        >
          Following
        </NavLink>
      </div>

      {highlightedCommunities.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {highlightedCommunities.map((community, idx) => (
            <Link
              key={community.id}
              to={`/app/communities/${community.id}`}
              className="group relative overflow-hidden rounded-2xl border border-border-light text-white shadow-card"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${HIGHLIGHT_TONES[idx % HIGHLIGHT_TONES.length]}`} />
              <div className="absolute inset-0 bg-black/25 transition group-hover:bg-black/35" />
              <div className="relative flex min-h-48 flex-col justify-end p-5">
                <p className="line-clamp-2 text-2xl font-semibold leading-tight">{community.name}</p>
                <p className="mt-2 text-sm text-white/85">
                  {community.postCount} posts - {community.commentTotal} comments
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-border-light bg-surface p-5 shadow-card">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Posts from highlighted communities</h2>
              <p className="mt-1 text-sm text-text-secondary">
                {q.isLoading ? 'Loading posts...' : `${feedPosts.length} posts`}
              </p>
            </div>
            <MessageCircle className="h-5 w-5 text-text-secondary" aria-hidden />
          </div>

          {q.isLoading && <p className="text-sm text-text-secondary">Loading...</p>}
          {q.isError && <p className="text-sm text-error">{q.error.message}</p>}

          {q.isSuccess && posts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border-light bg-surface px-8 py-12 text-center shadow-card">
              <p className="text-sm text-text-secondary">
                No posts yet. Follow more farmers and join active communities to populate this feed.
              </p>
              <Link to="/app/communities" className="mt-4 inline-block text-sm font-semibold text-brand underline">
                Browse communities
              </Link>
            </div>
          )}

          {q.isSuccess && posts.length > 0 && feedPosts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border-light bg-surface px-8 py-12 text-center shadow-card">
              <p className="text-sm text-text-secondary">
                No posts found for highlighted communities.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {feedPosts.map((post) => {
              const author = post.authorId
              const comm = post.communityId
              const initial = (author?.name || 'M').charAt(0).toUpperCase()
              return (
                <article
                  key={post._id}
                  className="rounded-2xl border border-border-light bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-hover"
                >
                  <div className="flex gap-3">
                    <Link
                      to={author?._id ? `/app/users/${author._id}` : '/app/communities'}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white"
                    >
                      {initial}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                        <span className="font-semibold text-text-primary">{author?.name || 'Member'}</span>
                        <span className="rounded-lg bg-zinc-100 px-2 py-0.5 font-medium text-text-primary">
                          {comm?.name || 'Community'}
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
                          to={comm?._id ? `/app/communities/${comm._id}` : '/app/communities'}
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
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Feed stats</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border-light bg-surface-secondary p-3">
                <p className="text-xs text-text-secondary">Highlighted</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{highlightedCommunities.length}</p>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-secondary p-3">
                <p className="text-xs text-text-secondary">Posts</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{feedPosts.length}</p>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-secondary p-3">
                <p className="text-xs text-text-secondary">Likes</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{totalLikes}</p>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-secondary p-3">
                <p className="text-xs text-text-secondary">Comments</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{totalComments}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border-light bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Top streaks</h3>
              <Flame className="h-4 w-4 text-brand" aria-hidden />
            </div>
            <div className="mt-4 space-y-2">
              {topStreaks.length === 0 && (
                <p className="text-sm text-text-secondary">No streak data yet.</p>
              )}
              {topStreaks.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2 text-sm"
                >
                  <span className="truncate pr-2">
                    {idx + 1}. {entry.name}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-text-secondary">
                    {entry.posts} posts
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

