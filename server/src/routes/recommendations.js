import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { CropRecommendation } from '../models/CropRecommendation.js'
import { Land } from '../models/Land.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRoles } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'
import { runRecommendation } from '../services/geminiRecommendation.js'

const router = Router()

const createSchema = z.object({
  cropType: z.string().optional().default(''),
  soilType: z.string().optional().default(''),
  region: z.string().optional().default(''),
  season: z.string().optional().default(''),
  notes: z.string().max(1000).optional().default(''),
  landId: z.string().optional(),
})

/** POST / — run a new crop recommendation */
router.post('/', requireAuth, requireRoles('farmer'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return sendError(res, 400, 'Validation failed', parsed.error.flatten())

  const { cropType, soilType, region, season, notes, landId } = parsed.data

  let landContext = ''
  let resolvedLandId = null
  if (landId && mongoose.isValidObjectId(landId)) {
    const land = await Land.findOne({ _id: landId, userId: req.user._id }).lean()
    if (land) {
      resolvedLandId = land._id
      const parts = []
      if (land.title) parts.push(`Title: ${land.title}`)
      if (land.cropType) parts.push(`Current crop: ${land.cropType}`)
      if (land.soilType) parts.push(`Soil type: ${land.soilType}`)
      if (land.size) parts.push(`Size: ${land.size}`)
      landContext = parts.join(', ')
    }
  }

  const { result, disclaimer, model } = await runRecommendation({
    cropType,
    soilType,
    region,
    season,
    notes,
    landContext,
  })

  const doc = await CropRecommendation.create({
    userId: req.user._id,
    landId: resolvedLandId,
    cropType,
    soilType,
    region,
    season,
    notes,
    ...result,
    disclaimer,
    model,
  })

  return res.status(201).json({ recommendation: doc })
})

/** GET / — list my recommendations (paginated) */
router.get('/', requireAuth, requireRoles('farmer'), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10))

  const [recommendations, total] = await Promise.all([
    CropRecommendation.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CropRecommendation.countDocuments({ userId: req.user._id }),
  ])

  return res.json({ recommendations, total, page, pages: Math.ceil(total / limit) })
})

/** GET /:id — single recommendation */
router.get('/:id', requireAuth, requireRoles('farmer'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 404, 'Not found')
  const rec = await CropRecommendation.findOne({ _id: req.params.id, userId: req.user._id }).lean()
  if (!rec) return sendError(res, 404, 'Not found')
  return res.json({ recommendation: rec })
})

export default router
