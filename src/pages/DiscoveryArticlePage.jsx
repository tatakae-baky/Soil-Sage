import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { discoveryApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useHasRole } from '../hooks/useHasRole'

const KIND_LABEL = {
  research: 'Research',
  alert: 'Alert',
  policy: 'Policy',
  general: 'Update',
}

/**
 * Single discovery article with reactions and comments (farmer-authored comments).
 */
export function DiscoveryArticlePage() {
  const { articleId } = useParams()
  const qc = useQueryClient()
  const { user } = useAuth()
  const isFarmer = useHasRole('farmer')
  const [body, setBody] = useState('')
  const [replyToId, setReplyToId] = useState(null)
  const [commentErr, setCommentErr] = useState('')

  const articleQ = useQuery({
    queryKey: ['discovery', 'article', articleId],
    queryFn: () => discoveryApi.article(articleId),
    enabled: Boolean(articleId),
  })

  const commentsQ = useQuery({
    queryKey: ['discovery', 'comments', articleId],
    queryFn: () => discoveryApi.comments(articleId),
    enabled: Boolean(articleId),
  })

  const reactMut = useMutation({
    mutationFn: (kind) => discoveryApi.react(articleId, { kind }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discovery', 'article', articleId] })
      qc.invalidateQueries({ queryKey: ['discovery', 'articles'] })
    },
  })

  const commentMut = useMutation({
    mutationFn: () =>
      discoveryApi.addComment(articleId, {
        body: body.trim(),
        parentCommentId: replyToId || undefined,
      }),
    onSuccess: () => {
      setBody('')
      setReplyToId(null)
      setCommentErr('')
      qc.invalidateQueries({ queryKey: ['discovery', 'comments', articleId] })
      qc.invalidateQueries({ queryKey: ['discovery', 'article', articleId] })
      qc.invalidateQueries({ queryKey: ['discovery', 'articles'] })
    },
    onError: (e) => setCommentErr(e.message || 'Comment failed'),
  })

  const a = articleQ.data?.article
  const myReaction = articleQ.data?.myReaction
  const comments = commentsQ.data?.comments || []

  return (
    <div className="space-y-6">
      <Link
        to="/app/discovery"
        className="inline-flex items-center gap-1 text-[14px] font-medium text-[#3d7a52] underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Discovery feed
      </Link>

      {articleQ.isLoading && <p className="text-[14px] text-[#6a6a6a]">Loadingâ€¦</p>}
      {articleQ.isError && (
        <p className="text-[14px] text-[#c13515]">{articleQ.error.message}</p>
      )}

      {a && (
        <>
          <header className="rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <span className="rounded-lg bg-[#f2f2f2] px-2 py-0.5 font-semibold text-[#222222]">
                {KIND_LABEL[a.kind] || a.kind}
              </span>
              <span className="text-[#6a6a6a]">
                {a.authorId?.name ? `By ${a.authorId.name}` : ''} Â·{' '}
                {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}
              </span>
            </div>
            <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-[#222222]">
              {a.title}
            </h1>
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-[#222222]">
              {a.body}
            </p>

            {isFarmer && user && (
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#ebebeb] pt-5">
                <span className="text-[13px] text-[#6a6a6a]">Your vote:</span>
                <button
                  type="button"
                  disabled={reactMut.isPending}
                  onClick={() => reactMut.mutate('like')}
                  className={`rounded-[8px] px-4 py-2 text-[13px] font-medium transition ${
                    myReaction === 'like'
                      ? 'bg-[#222222] text-white'
                      : 'border border-[#dddddd] text-[#222222] hover:bg-[#f7f7f7]'
                  }`}
                >
                  Like ({a.likeCount || 0})
                </button>
                <button
                  type="button"
                  disabled={reactMut.isPending}
                  onClick={() => reactMut.mutate('dislike')}
                  className={`rounded-[8px] px-4 py-2 text-[13px] font-medium transition ${
                    myReaction === 'dislike'
                      ? 'bg-[#222222] text-white'
                      : 'border border-[#dddddd] text-[#222222] hover:bg-[#f7f7f7]'
                  }`}
                >
                  Dislike ({a.dislikeCount || 0})
                </button>
                {reactMut.isError && (
                  <span className="text-[12px] text-[#c13515]">{reactMut.error.message}</span>
                )}
              </div>
            )}
          </header>

          <section>
            <h2 className="text-[18px] font-semibold text-[#222222]">Comments</h2>
            {commentsQ.isLoading && (
              <p className="mt-2 text-[14px] text-[#6a6a6a]">Loading commentsâ€¦</p>
            )}
            <ul className="mt-4 space-y-3">
              {comments.map((c) => (
                <li
                  key={c._id}
                  className={`rounded-[14px] border border-[#ebebeb] bg-white px-4 py-3 text-[14px] ${
                    c.parentCommentId ? 'ml-8 border-dashed' : ''
                  }`}
                >
                  <span className="font-medium text-[#222222]">{c.authorId?.name || 'Member'}</span>
                  <span className="ml-2 text-[12px] text-[#6a6a6a]">
                    {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                  </span>
                  <p className="mt-2 whitespace-pre-wrap text-[#222222]">{c.body}</p>
                  {isFarmer && (
                    <button
                      type="button"
                      onClick={() => setReplyToId(c._id)}
                      className="mt-2 text-[12px] font-medium text-[#3d7a52] underline"
                    >
                      Reply
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {isFarmer ? (
              <form
                className="mt-6 rounded-[20px] border border-[#ebebeb] bg-[#fafafa] p-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!body.trim()) return
                  commentMut.mutate()
                }}
              >
                {replyToId && (
                  <div className="mb-3 flex items-center justify-between text-[12px] text-[#6a6a6a]">
                    <span>Replying to a comment</span>
                    <button
                      type="button"
                      onClick={() => setReplyToId(null)}
                      className="font-medium text-[#3d7a52] underline"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <label className="mb-2 block text-[13px] font-medium text-[#222222]">
                  Add a comment
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  className="w-full rounded-[8px] border border-[#dddddd] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#222222]"
                  placeholder="Share experience or ask a clarifying questionâ€¦"
                />
                {commentErr && <p className="mt-2 text-[13px] text-[#c13515]">{commentErr}</p>}
                <button
                  type="submit"
                  disabled={commentMut.isPending || !body.trim()}
                  className="mt-3 rounded-[8px] bg-[#3d7a52] px-4 py-2 text-[14px] font-medium text-white disabled:opacity-50"
                >
                  Post comment
                </button>
              </form>
            ) : (
              <p className="mt-4 text-[13px] text-[#6a6a6a]">
                Sign in as a farmer to comment or react.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}

