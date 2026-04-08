import { Router } from 'express'
import { z } from 'zod'
import mongoose from 'mongoose'
import { Like } from '../models/Like.js'
import { Post } from '../models/Post.js'
import { Comment } from '../models/Comment.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRoles } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'

const router = Router()

const likeBodySchema = z.object({
  targetType: z.enum(['post', 'comment']),
  targetId: z.string(),
})

router.post('/', requireAuth, requireRoles('farmer'), async (req, res) => {
  const parsed = likeBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const { targetType, targetId } = parsed.data
  if (!mongoose.isValidObjectId(targetId)) {
    return sendError(res, 400, 'Invalid target id')
  }
  if (targetType === 'post') {
    const post = await Post.findById(targetId)
    if (!post || post.deletedAt || post.hiddenByAdmin) {
      return sendError(res, 404, 'Post not found')
    }
  } else {
    const comment = await Comment.findById(targetId)
    if (!comment || comment.deletedAt) {
      return sendError(res, 404, 'Comment not found')
    }
  }
  try {
    await Like.create({
      userId: req.user._id,
      targetType,
      targetId,
    })
    if (targetType === 'post') {
      await Post.findByIdAndUpdate(targetId, { $inc: { likeCount: 1 } })
    }
    return res.status(201).json({ ok: true })
  } catch (e) {
    if (e.code === 11000) {
      return sendError(res, 409, 'Already liked')
    }
    throw e
  }
})

router.delete('/', requireAuth, requireRoles('farmer'), async (req, res) => {
  const parsed = likeBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const { targetType, targetId } = parsed.data
  const removed = await Like.findOneAndDelete({
    userId: req.user._id,
    targetType,
    targetId,
  })
  if (!removed) {
    return sendError(res, 404, 'Like not found')
  }
  if (targetType === 'post') {
    const p = await Post.findById(targetId)
    if (p && p.likeCount > 0) {
      p.likeCount -= 1
      await p.save()
    }
  }
  return res.json({ ok: true })
})

export default router
