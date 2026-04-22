import { Router } from 'express'
import { z } from 'zod'
import { Community } from '../models/Community.js'
import { CommunityMember } from '../models/CommunityMember.js'
import { Post } from '../models/Post.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { requireRoles } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'

const router = Router()

const createCommunitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
})

router.get('/', optionalAuth, async (req, res) => {
  const list = await Community.find().sort({ createdAt: -1 }).lean()
  const communityIds = list.map((c) => c._id)

  // member counts
  const counts = await CommunityMember.aggregate([
    { $match: { communityId: { $in: communityIds } } },
    { $group: { _id: '$communityId', count: { $sum: 1 } } },
  ])
  const countMap = {}
  for (const row of counts) countMap[row._id.toString()] = row.count

  // current user memberships
  let memberSet = new Set()
  if (req.user) {
    const memberships = await CommunityMember.find({
      userId: req.user._id,
      communityId: { $in: communityIds },
    }).lean()
    memberSet = new Set(memberships.map((m) => m.communityId.toString()))
  }

  const communities = list.map((c) => ({
    ...c,
    memberCount: countMap[c._id.toString()] || 0,
    isMember: memberSet.has(c._id.toString()),
  }))
  return res.json({ communities })
})

router.post('/', requireAuth, requireRoles('farmer', 'specialist'), async (req, res) => {
  const parsed = createCommunitySchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const c = await Community.create({
    name: parsed.data.name,
    description: parsed.data.description,
    createdBy: req.user._id,
  })
  await CommunityMember.create({
    communityId: c._id,
    userId: req.user._id,
    memberRole: 'member',
  })
  return res.status(201).json({ community: c })
})

// Must be before /:communityId to avoid route conflict
router.get('/mine', requireAuth, async (req, res) => {
  const memberships = await CommunityMember.find({ userId: req.user._id }).lean()
  const communityIds = memberships.map((m) => m.communityId)
  const communities = await Community.find({ _id: { $in: communityIds } })
    .sort({ createdAt: -1 })
    .lean()
  return res.json({ communities })
})

router.get('/:communityId', optionalAuth, async (req, res) => {
  const c = await Community.findById(req.params.communityId).lean()
  if (!c) return sendError(res, 404, 'Community not found')
  const memberCount = await CommunityMember.countDocuments({ communityId: c._id })
  let isMember = false
  if (req.user) {
    isMember = !!(await CommunityMember.exists({ communityId: c._id, userId: req.user._id }))
  }
  return res.json({ community: { ...c, memberCount, isMember } })
})

router.post('/:communityId/join', requireAuth, requireRoles('farmer', 'specialist'), async (req, res) => {
  const communityId = req.params.communityId
  const c = await Community.findById(communityId)
  if (!c) return sendError(res, 404, 'Community not found')
  try {
    const m = await CommunityMember.create({
      communityId,
      userId: req.user._id,
    })
    return res.status(201).json({ member: m })
  } catch (e) {
    if (e.code === 11000) {
      return sendError(res, 409, 'Already a member')
    }
    throw e
  }
})

router.delete('/:communityId/leave', requireAuth, async (req, res) => {
  await CommunityMember.deleteOne({
    communityId: req.params.communityId,
    userId: req.user._id,
  })
  return res.json({ ok: true })
})

/**
 * Lists posts in a community; hides moderated posts unless viewer is admin.
 */
router.get('/:communityId/posts', optionalAuth, async (req, res) => {
  const communityId = req.params.communityId
  const c = await Community.findById(communityId)
  if (!c) return sendError(res, 404, 'Community not found')
  const isAdmin = req.user?.roles?.includes('admin')
  const filter = {
    communityId,
    deletedAt: null,
    ...(isAdmin ? {} : { hiddenByAdmin: false }),
  }
  const posts = await Post.find(filter)
    .sort({ createdAt: -1 })
    .populate('authorId', 'name profilePhotoUrl')
    .lean()
  return res.json({ posts })
})

const createPostSchema = z.object({
  body: z.string().min(1),
  mediaUrls: z.array(z.string()).optional().default([]),
})

router.post('/:communityId/posts', requireAuth, requireRoles('farmer', 'specialist'), async (req, res) => {
  const communityId = req.params.communityId
  const member = await CommunityMember.findOne({
    communityId,
    userId: req.user._id,
  })
  if (!member) {
    return sendError(res, 403, 'Join the community before posting')
  }
  const parsed = createPostSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const post = await Post.create({
    communityId,
    authorId: req.user._id,
    body: parsed.data.body,
    mediaUrls: parsed.data.mediaUrls,
  })
  return res.status(201).json({ post })
})

export default router
