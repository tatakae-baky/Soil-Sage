import { Router } from 'express'
import { z } from 'zod'
import { DiscoveryComment } from '../models/DiscoveryComment.js'
import { DiscoveryArticle } from '../models/DiscoveryArticle.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRoles } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'

const router = Router()

const updateSchema = z.object({
  body: z.string().min(1),
})

router.patch('/:id', requireAuth, requireRoles('farmer'), async (req, res) => {
  const comment = await DiscoveryComment.findById(req.params.id)
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
  const comment = await DiscoveryComment.findById(req.params.id)
  if (!comment || comment.deletedAt) {
    return sendError(res, 404, 'Comment not found')
  }
  if (comment.authorId.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not your comment')
  }
  comment.deletedAt = new Date()
  await comment.save()
  const article = await DiscoveryArticle.findById(comment.articleId)
  if (article && article.commentCount > 0) {
    article.commentCount -= 1
    await article.save()
  }
  return res.json({ ok: true })
})

export default router
