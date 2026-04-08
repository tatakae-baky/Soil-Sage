import { Router } from 'express'
import { z } from 'zod'
import { InventoryItem, INVENTORY_CATEGORY } from '../models/InventoryItem.js'
import { InventoryUsage } from '../models/InventoryUsage.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRoles } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'

const router = Router()

const itemSchema = z.object({
  category: z.enum(INVENTORY_CATEGORY),
  name: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

const usageSchema = z.object({
  delta: z.number(),
  reason: z.string().optional().default(''),
})

router.post('/items', requireAuth, requireRoles('farmer'), async (req, res) => {
  const parsed = itemSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const item = await InventoryItem.create({
    farmerId: req.user._id,
    ...parsed.data,
  })
  await InventoryUsage.create({
    itemId: item._id,
    farmerId: req.user._id,
    delta: parsed.data.quantity,
    reason: 'initial_stock',
    quantityAfter: parsed.data.quantity,
  })
  return res.status(201).json({ item })
})

router.get('/items', requireAuth, requireRoles('farmer'), async (req, res) => {
  const items = await InventoryItem.find({ farmerId: req.user._id })
    .sort({ updatedAt: -1 })
    .lean()
  return res.json({ items })
})

router.patch('/items/:id', requireAuth, requireRoles('farmer'), async (req, res) => {
  const item = await InventoryItem.findById(req.params.id)
  if (!item) return sendError(res, 404, 'Item not found')
  if (item.farmerId.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not your inventory item')
  }
  const parsed = itemSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const prevQty = item.quantity
  Object.assign(item, parsed.data)
  await item.save()
  const delta = item.quantity - prevQty
  if (delta !== 0) {
    await InventoryUsage.create({
      itemId: item._id,
      farmerId: req.user._id,
      delta,
      reason: 'adjustment',
      quantityAfter: item.quantity,
    })
  }
  return res.json({ item })
})

router.delete('/items/:id', requireAuth, requireRoles('farmer'), async (req, res) => {
  const item = await InventoryItem.findById(req.params.id)
  if (!item) return sendError(res, 404, 'Item not found')
  if (item.farmerId.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not your inventory item')
  }
  await InventoryUsage.deleteMany({ itemId: item._id })
  await item.deleteOne()
  return res.json({ ok: true })
})

/** Record usage (consumption negative delta) or restock (positive) */
router.post('/items/:id/usage', requireAuth, requireRoles('farmer'), async (req, res) => {
  const item = await InventoryItem.findById(req.params.id)
  if (!item) return sendError(res, 404, 'Item not found')
  if (item.farmerId.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not your inventory item')
  }
  const parsed = usageSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'Validation failed', parsed.error.flatten())
  }
  const nextQty = item.quantity + parsed.data.delta
  if (nextQty < 0) {
    return sendError(res, 400, 'Quantity cannot go negative')
  }
  item.quantity = nextQty
  await item.save()
  const log = await InventoryUsage.create({
    itemId: item._id,
    farmerId: req.user._id,
    delta: parsed.data.delta,
    reason: parsed.data.reason || 'usage',
    quantityAfter: nextQty,
  })
  return res.status(201).json({ item, usage: log })
})

router.get('/items/:id/usage', requireAuth, requireRoles('farmer'), async (req, res) => {
  const item = await InventoryItem.findById(req.params.id)
  if (!item) return sendError(res, 404, 'Item not found')
  if (item.farmerId.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not your inventory item')
  }
  const history = await InventoryUsage.find({ itemId: item._id })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean()
  return res.json({ history })
})

/**
 * Aggregated snapshot for AI chat / diagnosis context (read-only structured export).
 */
router.get('/summary/for-ai', requireAuth, requireRoles('farmer'), async (req, res) => {
  const items = await InventoryItem.find({ farmerId: req.user._id }).lean()
  const recentUsage = await InventoryUsage.find({ farmerId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('itemId', 'name category unit')
    .lean()
  return res.json({
    generatedAt: new Date().toISOString(),
    items,
    recentUsage,
  })
})

export default router
