import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import {
  DiscoveryArticle,
  DISCOVERY_KIND_VALUES,
} from '../models/DiscoveryArticle.js'
import { DiscoveryComment } from '../models/DiscoveryComment.js'
import { DiscoveryReaction } from '../models/DiscoveryReaction.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { requireRoles } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'

const router = Router()

router.get('/articles', optionalAuth, async (req, res) => {
  const isAdmin = req.user?.roles?.includes('admin')
  const kind =
    typeof req.query.kind === 'string' && DISCOVERY_KIND_VALUES.includes(req.query.kind)
      ? req.query.kind
      : undefined
  const filter = {
    ...(kind ? { kind } : {}),
    ...(isAdmin ? {} : { hiddenByAdmin: false }),
  }
  const limit = Math.min(Number(req.query.limit) || 40, 100)
  const skip = Math.max(Number(req.query.skip) || 0, 0)
  const [articles, total] = await Promise.all([
    DiscoveryArticle.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'name profilePhotoUrl')
      .lean(),
    DiscoveryArticle.countDocuments(filter),
  ])
  return res.json({ articles, total, limit, skip })
})

router.get('/articles/:id', optionalAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return sendError(res, 404, 'Article not found')
  }
  const isAdmin = req.user?.roles?.includes('admin')
  const article = await DiscoveryArticle.findById(req.params.id)
    .populate('authorId', 'name profilePhotoUrl')
    .lean()
  if (!article) return sendError(res, 404, 'Article not found')
  if (article.hiddenByAdmin && !isAdmin) {
    return sendError(res, 404, 'Article not found')
  }

  let myReaction = null
  if (req.user) {
    const r = await DiscoveryReaction.findOne({
      userId: req.user._id,
      articleId: article._id,
    }).lean()
    myReaction = r?.kind || null
  }

  return res.json({ article, myReaction })
})

router.get('/articles/:id/comments', optionalAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return sendError(res, 404, 'Article not found')
  }
  const article = await DiscoveryArticle.findById(req.params.id).lean()
  if (!article) return sendError(res, 404, 'Article not found')
  const isAdmin = req.user?.roles?.includes('admin')
  if (article.hiddenByAdmin && !isAdmin) {
    return sendError(res, 404, 'Article not found')
  }
  const filter = {
    articleId: req.params.id,
    deletedAt: null,
    ...(isAdmin ? {} : { hiddenByAdmin: false }),
  }
  const comments = await DiscoveryComment.find(filter)
    .sort({ createdAt: 1 })
    .populate('authorId', 'name profilePhotoUrl')
    .lean()
  return res.json({ comments })
})

const createCommentSchema = z.object({
  body: z.string().min(1),
  parentCommentId: z.string().nullable().optional(),
})

router.post(
  '/articles/:id/comments',
  requireAuth,
  requireRoles('farmer'),
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 404, 'Article not found')
    }
    const article = await DiscoveryArticle.findById(req.params.id)
    if (!article || article.hiddenByAdmin) {
      return sendError(res, 404, 'Article not found')
    }
    const parsed = createCommentSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendError(res, 400, 'Validation failed', parsed.error.flatten())
    }
    let parentCommentId = null
    if (parsed.data.parentCommentId) {
      const parent = await DiscoveryComment.findById(parsed.data.parentCommentId)
      if (!parent || parent.articleId.toString() !== article._id.toString()) {
        return sendError(res, 400, 'Invalid parent comment')
      }
      parentCommentId = parent._id
    }
    const comment = await DiscoveryComment.create({
      articleId: article._id,
      parentCommentId,
      authorId: req.user._id,
      body: parsed.data.body,
    })
    article.commentCount = (article.commentCount || 0) + 1
    await article.save()
    return res.status(201).json({ comment })
  }
)

const reactSchema = z.object({
  kind: z.enum(['like', 'dislike']),
})

/**
 * Toggle / flip reaction: same kind again removes vote; different kind switches vote.
 */
router.post(
  '/articles/:id/react',
  requireAuth,
  requireRoles('farmer'),
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 404, 'Article not found')
    }
    const parsed = reactSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendError(res, 400, 'Validation failed', parsed.error.flatten())
    }
    const kind = parsed.data.kind
    const article = await DiscoveryArticle.findById(req.params.id)
    if (!article || article.hiddenByAdmin) {
      return sendError(res, 404, 'Article not found')
    }

    const existing = await DiscoveryReaction.findOne({
      userId: req.user._id,
      articleId: article._id,
    })

    if (!existing) {
      await DiscoveryReaction.create({
        userId: req.user._id,
        articleId: article._id,
        kind,
      })
      if (kind === 'like') article.likeCount = (article.likeCount || 0) + 1
      else article.dislikeCount = (article.dislikeCount || 0) + 1
      await article.save()
      return res.json({ myReaction: kind, likeCount: article.likeCount, dislikeCount: article.dislikeCount })
    }

    if (existing.kind === kind) {
      await DiscoveryReaction.deleteOne({ _id: existing._id })
      if (kind === 'like') article.likeCount = Math.max(0, (article.likeCount || 0) - 1)
      else article.dislikeCount = Math.max(0, (article.dislikeCount || 0) - 1)
      await article.save()
      return res.json({
        myReaction: null,
        likeCount: article.likeCount,
        dislikeCount: article.dislikeCount,
      })
    }

    const prevKind = existing.kind
    existing.kind = kind
    await existing.save()
    if (prevKind === 'like' && kind === 'dislike') {
      article.likeCount = Math.max(0, (article.likeCount || 0) - 1)
      article.dislikeCount = (article.dislikeCount || 0) + 1
    } else {
      article.dislikeCount = Math.max(0, (article.dislikeCount || 0) - 1)
      article.likeCount = (article.likeCount || 0) + 1
    }
    await article.save()
    return res.json({
      myReaction: kind,
      likeCount: article.likeCount,
      dislikeCount: article.dislikeCount,
    })
  }
)

export default router
