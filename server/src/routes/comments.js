import { Router } from 'express'
import { z } from 'zod'
import { Comment } from '../models/Comment.js'
import { Post } from '../models/Post.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRoles } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'

const router = Router()

const updateSchema = z.object({
  body: z.string().min(1),
})

router.patch('/:id', requireAuth, requireRoles('farmer'), async (req, res) => {
  const comment = await Comment.findById(req.params.id)
  if (!comment || comment.deletedAt) {
    return sendError(res, 404, 'Comment not found')
  }
  if (comment.authorId.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not your comment')
  }
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  comment.body = parsed.data.body
  comment.editedAt = new Date()
  await comment.save()
  return res.json({ comment })
})

router.delete('/:id', requireAuth, requireRoles('farmer'), async (req, res) => {
  const comment = await Comment.findById(req.params.id)
  if (!comment || comment.deletedAt) {
    return sendError(res, 404, 'Comment not found')
  }
  if (comment.authorId.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not your comment')
  }
  comment.deletedAt = new Date()
  await comment.save()
  const post = await Post.findById(comment.postId)
  if (post && post.commentCount > 0) {
    post.commentCount -= 1
    await post.save()
  }
  return res.json({ ok: true })
})

export default router
