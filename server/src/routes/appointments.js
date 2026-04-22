import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { Appointment } from '../models/Appointment.js'
import { User } from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRoles, requireApprovedSpecialist } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'
import { createNotification } from '../utils/notify.js'

const router = Router()

const createSchema = z.object({
  specialistId: z.string(),
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional().default(''),
  requestedAt: z.string().datetime({ offset: true }).optional().nullable(),
})

const statusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed']),
  specialistNote: z.string().max(1000).optional().default(''),
})

/** POST / — farmer requests appointment with approved specialist */
router.post('/', requireAuth, requireRoles('farmer'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return sendError(res, 400, 'Validation failed', parsed.error.flatten())

  const { specialistId, title, notes, requestedAt } = parsed.data

  if (!mongoose.isValidObjectId(specialistId)) return sendError(res, 404, 'Specialist not found')

  const specialist = await User.findOne({
    _id: specialistId,
    roles: 'specialist',
    specialistApproval: 'approved',
  }).lean()
  if (!specialist) return sendError(res, 404, 'Approved specialist not found')

  const appointment = await Appointment.create({
    farmerId: req.user._id,
    specialistId,
    title: title.trim(),
    notes: notes?.trim() || '',
    requestedAt: requestedAt ? new Date(requestedAt) : null,
  })

  await createNotification({
    userId: specialist._id,
    type: 'appointment_request',
    title: 'New appointment request',
    body: `${req.user.name} has requested an appointment: ${title.trim().slice(0, 100)}`,
    relatedId: appointment._id,
    relatedType: 'Appointment',
  })

  return res.status(201).json({ appointment })
})

/** GET /outgoing — farmer: my sent appointment requests */
router.get('/outgoing', requireAuth, requireRoles('farmer'), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))

  const [appointments, total] = await Promise.all([
    Appointment.find({ farmerId: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('specialistId', 'name profilePhotoUrl')
      .lean(),
    Appointment.countDocuments({ farmerId: req.user._id }),
  ])
  return res.json({ appointments, total, page, pages: Math.ceil(total / limit) })
})

/** GET /incoming — specialist: my received appointment requests */
router.get('/incoming', requireAuth, requireApprovedSpecialist, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))

  const [appointments, total] = await Promise.all([
    Appointment.find({ specialistId: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('farmerId', 'name profilePhotoUrl')
      .lean(),
    Appointment.countDocuments({ specialistId: req.user._id }),
  ])
  return res.json({ appointments, total, page, pages: Math.ceil(total / limit) })
})

/** PATCH /:id/status — specialist updates status (confirm/cancel/complete) */
router.patch('/:id/status', requireAuth, requireApprovedSpecialist, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 404, 'Not found')

  const parsed = statusSchema.safeParse(req.body)
  if (!parsed.success) return sendError(res, 400, 'Validation failed', parsed.error.flatten())

  const appt = await Appointment.findOne({
    _id: req.params.id,
    specialistId: req.user._id,
  })
  if (!appt) return sendError(res, 404, 'Appointment not found')

  appt.status = parsed.data.status
  if (parsed.data.specialistNote) appt.specialistNote = parsed.data.specialistNote.trim()
  await appt.save()

  const notifMap = {
    confirmed: { type: 'appointment_confirmed', title: 'Appointment confirmed' },
    cancelled: { type: 'appointment_cancelled', title: 'Appointment cancelled' },
    completed: { type: 'appointment_completed', title: 'Appointment completed' },
  }
  const notif = notifMap[parsed.data.status]
  if (notif) {
    await createNotification({
      userId: appt.farmerId,
      type: notif.type,
      title: notif.title,
      body: `Your appointment "${appt.title.slice(0, 80)}" has been ${parsed.data.status}.`,
      relatedId: appt._id,
      relatedType: 'Appointment',
    })
  }

  return res.json({ appointment: appt })
})

/** DELETE /:id — farmer cancels own pending appointment */
router.delete('/:id', requireAuth, requireRoles('farmer'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 404, 'Not found')

  const appt = await Appointment.findOne({
    _id: req.params.id,
    farmerId: req.user._id,
    status: 'pending',
  })
  if (!appt) return sendError(res, 404, 'Pending appointment not found')

  await appt.deleteOne()
  return res.json({ ok: true })
})

export default router
