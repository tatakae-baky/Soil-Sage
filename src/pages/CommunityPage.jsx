import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Bookmark,
  Trash2,
  Users,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { communitiesApi, likesApi, postsApi, savedPostsApi } from '../lib/api'

export function CommunityPage() {
  const { communityId } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [body, setBody] = useState('')

  const communityQ = useQuery({
    queryKey: ['community', communityId],
    queryFn: () => communitiesApi.getOne(communityId),
  })

  const postsQ = useQuery({
    queryKey: ['community-posts', communityId],
    queryFn: () => communitiesApi.posts(communityId),
  })

  const joinMut = useMutation({
    mutationFn: () => communitiesApi.join(communityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', communityId] })
      qc.invalidateQueries({ queryKey: ['communities'] })
    },
  })

  const leaveMut = useMutation({
    mutationFn: () => communitiesApi.leave(communityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', communityId] })
      qc.invalidateQueries({ queryKey: ['communities'] })
    },
  })

  const postMut = useMutation({
    mutationFn: (b) => communitiesApi.createPost(communityId, b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-posts', communityId] })
      setBody('')
    },
  })

  if (communityQ.isLoading) {
    return <p className="text-sm text-text-secondary">Loading…</p>
  }
  if (communityQ.error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-error">{communityQ.error.message}</p>
        <Link
          to="/app/communities"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to communities
        </Link>
      </div>
    )
  }

  const c = communityQ.data?.community

  const membershipBtn = (extraClass = '') =>
    c?.isMember ? (
      <button
        onClick={() => leaveMut.mutate()}
        disabled={leaveMut.isPending}
        className={`rounded-md border border-brand px-5 py-1.5 text-sm font-semibold text-brand transition hover:border-red-400 hover:text-error disabled:opacity-50 ${extraClass}`}
      >
        {leaveMut.isPending ? 'Leaving…' : 'Joined'}
      </button>
    ) : (
      <button
        onClick={() => joinMut.mutate()}
        disabled={joinMut.isPending}
        className={`rounded-md bg-brand px-5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50 ${extraClass}`}
      >
        {joinMut.isPending ? 'Joining…' : 'Join'}
      </button>
    )

  return (
    <div className="-mx-4 -mt-8 md:-mx-6">
      {/* Banner */}
      <div className="h-28 bg-linear-to-r from-brand-dark via-brand to-[#5aab72]" />

      {/* Community identity bar */}
      <div className="border-b border-border-light bg-surface">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <div className="flex flex-wrap items-end gap-4 pb-3">
            <div className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-surface bg-brand text-3xl font-bold uppercase text-white shadow-md">
              {c?.name?.[0] ?? '?'}
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-between gap-3 pb-1">
              <div>
                <h1 className="text-xl font-bold text-text-primary">{c?.name}</h1>
                <p className="text-xs text-text-secondary">
                  {typeof c?.memberCount === 'number'
                    ? `${c.memberCount} ${c.memberCount === 1 ? 'member' : 'members'}`
                    : ''}
                </p>
              </div>
              {membershipBtn()}
            </div>
          </div>
        </div>
      </div>

      {/* Page body */}
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <Link
          to="/app/communities"
          className="mb-5 inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Communities
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main feed */}
          <div className="space-y-3">
            {/* Post creation */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!body.trim()) return
                postMut.mutate({ body })
              }}
              className="rounded-xl border border-border-light bg-surface p-4 shadow-card"
            >
              <textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write a post…"
                className="w-full rounded-lg border border-border bg-surface-secondary px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand/50 focus:bg-surface focus:ring-2 focus:ring-brand/20"
              />
              {postMut.error && (
                <p className="mt-1 text-xs text-error">{postMut.error.message}</p>
              )}
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={postMut.isPending || !body.trim()}
                  className="rounded-md bg-brand px-5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
                >
                  {postMut.isPending ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>

            {/* Posts */}
            {postsQ.isLoading && (
              <p className="py-4 text-sm text-text-secondary">Loading posts…</p>
            )}
            {!postsQ.isLoading && (postsQ.data?.posts || []).length === 0 && (
              <div className="rounded-xl border border-border-light bg-surface p-10 text-center shadow-card">
                <p className="text-sm text-text-secondary">No posts yet. Be the first to post!</p>
              </div>
            )}
            <div className="space-y-3">
              {(postsQ.data?.posts || []).map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  userId={user?._id}
                  communityId={communityId}
                />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border-light bg-surface shadow-card">
              <div className="bg-linear-to-r from-brand-dark to-brand px-4 py-3">
                <p className="text-sm font-bold text-white">About Community</p>
              </div>
              <div className="space-y-4 p-4">
                {c?.description ? (
                  <p className="text-sm leading-relaxed text-text-primary">{c.description}</p>
                ) : (
                  <p className="text-sm italic text-text-secondary">No description yet.</p>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-text-secondary" aria-hidden />
                  <span className="text-sm font-bold text-text-primary">{c?.memberCount ?? 0}</span>
                  <span className="text-sm text-text-secondary">
                    {(c?.memberCount ?? 0) === 1 ? 'Member' : 'Members'}
                  </span>
                </div>
                <hr className="border-border-light" />
                {membershipBtn('w-full justify-center')}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

/* Post card — Reddit-style with vote column */
function PostCard({ post, userId, communityId }) {
  const qc = useQueryClient()
  const [showComments, setShowComments] = useState(false)
  const [commentBody, setCommentBody] = useState('')

  const commentsQ = useQuery({
    queryKey: ['post-comments', post._id],
    queryFn: () => postsApi.comments(post._id),
    enabled: showComments,
  })

  const likeMut = useMutation({
    mutationFn: () => likesApi.like({ targetType: 'post', targetId: post._id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-posts', communityId] }),
  })

  const unlikeMut = useMutation({
    mutationFn: () => likesApi.unlike({ targetType: 'post', targetId: post._id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-posts', communityId] }),
  })

  const saveMut = useMutation({
    mutationFn: () => savedPostsApi.save(post._id),
  })

  const commentMut = useMutation({
    mutationFn: (b) => postsApi.addComment(post._id, b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['post-comments', post._id] })
      qc.invalidateQueries({ queryKey: ['community-posts', communityId] })
      setCommentBody('')
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => postsApi.remove(post._id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-posts', communityId] }),
  })

  const isAuthor = post.authorId?._id === userId || post.authorId === userId

  return (
    <div className="flex overflow-hidden rounded-xl border border-border-light bg-surface shadow-card transition hover:border-brand/30">
      {/* Vote column */}
      <div className="flex w-11 shrink-0 flex-col items-center gap-1 bg-surface-secondary px-2 py-3">
        <button
          type="button"
          onClick={() => likeMut.mutate()}
          disabled={likeMut.isPending}
          aria-label="Upvote"
          className="rounded-sm p-0.5 text-text-secondary transition hover:bg-brand/10 hover:text-brand disabled:opacity-40"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
        <span className="text-xs font-bold tabular-nums text-text-primary">
          {post.likeCount || 0}
        </span>
        <button
          type="button"
          onClick={() => unlikeMut.mutate()}
          disabled={unlikeMut.isPending}
          aria-label="Downvote"
          className="rounded-sm p-0.5 text-text-secondary transition hover:bg-red-50 hover:text-error disabled:opacity-40"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 p-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
          <Link
            to={post.authorId?._id ? `/app/users/${post.authorId._id}` : '#'}
            className="font-semibold text-text-primary hover:text-brand hover:underline"
          >
            {post.authorId?.name || 'User'}
          </Link>
          {post.createdAt && (
            <span>· {new Date(post.createdAt).toLocaleDateString()}</span>
          )}
          {post.editedAt && <span className="italic">(edited)</span>}
        </div>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
          {post.body}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setShowComments((p) => !p)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-surface-secondary hover:text-text-primary"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            {post.commentCount || 0} Comments
          </button>
          <button
            type="button"
            onClick={() => saveMut.mutate()}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-surface-secondary hover:text-text-primary"
          >
            <Bookmark className="h-3.5 w-3.5" aria-hidden />
            Save
          </button>
          {isAuthor && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Delete this post?')) deleteMut.mutate()
              }}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-error/70 transition hover:bg-red-50 hover:text-error"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete
            </button>
          )}
        </div>

        {showComments && (
          <div className="mt-3 space-y-3 border-t border-border-light pt-3">
            {commentsQ.isLoading && (
              <p className="text-xs text-text-secondary">Loading…</p>
            )}
            {(commentsQ.data?.comments || []).map((c) => (
              <div key={c._id} className="flex gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-bold uppercase text-text-secondary">
                  {c.authorId?.name?.[0] ?? '?'}
                </div>
                <div className="min-w-0">
                  <Link
                    to={c.authorId?._id ? `/app/users/${c.authorId._id}` : '#'}
                    className="text-xs font-semibold text-text-primary hover:text-brand hover:underline"
                  >
                    {c.authorId?.name || 'User'}
                  </Link>
                  <p className="text-xs leading-relaxed text-text-primary">{c.body}</p>
                </div>
              </div>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!commentBody.trim()) return
                commentMut.mutate({ body: commentBody })
              }}
              className="flex gap-2 pt-1"
            >
              <input
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 rounded-lg border border-border bg-surface-secondary px-3 py-1.5 text-xs text-text-primary outline-none focus:border-brand/50 focus:bg-surface focus:ring-2 focus:ring-brand/20"
              />
              <button
                type="submit"
                disabled={commentMut.isPending}
                className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
              >
                Reply
              </button>
            </form>
            {commentMut.error && (
              <p className="text-xs text-error">{commentMut.error.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
