import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

const ACCESS_TTL = '7d'

/**
 * Issues a JWT for API access; sub is user id string.
 */
export function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: ACCESS_TTL })
}
