import { Router } from 'express'
import { z } from 'zod'
import { User } from '../models/User.js'
import { Post } from '../models/Post.js'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'

const router = Router()

router.use(requireAuth, requireAdmin)

const approveSchema = z.object({
  userId: z.string(),
  landOwner: z.enum(['pending', 'approved', 'rejected', 'not_applicable']).optional(),
  specialist: z.enum(['pending', 'approved', 'rejected', 'not_applicable']).optional(),
})

/** List users pending land_owner or specialist approval */
router.get('/pending-approvals', async (_req, res) => {
  const users = await User.find({
    $or: [
      { landOwnerApproval: 'pending' },
      { specialistApproval: 'pending' },
    ],
  })
    .select('-passwordHash')
    .lean()
  return res.json({ users })
})

router.patch('/approvals', async (req, res) => {
  const parsed = approveSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const { userId, landOwner, specialist } = parsed.data
  const user = await User.findById(userId)
  if (!user) return sendError(res, 404, 'User not found')
  if (landOwner !== undefined) user.landOwnerApproval = landOwner
  if (specialist !== undefined) user.specialistApproval = specialist
  await user.save()
  const lean = user.toObject()
  delete lean.passwordHash
  return res.json({ user: lean })
})

const moderatePostSchema = z.object({
  hiddenByAdmin: z.boolean(),
  moderationNote: z.string().optional(),
})

router.patch('/posts/:postId', async (req, res) => {
  const parsed = moderatePostSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const post = await Post.findById(req.params.postId)
  if (!post) return sendError(res, 404, 'Post not found')
  post.hiddenByAdmin = parsed.data.hiddenByAdmin
  if (parsed.data.moderationNote !== undefined) {
    post.moderationNote = parsed.data.moderationNote
  }
  await post.save()
  return res.json({ post })
})

export default router
