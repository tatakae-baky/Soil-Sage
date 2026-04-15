import { Router } from 'express'
import mongoose from 'mongoose'
import { UserFollow } from '../models/UserFollow.js'
import { User } from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRoles } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'

const router = Router()

/**
 * MVP: farmers build a social graph; keeps noise down vs. open roles.
 * (Land owners / specialists can still be followed if they appear in UI as followable later.)
 */
router.post(
  '/users/:userId',
  requireAuth,
  requireRoles('farmer'),
  async (req, res) => {
    const { userId } = req.params
    if (!mongoose.isValidObjectId(userId)) {
      return sendError(res, 400, 'Invalid user id')
    }
    if (userId === req.user._id.toString()) {
      return sendError(res, 400, 'Cannot follow yourself')
    }
    const target = await User.findById(userId).lean()
    if (!target) return sendError(res, 404, 'User not found')

    try {
      await UserFollow.create({
        followerId: req.user._id,
        followingId: userId,
      })
      return res.status(201).json({ ok: true })
    } catch (e) {
      if (e.code === 11000) {
        return sendError(res, 409, 'Already following')
      }
      throw e
    }
  }
)

router.delete(
  '/users/:userId',
  requireAuth,
  requireRoles('farmer'),
  async (req, res) => {
    const { userId } = req.params
    if (!mongoose.isValidObjectId(userId)) {
      return sendError(res, 400, 'Invalid user id')
    }
    const r = await UserFollow.deleteOne({
      followerId: req.user._id,
      followingId: userId,
    })
    if (r.deletedCount === 0) {
      return sendError(res, 404, 'Not following this user')
    }
    return res.json({ ok: true })
  }
)

/** Whether the current farmer follows `userId`, plus public counts */
router.get('/users/:userId/status', requireAuth, async (req, res) => {
  const { userId } = req.params
  if (!mongoose.isValidObjectId(userId)) {
    return sendError(res, 400, 'Invalid user id')
  }
  const [followerCount, followingCount, existing] = await Promise.all([
    UserFollow.countDocuments({ followingId: userId }),
    UserFollow.countDocuments({ followerId: userId }),
    UserFollow.findOne({
      followerId: req.user._id,
      followingId: userId,
    }).lean(),
  ])
  return res.json({
    followerCount,
    followingCount,
    following: Boolean(existing),
  })
})

router.get('/users/:userId/followers', async (req, res) => {
  const { userId } = req.params
  if (!mongoose.isValidObjectId(userId)) {
    return sendError(res, 400, 'Invalid user id')
  }
  const limit = Math.min(Number(req.query.limit) || 30, 100)
  const skip = Math.max(Number(req.query.skip) || 0, 0)
  const edges = await UserFollow.find({ followingId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('followerId', 'name profilePhotoUrl roles')
    .lean()
  const users = edges.map((e) => e.followerId).filter(Boolean)
  return res.json({ users, limit, skip })
})

router.get('/users/:userId/following', async (req, res) => {
  const { userId } = req.params
  if (!mongoose.isValidObjectId(userId)) {
    return sendError(res, 400, 'Invalid user id')
  }
  const limit = Math.min(Number(req.query.limit) || 30, 100)
  const skip = Math.max(Number(req.query.skip) || 0, 0)
  const edges = await UserFollow.find({ followerId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('followingId', 'name profilePhotoUrl roles')
    .lean()
  const users = edges.map((e) => e.followingId).filter(Boolean)
  return res.json({ users, limit, skip })
})

export default router
