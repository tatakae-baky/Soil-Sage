import { Router } from 'express'
import { SolutionProvider, PROVIDER_CATEGORY_VALUES } from '../models/SolutionProvider.js'
import { sendError } from '../utils/errors.js'

const router = Router()

/**
 * Public nearby search — no auth so renters can open shared links.
 * Optional `categories` = comma-separated subset of PROVIDER_CATEGORY_VALUES (OR match: any listed tag).
 */
router.get('/nearby', async (req, res) => {
  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)
  const maxKm = Math.min(Number(req.query.maxKm) || 50, 200)
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return sendError(res, 400, 'lat and lng query params required')
  }
  const maxMeters = maxKm * 1000

  const rawCats = typeof req.query.categories === 'string' ? req.query.categories : ''
  const wanted = rawCats
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((c) => PROVIDER_CATEGORY_VALUES.includes(c))

  const geoFilter = {
    isActive: true,
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: maxMeters,
      },
    },
  }

  const filter =
    wanted.length > 0
      ? { ...geoFilter, categories: { $in: wanted } }
      : geoFilter

  const providers = await SolutionProvider.find(filter).sort({ name: 1 }).lean()

  /** Haversine distance in km for client display (Mongo `$near` order is not guaranteed for all versions). */
  function distKm(lon1, la1, lon2, la2) {
    const R = 6371
    const toRad = (d) => (d * Math.PI) / 180
    const dLa = toRad(la2 - la1)
    const dLo = toRad(lon2 - lon1)
    const a =
      Math.sin(dLa / 2) ** 2 +
      Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLo / 2) ** 2
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
  }

  const withDist = providers.map((p) => {
    const [plng, plat] = p.location?.coordinates || [lng, lat]
    return {
      ...p,
      distanceKm: Math.round(distKm(lng, lat, plng, plat) * 10) / 10,
    }
  })
  withDist.sort((a, b) => a.distanceKm - b.distanceKm)

  return res.json({ providers: withDist })
})

/**
 * Public list — returns all active providers, no coordinates required.
 */
router.get('/', async (_req, res) => {
  const providers = await SolutionProvider.find({ isActive: true })
    .sort({ name: 1 })
    .lean()
  return res.json({ providers })
})

export default router
