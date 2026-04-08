import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { User } from '../models/User.js'

/** Registration cannot self-elevate to admin */
const REGISTER_ROLES = ['farmer', 'land_owner', 'specialist']
import { requireAuth } from '../middleware/auth.js'
import { signAccessToken } from '../utils/token.js'
import { sendError } from '../utils/errors.js'

const router = Router()

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().default(''),
  password: z.string().min(8),
  roles: z.array(z.enum(REGISTER_ROLES)).min(1).default(['farmer']),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function computeApprovals(roles) {
  const landOwnerApproval = roles.includes('land_owner')
    ? 'pending'
    : 'not_applicable'
  const specialistApproval = roles.includes('specialist')
    ? 'pending'
    : 'not_applicable'
  return { landOwnerApproval, specialistApproval }
}

/** Public shape without sensitive fields */
function publicUser(u) {
  if (!u) return null
  const o = u.toObject ? u.toObject() : { ...u }
  delete o.passwordHash
  return o
}

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  let { name, email, phone, password, roles } = parsed.data
  /** Land owners use farmer-facing features (land registration, etc.) per product spec */
  if (roles.includes('land_owner') && !roles.includes('farmer')) {
    roles = [...roles, 'farmer']
  }
  const exists = await User.findOne({ email: email.toLowerCase() })
  if (exists) {
    return sendError(res, 409, 'Email already registered')
  }
  const passwordHash = await bcrypt.hash(password, 12)
  const { landOwnerApproval, specialistApproval } = computeApprovals(roles)
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash,
    roles,
    landOwnerApproval,
    specialistApproval,
  })
  const token = signAccessToken(user._id.toString())
  return res.status(201).json({
    token,
    user: publicUser(user),
  })
})

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const { email, password } = parsed.data
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash'
  )
  if (!user) {
    return sendError(res, 401, 'Invalid email or password')
  }
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    return sendError(res, 401, 'Invalid email or password')
  }
  const token = signAccessToken(user._id.toString())
  return res.json({
    token,
    user: publicUser(user),
  })
})

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id).lean()
  return res.json({ user: publicUser(user) })
})

export default router
