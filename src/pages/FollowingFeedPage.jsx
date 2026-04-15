import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { postsApi } from '../lib/api'

/**
 * Chronological posts from people you follow, limited to communities you have joined.
 */
export function FollowingFeedPage() {
  const q = useQuery({
    queryKey: ['posts', 'following-feed'],
    queryFn: () => postsApi.followingFeed({ limit: 40 }),
  })

  const posts = q.data?.posts || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Following feed</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Updates from farmers you follow in communities you belong to. Follow profiles from{' '}
          <Link to="/app/lands" className="font-semibold text-brand underline">
            Lands
          </Link>{' '}
          (owner cards) and join communities to see their posts here.
        </p>
      </div>

      {q.isLoading && <p className="text-sm text-text-secondary">Loading…</p>}
      {q.isError && <p className="text-sm text-error">{q.error.message}</p>}

      {q.isSuccess && posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-light bg-surface px-8 py-12 text-center shadow-card">
          <p className="text-sm text-text-secondary">
            No posts yet. Follow other farmers and join the same communities they post in.
          </p>
          <Link
            to="/app/communities"
            className="mt-4 inline-block text-sm font-semibold text-brand underline"
          >
            Browse communities
          </Link>
        </div>
      )}

      <div className="relative space-y-0 pl-0 md:pl-4">
        {/* Timeline rail (desktop) */}
        <div
          className="absolute left-[19px] top-3 hidden h-[calc(100%-24px)] w-px bg-border md:block"
          aria-hidden
        />

        <div className="space-y-5">
          {posts.map((post) => {
            const author = post.authorId
            const comm = post.communityId
            const initial = (author?.name || 'M').charAt(0).toUpperCase()
            return (
              <article
                key={post._id}
                className="relative rounded-2xl border border-border-light bg-surface p-5 shadow-card transition hover:border-zinc-300 hover:shadow-hover md:ml-8"
              >
                <div className="flex gap-3">
                  <Link
                    to={author?._id ? `/app/users/${author._id}` : '/app/communities'}
                    className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white ring-2 ring-surface"
                  >
                    {initial}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
                      <span className="font-semibold text-text-primary">{author?.name || 'Member'}</span>
                      <span className="hidden sm:inline">·</span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-text-primary">
                        {comm?.name || 'Community'}
                      </span>
                      <span>·</span>
                      <time dateTime={post.createdAt}>
                        {post.createdAt ? new Date(post.createdAt).toLocaleString() : ''}
                      </time>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-text-primary">
                      {post.body}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-light pt-3">
                      <span className="rounded-full bg-zinc-50 px-2.5 py-1 text-xs font-medium text-text-secondary">
                        {post.likeCount || 0} likes
                      </span>
                      <span className="rounded-full bg-zinc-50 px-2.5 py-1 text-xs font-medium text-text-secondary">
                        {post.commentCount || 0} comments
                      </span>
                      <Link
                        to="/app/communities"
                        className="ml-auto text-xs font-semibold text-brand hover:underline"
                      >
                        Open in communities →
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
