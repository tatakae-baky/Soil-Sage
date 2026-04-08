import { Router } from 'express'
import { z } from 'zod'
import { Land } from '../models/Land.js'
import { RentalRequest } from '../models/RentalRequest.js'
import { requireAuth } from '../middleware/auth.js'
import { requireApprovedLandOwner, requireRoles } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'
import { createNotification } from '../utils/notify.js'

const router = Router()

const createRequestSchema = z.object({
  landId: z.string(),
  message: z.string().optional().default(''),
})

const decideSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  agreementNote: z.string().optional().default(''),
})

/** Farmer sends rental request */
router.post(
  '/requests',
  requireAuth,
  requireRoles('farmer'),
  async (req, res) => {
    const parsed = createRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendError(res, 400, 'Validation failed', parsed.error.flatten())
    }
    const { landId, message } = parsed.data
    const land = await Land.findById(landId)
    if (!land || !land.isActive) {
      return sendError(res, 404, 'Land not found')
    }
    if (!land.availableForRent) {
      return sendError(res, 400, 'This land is not available for rent')
    }
    if (land.ownerId.toString() === req.user._id.toString()) {
      return sendError(res, 400, 'Cannot request your own land')
    }
    const existing = await RentalRequest.findOne({
      landId,
      requesterId: req.user._id,
      status: 'pending',
    })
    if (existing) {
      return sendError(res, 409, 'You already have a pending request for this land')
    }
    const doc = await RentalRequest.create({
      landId,
      requesterId: req.user._id,
      ownerId: land.ownerId,
      message,
      status: 'pending',
    })
    await createNotification({
      userId: land.ownerId,
      type: 'rental_request',
      title: 'New land rental request',
      body: message || 'A farmer requested to rent your land.',
      relatedId: doc._id,
      relatedType: 'RentalRequest',
    })
    return res.status(201).json({ request: doc })
  }
)

/** Requests sent by current farmer */
router.get(
  '/requests/mine/incoming',
  requireAuth,
  requireApprovedLandOwner,
  async (req, res) => {
    const q = await RentalRequest.find({ ownerId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('landId')
      .populate('requesterId', 'name email profilePhotoUrl')
      .lean()
    return res.json({ requests: q })
  }
)

router.get(
  '/requests/mine/outgoing',
  requireAuth,
  requireRoles('farmer'),
  async (req, res) => {
    const q = await RentalRequest.find({ requesterId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('landId')
      .populate('ownerId', 'name email profilePhotoUrl')
      .lean()
    return res.json({ requests: q })
  }
)

/** Land owner approves or rejects */
router.patch(
  '/requests/:id',
  requireAuth,
  requireApprovedLandOwner,
  async (req, res) => {
    const parsed = decideSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendError(res, 400, 'Validation failed', parsed.error.flatten())
    }
    const doc = await RentalRequest.findById(req.params.id)
    if (!doc) return sendError(res, 404, 'Request not found')
    if (doc.ownerId.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Not your rental request to decide')
    }
    if (doc.status !== 'pending') {
      return sendError(res, 400, 'Request is no longer pending')
    }
    doc.status = parsed.data.status
    doc.agreementNote = parsed.data.agreementNote
    await doc.save()
    await createNotification({
      userId: doc.requesterId,
      type: 'rental_decision',
      title:
        parsed.data.status === 'approved'
          ? 'Rental request approved'
          : 'Rental request rejected',
      body:
        parsed.data.agreementNote ||
        `Your rental request was ${parsed.data.status}.`,
      relatedId: doc._id,
      relatedType: 'RentalRequest',
    })
    return res.json({ request: doc })
  }
)

export default router
