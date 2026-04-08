import { Router } from 'express'
import { z } from 'zod'
import { SavedPost } from '../models/SavedPost.js'
import { Post } from '../models/Post.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRoles } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'

const router = Router()

router.get('/', requireAuth, requireRoles('farmer'), async (req, res) => {
  const saves = await SavedPost.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'postId',
      populate: { path: 'authorId', select: 'name profilePhotoUrl' },
    })
    .lean()
  return res.json({ saved: saves })
})

const saveSchema = z.object({
  postId: z.string(),
})

router.post('/', requireAuth, requireRoles('farmer'), async (req, res) => {
  const parsed = saveSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const post = await Post.findById(parsed.data.postId)
  if (!post || post.deletedAt || post.hiddenByAdmin) {
    return sendError(res, 404, 'Post not found')
  }
  try {
    const doc = await SavedPost.create({
      userId: req.user._id,
      postId: parsed.data.postId,
    })
    return res.status(201).json({ saved: doc })
  } catch (e) {
    if (e.code === 11000) {
      return sendError(res, 409, 'Already saved')
    }
    throw e
  }
})

router.delete('/', requireAuth, requireRoles('farmer'), async (req, res) => {
  const parsed = saveSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const r = await SavedPost.findOneAndDelete({
    userId: req.user._id,
    postId: parsed.data.postId,
  })
  if (!r) return sendError(res, 404, 'Saved post not found')
  return res.json({ ok: true })
})

export default router
