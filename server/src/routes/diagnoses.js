import { Router } from 'express'
import mongoose from 'mongoose'
import multer from 'multer'
import { Diagnosis } from '../models/Diagnosis.js'
import { Land } from '../models/Land.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRoles } from '../middleware/rbac.js'
import { sendError } from '../utils/errors.js'
import { createNotification } from '../utils/notify.js'
import { runDiagnosis } from '../services/geminiDiagnosis.js'

const router = Router()

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 3, fileSize: 6 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) cb(null, true)
    else cb(new Error('Only JPEG, PNG, or WebP images are allowed'))
  },
})

/**
 * Multipart: fields `notes`, optional `landId`; files field `images` (1–3).
 */
router.post(
  '/',
  requireAuth,
  requireRoles('farmer'),
  (req, res, next) => {
    upload.array('images', 3)(req, res, (err) => {
      if (!err) return next()
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Each image must be 6 MB or smaller' })
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'At most 3 images per diagnosis' })
        }
        return res.status(400).json({ error: err.message })
      }
      return res.status(400).json({ error: err.message || 'Upload failed' })
    })
  },
  async (req, res) => {
    const files = req.files
    if (!files?.length) {
      return res.status(400).json({ error: 'At least one image is required' })
    }

    const notes = typeof req.body?.notes === 'string' ? req.body.notes : ''
    const landIdRaw = req.body?.landId
    const landId =
      typeof landIdRaw === 'string' && landIdRaw.trim() ? landIdRaw.trim() : null

    let landContext = ''
    if (landId) {
      const land = await Land.findOne({
        _id: landId,
        ownerId: req.user._id,
        isActive: true,
      }).lean()
      if (!land) {
        return sendError(res, 400, 'Invalid landId or land does not belong to you')
      }
      landContext = [
        land.title && `Land title: ${land.title}`,
        land.cropType && `Recorded crop: ${land.cropType}`,
        land.soilCondition && `Recorded soil note: ${land.soilCondition}`,
        land.size && `Size: ${land.size}`,
      ]
        .filter(Boolean)
        .join('\n')
    }

    try {
      const { result, disclaimer, model } = await runDiagnosis({
        images: files.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype })),
        notes,
        landContext,
      })

      const doc = await Diagnosis.create({
        farmerId: req.user._id,
        landId: landId || null,
        notes: notes.slice(0, 4000),
        result,
        model,
        disclaimer,
      })

      await createNotification({
        userId: req.user._id,
        type: 'diagnosis_ready',
        title: 'Soil / crop diagnosis ready',
        body: result.summary?.slice(0, 200) || 'Open your diagnosis for full details.',
        relatedId: doc._id,
        relatedType: 'Diagnosis',
      })

      return res.status(201).json({ diagnosis: doc })
    } catch (e) {
      const code = e.statusCode || 500
      const hint = /** @type {any} */ (e).hint
      const providerCode = /** @type {any} */ (e).providerCode

      if (code === 503) {
        return res.status(503).json({
          error: e.message || 'Diagnosis service unavailable',
          code: 'gemini_not_configured',
          detail: hint || 'Set GEMINI_API_KEY in server/.env (see README).',
        })
      }
      if (code === 429) {
        return res.status(429).json({
          error: e.message || 'Gemini quota or rate limit',
          code: 'gemini_quota_or_rate',
          providerCode: providerCode || null,
          detail: hint || null,
        })
      }
      if (code === 502) {
        return res.status(502).json({
          error: e.message || 'Upstream AI error',
          providerCode: providerCode || null,
          detail: hint || null,
        })
      }
      console.error(e)
      return res.status(500).json({ error: 'Diagnosis failed' })
    }
  }
)

/** List current farmer's diagnoses (newest first) */
router.get('/mine', requireAuth, requireRoles('farmer'), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100)
  const skip = Math.max(Number(req.query.skip) || 0, 0)
  const [diagnoses, total] = await Promise.all([
    Diagnosis.find({ farmerId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('landId', 'title cropType soilCondition size')
      .lean(),
    Diagnosis.countDocuments({ farmerId: req.user._id }),
  ])
  return res.json({ diagnoses, total, limit, skip })
})

router.get('/:id', requireAuth, requireRoles('farmer'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return sendError(res, 404, 'Diagnosis not found')
  }
  const doc = await Diagnosis.findById(req.params.id)
    .populate('landId', 'title cropType soilCondition size location')
    .lean()
  if (!doc) return sendError(res, 404, 'Diagnosis not found')
  if (doc.farmerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Not your diagnosis' })
  }
  return res.json({ diagnosis: doc })
})

export default router
