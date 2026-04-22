import { Router } from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { User } from '../models/User.js'
import { Land } from '../models/Land.js'
import { UserFollow } from '../models/UserFollow.js'
import { requireAuth } from '../middleware/auth.js'
import { sendError } from '../utils/errors.js'

const router = Router()

/** GET /specialists — list all approved specialists (paginated) */
router.get('/specialists', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))

  const [users, total] = await Promise.all([
    User.find({ roles: 'specialist', specialistApproval: 'approved' })
      .select('name profilePhotoUrl roles specialistApproval')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments({ roles: 'specialist', specialistApproval: 'approved' }),
  ])
  return res.json({ specialists: users, total, page, pages: Math.ceil(total / limit) })
})

/**
 * Public farmer/land-owner card: no email. Used for rental discovery trust.
 */
router.get('/public/:userId', async (req, res) => {
  const { userId } = req.params
  if (!mongoose.isValidObjectId(userId)) {
    return sendError(res, 404, 'User not found')
  }
  const user = await User.findById(userId)
    .select(
      'name profilePhotoUrl roles landOwnerApproval specialistApproval'
    )
    .lean()
  if (!user) return sendError(res, 404, 'User not found')

  const lands = await Land.find({ ownerId: user._id, isActive: true })
    .select(
      'title description size soilCondition cropType availableForRent location createdAt'
    )
    .sort({ createdAt: -1 })
    .lean()

  const [followerCount, followingCount] = await Promise.all([
    UserFollow.countDocuments({ followingId: user._id }),
    UserFollow.countDocuments({ followerId: user._id }),
  ])

  return res.json({
    user: {
      _id: user._id,
      name: user.name,
      profilePhotoUrl: user.profilePhotoUrl,
      roles: user.roles,
      landOwnerApproval: user.landOwnerApproval,
      specialistApproval: user.specialistApproval,
      followerCount,
      followingCount,
    },
    lands,
  })
})

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
  languagePreference: z.enum(['en', 'bn']).optional(),
  farmLandSize: z.string().optional(),
  farmSoilType: z.string().optional(),
  farmCropCategory: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
})

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendError(res, 400, 'Validation failed', parsed.error.flatten())
    }
    const data = parsed.data
    const user = await User.findById(req.user._id).select('+passwordHash')
    if (!user) return sendError(res, 404, 'User not found')

    if (data.newPassword) {
      if (!data.currentPassword) {
        return sendError(res, 400, 'currentPassword required to change password')
      }
      const match = await bcrypt.compare(data.currentPassword, user.passwordHash)
      if (!match) return sendError(res, 400, 'Current password incorrect')
      user.passwordHash = await bcrypt.hash(data.newPassword, 12)
    }

    const profileFields = { ...data }
    delete profileFields.currentPassword
    delete profileFields.newPassword
    Object.assign(user, profileFields)
    await user.save()

    const lean = user.toObject()
    delete lean.passwordHash
    return res.json({ user: lean })
  } catch (err) {
    // Express 4 does not catch async rejections; forward so the global handler returns JSON.
    if (err?.name === 'ValidationError') {
      return sendError(res, 400, err.message)
    }
    return next(err)
  }
})

export default router
