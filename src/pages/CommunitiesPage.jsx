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
        <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
          Communities
        </h1>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-[8px] bg-[#222222] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#ff385c]"
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
          className="rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card"
        >
          <h2 className="text-[16px] font-semibold text-[#222222]">
            New community
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Name" required value={cName} onChange={setCName} />
            <Field label="Description" value={cDesc} onChange={setCDesc} />
          </div>
          {createMut.error && (
            <p className="mt-3 text-[14px] text-[#c13515]">{createMut.error.message}</p>
          )}
          <div className="mt-5 flex gap-3">
            <Btn type="submit" loading={createMut.isPending}>Create</Btn>
            <BtnSecondary onClick={() => setShowCreate(false)}>Cancel</BtnSecondary>
          </div>
        </form>
      )}

      {listQ.isLoading && <p className="text-[14px] text-[#6a6a6a]">Loading…</p>}

      {/* ── Community cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(listQ.data?.communities || []).map((c) => (
          <div key={c._id} className="rounded-[20px] border border-[#ebebeb] bg-white p-5 shadow-card">
            <h3 className="text-[16px] font-semibold text-[#222222]">{c.name}</h3>
            {c.description && (
              <p className="mt-1 text-[13px] text-[#6a6a6a]">{c.description}</p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setActiveCommunity(c)}
                className="rounded-[8px] bg-[#222222] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#ff385c]"
              >
                Open
              </button>
              <button
                onClick={() => joinMut.mutate(c._id)}
                disabled={joinMut.isPending}
                className="rounded-[8px] border border-[#dddddd] px-4 py-2 text-[13px] font-medium text-[#222222] transition hover:bg-[#f2f2f2] disabled:opacity-50"
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
    <section className="rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-semibold tracking-[-0.18px] text-[#222222]">
          {community.name}
        </h2>
        <BtnSecondary onClick={onBack}>Back</BtnSecondary>
      </div>
      {community.description && (
        <p className="mt-1 text-[14px] text-[#6a6a6a]">{community.description}</p>
      )}

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
          className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
        />
        {postMut.error && (
          <p className="mt-1 text-[14px] text-[#c13515]">{postMut.error.message}</p>
        )}
        <Btn type="submit" loading={postMut.isPending} className="mt-2">
          Post
        </Btn>
      </form>

      {/* ── Posts ── */}
      {postsQ.isLoading && <p className="mt-4 text-[14px] text-[#6a6a6a]">Loading posts…</p>}
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
    <div className="rounded-[14px] border border-[#ebebeb] bg-[#f7f7f7] p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[14px] font-medium text-[#222222]">
            {post.authorId?.name || 'User'}
          </p>
          <p className="mt-1 text-[14px] leading-[1.43] text-[#222222]">
            {post.body}
          </p>
        </div>
        {isAuthor && (
          <button
            onClick={() => { if (confirm('Delete this post?')) deleteMut.mutate() }}
            className="text-[13px] text-[#c13515] hover:underline"
          >
            Delete
          </button>
        )}
      </div>

      {post.editedAt && (
        <p className="mt-1 text-[12px] text-[#6a6a6a]">(edited)</p>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-[13px]">
        <button
          onClick={() => likeMut.mutate()}
          className="font-medium text-[#222222] hover:text-[#ff385c]"
        >
          ♥ {post.likeCount || 0}
        </button>
        <button
          onClick={() => unlikeMut.mutate()}
          className="text-[#6a6a6a] hover:text-[#222222]"
        >
          Unlike
        </button>
        <button
          onClick={() => saveMut.mutate()}
          className="text-[#6a6a6a] hover:text-[#222222]"
        >
          Save
        </button>
        <button
          onClick={() => setShowComments((p) => !p)}
          className="text-[#6a6a6a] hover:text-[#222222]"
        >
          Comments ({post.commentCount || 0})
        </button>
      </div>

      {/* ── Comments ── */}
      {showComments && (
        <div className="mt-3 space-y-2 border-t border-[#ebebeb] pt-3">
          {commentsQ.isLoading && <p className="text-[13px] text-[#6a6a6a]">Loading…</p>}
          {(commentsQ.data?.comments || []).map((c) => (
            <div key={c._id} className="rounded-[8px] bg-white px-3 py-2">
              <p className="text-[13px] font-medium text-[#222222]">
                {c.authorId?.name || 'User'}
              </p>
              <p className="text-[13px] text-[#222222]">{c.body}</p>
              {c.parentCommentId && (
                <p className="text-[12px] text-[#6a6a6a]">↳ reply</p>
              )}
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
              className="flex-1 rounded-[8px] border border-[#dddddd] px-3 py-2 text-[13px] text-[#222222] outline-none transition focus:border-[#222222]"
            />
            <button
              type="submit"
              disabled={commentMut.isPending}
              className="rounded-[8px] bg-[#222222] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#ff385c] disabled:opacity-50"
            >
              Reply
            </button>
          </form>
          {commentMut.error && (
            <p className="text-[13px] text-[#c13515]">{commentMut.error.message}</p>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Tiny shared components ── */
function Field({ label, onChange, multiline, ...props }) {
  const cls = 'w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#222222]'
  return (
    <div>
      {label && <label className="mb-1 block text-[14px] font-medium text-[#222222]">{label}</label>}
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
      className={`rounded-[8px] bg-[#ff385c] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#e00b41] disabled:opacity-50 ${className}`}
      {...props}
    >
      {loading ? 'Wait…' : children}
    </button>
  )
}

function BtnSecondary({ children, ...props }) {
  return (
    <button
      className="rounded-[8px] border border-[#dddddd] px-5 py-2.5 text-[14px] font-medium text-[#222222] transition hover:bg-[#f2f2f2]"
      {...props}
    >
      {children}
    </button>
  )
}
