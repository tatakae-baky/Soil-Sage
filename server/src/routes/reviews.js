import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { SpecialistReview } from '../models/SpecialistReview.js'
import { User } from '../models/User.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { requireRoles } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'

const router = Router()

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().max(1000).optional().default(''),
})

/**
 * GET /reviews/specialists/:userId
 * Public — paginated reviews for an approved specialist + aggregate averageRating.
 */
router.get('/specialists/:userId', optionalAuth, async (req, res) => {
  const { userId } = req.params
  if (!mongoose.isValidObjectId(userId)) {
    return sendError(res, 404, 'Specialist not found')
  }
  const limit = Math.min(Number(req.query.limit) || 20, 50)
  const skip = Math.max(Number(req.query.skip) || 0, 0)

  const [reviews, totalResult, aggResult] = await Promise.all([
    SpecialistReview.find({ specialistId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reviewerId', 'name profilePhotoUrl')
      .lean(),
    SpecialistReview.countDocuments({ specialistId: userId }),
    SpecialistReview.aggregate([
      { $match: { specialistId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]),
  ])

  const averageRating = aggResult.length > 0 ? Math.round(aggResult[0].avg * 10) / 10 : null

  /** If the requester is a logged-in farmer, surface whether they already reviewed */
  let myReview = null
  if (req.user) {
    myReview = await SpecialistReview.findOne({
      reviewerId: req.user._id,
      specialistId: userId,
    }).lean()
  }

  return res.json({ reviews, total: totalResult, averageRating, myReview: myReview || null })
})

/**
 * POST /reviews/specialists/:userId
 * Authenticated farmer — submit a review for an approved specialist.
 */
router.post(
  '/specialists/:userId',
  requireAuth,
  requireRoles('farmer'),
  async (req, res) => {
    const { userId } = req.params
    if (!mongoose.isValidObjectId(userId)) {
      return sendError(res, 404, 'Specialist not found')
    }
    if (userId === req.user._id.toString()) {
      return sendError(res, 400, 'Cannot review yourself')
    }
    const specialist = await User.findById(userId).lean()
    if (!specialist) return sendError(res, 404, 'Specialist not found')
    if (specialist.specialistApproval !== 'approved') {
      return sendError(res, 400, 'User is not an approved specialist')
    }

    const parsed = createReviewSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendError(res, 400, 'Validation failed', parsed.error.flatten())
    }

    try {
      const review = await SpecialistReview.create({
        reviewerId: req.user._id,
        specialistId: userId,
        rating: parsed.data.rating,
        body: parsed.data.body,
      })
      const populated = await review.populate('reviewerId', 'name profilePhotoUrl')
      return res.status(201).json({ review: populated })
    } catch (e) {
      if (e.code === 11000) {
        return sendError(res, 409, 'You have already reviewed this specialist')
      }
      throw e
    }
  }
)

/**
 * DELETE /reviews/specialists/:userId
 * Authenticated farmer — delete their own review for a specialist.
 */
router.delete(
  '/specialists/:userId',
  requireAuth,
  requireRoles('farmer'),
  async (req, res) => {
    const { userId } = req.params
    if (!mongoose.isValidObjectId(userId)) {
      return sendError(res, 404, 'Review not found')
    }
    const removed = await SpecialistReview.findOneAndDelete({
      reviewerId: req.user._id,
      specialistId: userId,
    })
    if (!removed) return sendError(res, 404, 'Review not found')
    return res.json({ ok: true })
  }
)

export default router
