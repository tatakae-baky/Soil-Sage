import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { requireRoles } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'
import { InventoryItem } from '../models/InventoryItem.js'
import { InventoryUsage } from '../models/InventoryUsage.js'
import {
  runFarmChat,
  runFarmChatStream,
  normalizeGeminiChatError,
} from '../services/geminiChat.js'

const router = Router()

const messageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string().min(1).max(12000),
})

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
})

/** Simple per-user sliding window (dev-friendly; replace with Redis in production). */
const rateBuckets = new Map()
const CHAT_PER_MINUTE = 20

function allowChat(userId) {
  const now = Date.now()
  const key = userId.toString()
  let b = rateBuckets.get(key)
  if (!b || now - b.windowStart > 60000) {
    b = { count: 0, windowStart: now }
  }
  if (b.count >= CHAT_PER_MINUTE) return false
  b.count += 1
  rateBuckets.set(key, b)
  return true
}

/**
 * Inventory-aware chat with SSE body: `data: {"delta":"..."}\n\n` chunks, then `data: [DONE]\n\n`.
 * On stream failure after headers are sent, emits `data: {"error":"..."}\n\n` then ends.
 */
router.post('/messages/stream', requireAuth, requireRoles('farmer'), async (req, res) => {
  if (!allowChat(req.user._id)) {
    return res.status(429).json({ error: 'Too many chat requests — try again in a minute.' })
  }

  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const msgs = parsed.data.messages
  if (msgs[msgs.length - 1].role !== 'user') {
    return sendError(res, 400, 'Last message must have role "user"')
  }

  const [items, recentUsage] = await Promise.all([
    InventoryItem.find({ farmerId: req.user._id }).lean(),
    InventoryUsage.find({ farmerId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('itemId', 'name category unit')
      .lean(),
  ])

  const inventorySnapshot = {
    generatedAt: new Date().toISOString(),
    items,
    recentUsage,
  }

  /** @param {import('express').Response} r */
  function sendJsonError(r, status, payload) {
    if (r.headersSent) return
    return r.status(status).json(payload)
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    if (typeof res.flushHeaders === 'function') res.flushHeaders()

    let total = ''
    for await (const delta of runFarmChatStream({
      messages: msgs,
      inventorySnapshot,
    })) {
      total += delta
      res.write(`data: ${JSON.stringify({ delta })}\n\n`)
    }

    if (!total.trim()) {
      res.write(`data: ${JSON.stringify({ error: 'Empty model response' })}\n\n`)
    }
    res.write('data: [DONE]\n\n')
    return res.end()
  } catch (e) {
    const code = /** @type {any} */ (e).statusCode || 500
    const hint = /** @type {any} */ (e).hint
    if (!res.headersSent) {
      if (code === 503) {
        return sendJsonError(res, 503, {
          error: e.message || 'Chat unavailable',
          code: 'gemini_not_configured',
          detail: hint || 'Set GEMINI_API_KEY in server/.env.',
        })
      }
      if (code === 429) {
        return sendJsonError(res, 429, { error: e.message || 'Upstream rate limit' })
      }
      if (code === 400) {
        return sendError(res, 400, e.message)
      }
      console.error(e)
      const norm = /** @type {any} */ (normalizeGeminiChatError(e))
      return sendJsonError(res, norm.statusCode || 502, {
        error: norm.message,
        detail: norm.hint || null,
      })
    }
    res.write(`data: ${JSON.stringify({ error: e.message || 'Stream failed' })}\n\n`)
    res.write('data: [DONE]\n\n')
    return res.end()
  }
})

router.post('/messages', requireAuth, requireRoles('farmer'), async (req, res) => {
  if (!allowChat(req.user._id)) {
    return res.status(429).json({ error: 'Too many chat requests — try again in a minute.' })
  }

  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const msgs = parsed.data.messages
  if (msgs[msgs.length - 1].role !== 'user') {
    return sendError(res, 400, 'Last message must have role "user"')
  }

  const [items, recentUsage] = await Promise.all([
    InventoryItem.find({ farmerId: req.user._id }).lean(),
    InventoryUsage.find({ farmerId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('itemId', 'name category unit')
      .lean(),
  ])

  const inventorySnapshot = {
    generatedAt: new Date().toISOString(),
    items,
    recentUsage,
  }

  try {
    const { text, model } = await runFarmChat({
      messages: msgs,
      inventorySnapshot,
    })
    return res.json({
      message: { role: 'model', content: text },
      model,
    })
  } catch (e) {
    const code = /** @type {any} */ (e).statusCode || 500
    const hint = /** @type {any} */ (e).hint
    if (code === 503) {
      return res.status(503).json({
        error: e.message || 'Chat unavailable',
        code: 'gemini_not_configured',
        detail: hint || 'Set GEMINI_API_KEY in server/.env.',
      })
    }
    if (code === 429) {
      return res.status(429).json({ error: e.message || 'Upstream rate limit' })
    }
    if (code === 400) {
      return sendError(res, 400, e.message)
    }
    console.error(e)
    const norm = /** @type {any} */ (normalizeGeminiChatError(e))
    return res.status(norm.statusCode || 502).json({
      error: norm.message,
      detail: norm.hint || null,
    })
  }
})

export default router
