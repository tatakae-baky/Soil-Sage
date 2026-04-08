import { Router } from 'express'
import { Notification } from '../models/Notification.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const list = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()
  return res.json({ notifications: list })
})

router.patch('/:id/read', requireAuth, async (req, res) => {
  const n = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
  })
  if (!n) return res.status(404).json({ error: 'Notification not found' })
  n.read = true
  await n.save()
  return res.json({ notification: n })
})

router.post('/read-all', requireAuth, async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true })
  return res.json({ ok: true })
})

export default router
