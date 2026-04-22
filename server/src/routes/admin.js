import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { User } from '../models/User.js'
import { Post } from '../models/Post.js'
import { Diagnosis } from '../models/Diagnosis.js'
import { Land } from '../models/Land.js'
import {
  SolutionProvider,
  PROVIDER_CATEGORY_VALUES,
} from '../models/SolutionProvider.js'
import {
  DiscoveryArticle,
  DISCOVERY_KIND_VALUES,
} from '../models/DiscoveryArticle.js'
import { DiscoveryReaction } from '../models/DiscoveryReaction.js'
import { DiscoveryComment } from '../models/DiscoveryComment.js'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'

const router = Router()

router.use(requireAuth, requireAdmin)

const approveSchema = z.object({
  userId: z.string(),
  landOwner: z.enum(['pending', 'approved', 'rejected', 'not_applicable']).optional(),
  specialist: z.enum(['pending', 'approved', 'rejected', 'not_applicable']).optional(),
})

/** Platform-wide stats (counts) */
router.get('/stats', async (_req, res) => {
  const [totalUsers, totalDiagnoses, totalLands, totalPosts, totalSpecialists] =
    await Promise.all([
      User.countDocuments(),
      Diagnosis.countDocuments(),
      Land.countDocuments(),
      Post.countDocuments(),
      User.countDocuments({ specialistApproval: 'approved' }),
    ])
  return res.json({ totalUsers, totalDiagnoses, totalLands, totalPosts, totalSpecialists })
})

/** Search & browse all users */
router.get('/users', async (req, res) => {
  const { q = '', role = '', page = '1', limit = '20' } = req.query
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))

  const filter = {}
  if (q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ]
  }
  if (role.trim()) {
    filter.roles = role.trim()
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    User.countDocuments(filter),
  ])
  return res.json({ users, total, page: pageNum, pages: Math.ceil(total / limitNum) })
})

/** List users pending land_owner or specialist approval */
router.get('/pending-approvals', async (_req, res) => {
  const users = await User.find({
    $or: [
      { landOwnerApproval: 'pending' },
      { specialistApproval: 'pending' },
    ],
  })
    .select('-passwordHash')
    .lean()
  return res.json({ users })
})

router.patch('/approvals', async (req, res) => {
  const parsed = approveSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const { userId, landOwner, specialist } = parsed.data
  const user = await User.findById(userId)
  if (!user) return sendError(res, 404, 'User not found')
  if (landOwner !== undefined) user.landOwnerApproval = landOwner
  if (specialist !== undefined) user.specialistApproval = specialist
  await user.save()
  const lean = user.toObject()
  delete lean.passwordHash
  return res.json({ user: lean })
})

const moderatePostSchema = z.object({
  hiddenByAdmin: z.boolean(),
  moderationNote: z.string().optional(),
})

router.patch('/posts/:postId', async (req, res) => {
  const parsed = moderatePostSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const post = await Post.findById(req.params.postId)
  if (!post) return sendError(res, 404, 'Post not found')
  post.hiddenByAdmin = parsed.data.hiddenByAdmin
  if (parsed.data.moderationNote !== undefined) {
    post.moderationNote = parsed.data.moderationNote
  }
  await post.save()
  return res.json({ post })
})

/* ─── Solution providers (Module 2 — admin CRUD for map locator) ─── */

const providerCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  website: z.string().optional().default(''),
  categories: z
    .array(z.string())
    .min(1)
    .refine((arr) => arr.every((c) => PROVIDER_CATEGORY_VALUES.includes(c)), {
      message: 'Invalid provider category',
    }),
  lng: z.number(),
  lat: z.number(),
  isActive: z.boolean().optional().default(true),
})

const providerUpdateSchema = providerCreateSchema.partial()

router.post('/providers', async (req, res) => {
  const parsed = providerCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const b = parsed.data
  const doc = await SolutionProvider.create({
    name: b.name.trim(),
    description: b.description?.trim() || '',
    phone: b.phone?.trim() || '',
    website: b.website?.trim() || '',
    categories: b.categories,
    location: { type: 'Point', coordinates: [b.lng, b.lat] },
    isActive: b.isActive,
  })
  return res.status(201).json({ provider: doc })
})

router.patch('/providers/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return sendError(res, 404, 'Provider not found')
  }
  const parsed = providerUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const doc = await SolutionProvider.findById(req.params.id)
  if (!doc) return sendError(res, 404, 'Provider not found')
  const b = parsed.data
  if (b.name !== undefined) doc.name = b.name.trim()
  if (b.description !== undefined) doc.description = b.description.trim()
  if (b.phone !== undefined) doc.phone = b.phone.trim()
  if (b.website !== undefined) doc.website = b.website.trim()
  if (b.categories !== undefined) doc.categories = b.categories
  if (b.lat !== undefined && b.lng !== undefined) {
    doc.location = { type: 'Point', coordinates: [b.lng, b.lat] }
  }
  if (b.isActive !== undefined) doc.isActive = b.isActive
  await doc.save()
  return res.json({ provider: doc })
})

router.delete('/providers/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return sendError(res, 404, 'Provider not found')
  }
  const doc = await SolutionProvider.findByIdAndDelete(req.params.id)
  if (!doc) return sendError(res, 404, 'Provider not found')
  return res.json({ ok: true })
})

router.get('/providers', async (_req, res) => {
  const providers = await SolutionProvider.find().sort({ createdAt: -1 }).lean()
  return res.json({ providers })
})

/* ─── Discovery articles (admin-authored science / policy feed) ─── */

const discoveryCreateSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  kind: z.enum(DISCOVERY_KIND_VALUES).optional().default('general'),
  tags: z.array(z.string()).optional().default([]),
  hiddenByAdmin: z.boolean().optional().default(false),
})

const discoveryUpdateSchema = discoveryCreateSchema.partial()

router.post('/discovery/articles', async (req, res) => {
  const parsed = discoveryCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const b = parsed.data
  const article = await DiscoveryArticle.create({
    authorId: req.user._id,
    title: b.title.trim(),
    body: b.body.trim(),
    kind: b.kind,
    tags: (b.tags || []).map((t) => t.trim()).filter(Boolean),
    hiddenByAdmin: b.hiddenByAdmin,
  })
  return res.status(201).json({ article })
})

router.get('/discovery/articles', async (_req, res) => {
  const articles = await DiscoveryArticle.find()
    .sort({ createdAt: -1 })
    .populate('authorId', 'name profilePhotoUrl')
    .lean()
  return res.json({ articles })
})

router.patch('/discovery/articles/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return sendError(res, 404, 'Article not found')
  }
  const parsed = discoveryUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const article = await DiscoveryArticle.findById(req.params.id)
  if (!article) return sendError(res, 404, 'Article not found')
  const b = parsed.data
  if (b.title !== undefined) article.title = b.title.trim()
  if (b.body !== undefined) article.body = b.body.trim()
  if (b.kind !== undefined) article.kind = b.kind
  if (b.tags !== undefined) {
    article.tags = b.tags.map((t) => t.trim()).filter(Boolean)
  }
  if (b.hiddenByAdmin !== undefined) article.hiddenByAdmin = b.hiddenByAdmin
  await article.save()
  return res.json({ article })
})

router.delete('/discovery/articles/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return sendError(res, 404, 'Article not found')
  }
  const article = await DiscoveryArticle.findByIdAndDelete(req.params.id)
  if (!article) return sendError(res, 404, 'Article not found')
  await DiscoveryReaction.deleteMany({ articleId: article._id })
  await DiscoveryComment.deleteMany({ articleId: article._id })
  return res.json({ ok: true })
})

export default router
