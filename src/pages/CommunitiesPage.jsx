import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  communitiesApi,
  postsApi,
  likesApi,
  savedPostsApi,
} from '../lib/api'
import { useAuth } from '../hooks/useAuth'

/**
 * Full community forum — create community, join, post, comment, like, save.
 */
export function CommunitiesPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [activeCommunity, setActiveCommunity] = useState(null)

  /* ── Communities list ── */
  const listQ = useQuery({
    queryKey: ['communities'],
    queryFn: () => communitiesApi.list(),
  })

  /* ── Create community ── */
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

  /* ── Join ── */
  const joinMut = useMutation({
    mutationFn: (id) => communitiesApi.join(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communities'] }),
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Communities</h1>
          <p className="mt-1 text-sm text-text-secondary">Join groups, post updates, and discuss with other farmers.</p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-text-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand"
          >
            + Create community
          </button>
        )}
      </div>

      {showCreate && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMut.mutate({ name: cName, description: cDesc })
          }}
          className="rounded-2xl border border-border-light bg-surface p-6 shadow-card"
        >
          <h2 className="text-lg font-semibold text-text-primary">
            New community
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Name" required value={cName} onChange={setCName} />
            <Field label="Description" value={cDesc} onChange={setCDesc} />
          </div>
          {createMut.error && (
            <p className="mt-3 text-sm text-error">{createMut.error.message}</p>
          )}
          <div className="mt-5 flex gap-3">
            <Btn type="submit" loading={createMut.isPending}>Create</Btn>
            <BtnSecondary onClick={() => setShowCreate(false)}>Cancel</BtnSecondary>
          </div>
        </form>
      )}

      {listQ.isLoading && <p className="text-sm text-text-secondary">Loading…</p>}

      {/* ── Community cards ── */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(listQ.data?.communities || []).map((c) => (
          <div
            key={c._id}
            className="flex flex-col rounded-2xl border border-border-light bg-surface p-5 shadow-card transition hover:border-zinc-300 hover:shadow-hover"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-text-primary">{c.name}</h3>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                  Forum
                </span>
                {/* Shown when list API enriches communities with counts (optional). */}
                {typeof c.memberCount === 'number' && (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                    {c.memberCount} members
                  </span>
                )}
              </div>
            </div>
            {c.description && (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-secondary">{c.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCommunity(c)}
                className="rounded-lg bg-text-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand"
              >
                Open
              </button>
              <button
                onClick={() => joinMut.mutate(c._id)}
                disabled={joinMut.isPending}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-text-primary transition hover:bg-surface-secondary disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Active community detail (posts) ── */}
      {activeCommunity && (
        <CommunityDetail
          community={activeCommunity}
          userId={user?._id}
          onBack={() => setActiveCommunity(null)}
        />
      )}
    </div>
  )
}

/* ───────────────────────────────────────────────────────
 * Community detail: posts + new post + comments + likes
 * ─────────────────────────────────────────────────────── */
function CommunityDetail({ community, userId, onBack }) {
  const qc = useQueryClient()
  const postsQ = useQuery({
    queryKey: ['community-posts', community._id],
    queryFn: () => communitiesApi.posts(community._id),
  })
  const [body, setBody] = useState('')
  const postMut = useMutation({
    mutationFn: (b) => communitiesApi.createPost(community._id, b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-posts', community._id] })
      setBody('')
    },
  })

  return (
    <section className="rounded-2xl border border-border-light bg-surface p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">{community.name}</h2>
          {community.description && (
            <p className="mt-1 text-sm text-text-secondary">{community.description}</p>
          )}
        </div>
        <BtnSecondary onClick={onBack}>Back</BtnSecondary>
      </div>

      {/* ── New post ── */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!body.trim()) return
          postMut.mutate({ body })
        }}
        className="mt-5"
      >
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a post…"
          className="w-full rounded-xl border border-border px-3 py-2.5 text-sm text-text-primary outline-none transition focus:ring-2 focus:ring-brand/30"
        />
        {postMut.error && (
          <p className="mt-1 text-sm text-error">{postMut.error.message}</p>
        )}
        <Btn type="submit" loading={postMut.isPending} className="mt-2">
          Post
        </Btn>
      </form>

      {/* ── Posts ── */}
      {postsQ.isLoading && <p className="mt-4 text-sm text-text-secondary">Loading posts…</p>}
      <div className="mt-4 space-y-4">
        {(postsQ.data?.posts || []).map((post) => (
          <PostCard
            key={post._id}
            post={post}
            userId={userId}
            communityId={community._id}
          />
        ))}
      </div>
    </section>
  )
}

/* ── Single post card with like, save, comments ── */
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
    <div className="rounded-xl border border-border-light bg-surface-page/60 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">{post.authorId?.name || 'User'}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{post.body}</p>
        </div>
        {isAuthor && (
          <button
            onClick={() => {
              if (confirm('Delete this post?')) deleteMut.mutate()
            }}
            className="shrink-0 text-xs font-medium text-error hover:underline"
          >
            Delete
          </button>
        )}
      </div>

      {post.editedAt && <p className="mt-1 text-xs text-text-secondary">(edited)</p>}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border-light pt-3">
        <button
          type="button"
          onClick={() => likeMut.mutate()}
          className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-red-100"
        >
          ♥ {post.likeCount || 0}
        </button>
        <button
          type="button"
          onClick={() => unlikeMut.mutate()}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-secondary"
        >
          Unlike
        </button>
        <button
          type="button"
          onClick={() => saveMut.mutate()}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-secondary"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setShowComments((p) => !p)}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-secondary"
        >
          Comments ({post.commentCount || 0})
        </button>
      </div>

      {/* ── Comments ── */}
      {showComments && (
        <div className="mt-4 space-y-2 border-t border-border-light pt-3">
          {commentsQ.isLoading && <p className="text-xs text-text-secondary">Loading…</p>}
          {(commentsQ.data?.comments || []).map((c) => (
            <div key={c._id} className="rounded-lg border border-border-light bg-surface px-3 py-2">
              <p className="text-xs font-semibold text-text-primary">{c.authorId?.name || 'User'}</p>
              <p className="mt-0.5 text-sm text-text-primary">{c.body}</p>
              {c.parentCommentId && <p className="mt-1 text-[11px] text-text-secondary">↳ reply</p>}
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!commentBody.trim()) return
              commentMut.mutate({ body: commentBody })
            }}
            className="flex gap-2"
          >
            <input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Write a comment…"
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button
              type="submit"
              disabled={commentMut.isPending}
              className="rounded-lg bg-text-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand disabled:opacity-50"
            >
              Reply
            </button>
          </form>
          {commentMut.error && <p className="text-xs text-error">{commentMut.error.message}</p>}
        </div>
      )}
    </div>
  )
}

/* ── Tiny shared components ── */
function Field({ label, onChange, multiline, ...props }) {
  const cls =
    'w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none transition focus:ring-2 focus:ring-brand/30'
  return (
    <div>
      {label && <label className="mb-1 block text-sm font-medium text-text-primary">{label}</label>}
      {multiline ? (
        <textarea rows={3} {...props} onChange={(e) => onChange(e.target.value)} className={cls} />
      ) : (
        <input {...props} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  )
}

function Btn({ children, loading, className = '', ...props }) {
  return (
    <button
      disabled={loading}
      className={`rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50 ${className}`}
      {...props}
    >
      {loading ? 'Wait…' : children}
    </button>
  )
}

function BtnSecondary({ children, ...props }) {
  return (
    <button
      className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-secondary"
      {...props}
    >
      {children}
    </button>
  )
}
