import { Router } from 'express'
import { z } from 'zod'
import { Land } from '../models/Land.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRoles } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'

const router = Router()

const coordsSchema = z.tuple([z.number(), z.number()])

const createLandSchema = z.object({
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
  size: z.string().optional().default(''),
  soilCondition: z.string().optional().default(''),
  cropType: z.string().optional().default(''),
  coordinates: coordsSchema,
  availableForRent: z.boolean().optional().default(false),
})

const updateLandSchema = createLandSchema.partial()

/**
 * Farmers register land details; listing for rent requires approved land_owner.
 */
router.post('/', requireAuth, requireRoles('farmer'), async (req, res) => {
  const parsed = createLandSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const b = parsed.data
  if (b.availableForRent) {
    const roles = req.user.roles || []
    const ok =
      roles.includes('land_owner') && req.user.landOwnerApproval === 'approved'
    if (!ok) {
      return sendError(
        res,
        403,
        'Approved land owner account required to mark land available for rent'
      )
    }
  }
  const land = await Land.create({
    ownerId: req.user._id,
    title: b.title,
    description: b.description,
    size: b.size,
    soilCondition: b.soilCondition,
    cropType: b.cropType,
    location: {
      type: 'Point',
      coordinates: b.coordinates,
    },
    availableForRent: b.availableForRent,
  })
  return res.status(201).json({ land })
})

router.get('/nearby', async (req, res) => {
  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)
  const maxKm = Math.min(Number(req.query.maxKm) || 50, 200)
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return sendError(res, 400, 'lat and lng query params required')
  }
  const maxMeters = maxKm * 1000
  const lands = await Land.find({
    availableForRent: true,
    isActive: true,
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: maxMeters,
      },
    },
  })
    .populate('ownerId', 'name email profilePhotoUrl')
    .lean()
  return res.json({ lands })
})

/** Lands the current user owns/manages */
router.get('/mine', requireAuth, requireRoles('farmer'), async (req, res) => {
  const lands = await Land.find({ ownerId: req.user._id, isActive: true })
    .sort({ createdAt: -1 })
    .lean()
  return res.json({ lands })
})

router.get('/:id', async (req, res) => {
  const land = await Land.findById(req.params.id)
    .populate('ownerId', 'name email profilePhotoUrl roles')
    .lean()
  if (!land || !land.isActive) {
    return sendError(res, 404, 'Land not found')
  }
  return res.json({ land })
})

router.patch('/:id', requireAuth, requireRoles('farmer'), async (req, res) => {
  const land = await Land.findById(req.params.id)
  if (!land) return sendError(res, 404, 'Land not found')
  if (land.ownerId.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not the owner of this land')
  }
  const parsed = updateLandSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const b = parsed.data
  if (b.availableForRent === true) {
    const roles = req.user.roles || []
    const ok =
      roles.includes('land_owner') && req.user.landOwnerApproval === 'approved'
    if (!ok) {
      return sendError(
        res,
        403,
        'Approved land owner account required to list land for rent'
      )
    }
  }
  if (b.title !== undefined) land.title = b.title
  if (b.description !== undefined) land.description = b.description
  if (b.size !== undefined) land.size = b.size
  if (b.soilCondition !== undefined) land.soilCondition = b.soilCondition
  if (b.cropType !== undefined) land.cropType = b.cropType
  if (b.availableForRent !== undefined) land.availableForRent = b.availableForRent
  if (b.coordinates) {
    land.location = { type: 'Point', coordinates: b.coordinates }
  }
  await land.save()
  return res.json({ land })
})

router.delete('/:id', requireAuth, requireRoles('farmer'), async (req, res) => {
  const land = await Land.findById(req.params.id)
  if (!land) return sendError(res, 404, 'Land not found')
  if (land.ownerId.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not the owner of this land')
  }
  land.isActive = false
  await land.save()
  return res.json({ ok: true })
})

export default router
