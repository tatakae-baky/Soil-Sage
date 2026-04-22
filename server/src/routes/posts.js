import { Router } from 'express'
import { z } from 'zod'
import { Post } from '../models/Post.js'
import { Comment } from '../models/Comment.js'
import { CommunityMember } from '../models/CommunityMember.js'
import { UserFollow } from '../models/UserFollow.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { requireRoles } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'
import { createNotification } from '../utils/notify.js'

const router = Router()

/**
 * Personalized feed: posts by users you follow **only** in communities you have joined
 * (avoids leaking posts from private communities the viewer cannot access).
 */
router.get('/following-feed', requireAuth, requireRoles('farmer'), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100)
  const skip = Math.max(Number(req.query.skip) || 0, 0)

  const followingRows = await UserFollow.find({ followerId: req.user._id })
    .select('followingId')
    .lean()
  const authorIds = followingRows.map((r) => r.followingId)
  if (authorIds.length === 0) {
    return res.json({ posts: [], total: 0, limit, skip })
  }

  const memberRows = await CommunityMember.find({ userId: req.user._id })
    .select('communityId')
    .lean()
  const communityIds = memberRows.map((m) => m.communityId)
  if (communityIds.length === 0) {
    return res.json({ posts: [], total: 0, limit, skip })
  }

  const filter = {
    communityId: { $in: communityIds },
    authorId: { $in: authorIds },
    deletedAt: null,
    hiddenByAdmin: false,
  }

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'name profilePhotoUrl')
      .populate('communityId', 'name')
      .lean(),
    Post.countDocuments(filter),
  ])

  return res.json({ posts, total, limit, skip })
})

router.get('/:postId', optionalAuth, async (req, res) => {
  const isAdmin = req.user?.roles?.includes('admin')
  const post = await Post.findById(req.params.postId)
    .populate('authorId', 'name profilePhotoUrl')
    .lean()
  if (!post || post.deletedAt) {
    return sendError(res, 404, 'Post not found')
  }
  if (post.hiddenByAdmin && !isAdmin) {
    return sendError(res, 404, 'Post not found')
  }
  return res.json({ post })
})

const updatePostSchema = z.object({
  body: z.string().min(1).optional(),
  mediaUrls: z.array(z.string()).optional(),
})

router.patch('/:postId', requireAuth, requireRoles('farmer', 'specialist'), async (req, res) => {
  const post = await Post.findById(req.params.postId)
  if (!post || post.deletedAt) {
    return sendError(res, 404, 'Post not found')
  }
  if (post.authorId.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not your post')
  }
  const parsed = updatePostSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  if (parsed.data.body !== undefined) post.body = parsed.data.body
  if (parsed.data.mediaUrls !== undefined) post.mediaUrls = parsed.data.mediaUrls
  post.editedAt = new Date()
  await post.save()
  return res.json({ post })
})

router.delete('/:postId', requireAuth, requireRoles('farmer', 'specialist'), async (req, res) => {
  const post = await Post.findById(req.params.postId)
  if (!post || post.deletedAt) {
    return sendError(res, 404, 'Post not found')
  }
  if (post.authorId.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not your post')
  }
  post.deletedAt = new Date()
  await post.save()
  return res.json({ ok: true })
})

/** Threaded comments: top-level where parentCommentId is null */
router.get('/:postId/comments', optionalAuth, async (req, res) => {
  const post = await Post.findById(req.params.postId)
  if (!post || post.deletedAt) {
    return sendError(res, 404, 'Post not found')
  }
  const isAdmin = req.user?.roles?.includes('admin')
  const filter = {
    postId: req.params.postId,
    deletedAt: null,
    ...(isAdmin ? {} : { hiddenByAdmin: false }),
  }
  const comments = await Comment.find(filter)
    .sort({ createdAt: 1 })
    .populate('authorId', 'name profilePhotoUrl')
    .lean()
  return res.json({ comments })
})

const createCommentSchema = z.object({
  body: z.string().min(1),
  parentCommentId: z.string().nullable().optional(),
})

router.post('/:postId/comments', requireAuth, requireRoles('farmer', 'specialist'), async (req, res) => {
  const post = await Post.findById(req.params.postId)
  if (!post || post.deletedAt || post.hiddenByAdmin) {
    return sendError(res, 404, 'Post not found')
  }
  const parsed = createCommentSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  let parentCommentId = null
  if (parsed.data.parentCommentId) {
    const parent = await Comment.findById(parsed.data.parentCommentId)
    if (!parent || parent.postId.toString() !== post._id.toString()) {
      return sendError(res, 400, 'Invalid parent comment')
    }
    parentCommentId = parent._id
  }
  const comment = await Comment.create({
    postId: post._id,
    parentCommentId,
    authorId: req.user._id,
    body: parsed.data.body,
  })
  post.commentCount = (post.commentCount || 0) + 1
  await post.save()
  if (post.authorId.toString() !== req.user._id.toString()) {
    await createNotification({
      userId: post.authorId,
      type: 'new_comment',
      title: 'New comment on your post',
      body: parsed.data.body.slice(0, 120),
      relatedId: post._id,
      relatedType: 'Post',
    })
  }
  return res.status(201).json({ comment })
})

export default router
