import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'

/**
 * Parses Bearer token and attaches req.user (lean document without password).
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const payload = jwt.verify(token, env.jwtSecret)
    const userId = payload.sub
    const user = await User.findById(userId).lean()
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/**
 * Optional auth: sets req.user if valid token present, else continues.
 */
export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return next()
    const payload = jwt.verify(token, env.jwtSecret)
    const user = await User.findById(payload.sub).lean()
    if (user) req.user = user
  } catch {
    /* ignore */
  }
  next()
}
