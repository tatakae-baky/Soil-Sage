import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { User } from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'
import { sendError } from '../utils/errors.js'

const router = Router()

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

router.patch('/me', requireAuth, async (req, res) => {
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
})

export default router
