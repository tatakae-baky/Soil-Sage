import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../../src/models/User.js'

/**
 * Seed a test user in the in-memory DB and return the Mongoose document.
 *
 * @param {string} role - 'farmer' | 'specialist' | 'land_owner' | 'admin'
 * @param {object} [overrides] - Fields to override on the user document
 */
export async function createUser(role = 'farmer', overrides = {}) {
  const passwordHash = await bcrypt.hash('Password123!', 10)
  const roles = [role]
  // land_owner always gets farmer role too (mirrors route logic)
  if (role === 'land_owner' && !roles.includes('farmer')) roles.push('farmer')

  const approvals = {
    landOwnerApproval:
      role === 'land_owner' ? 'approved' : 'not_applicable',
    specialistApproval:
      role === 'specialist' ? 'approved' : 'not_applicable',
  }

  const defaults = {
    name: `Test ${role}`,
    email: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
    passwordHash,
    roles,
    ...approvals,
  }

  return User.create({ ...defaults, ...overrides })
}

/**
 * Issue a JWT for a user document (or plain object with _id).
 */
export function getToken(user) {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret-for-unit-tests'
  return jwt.sign({ sub: user._id.toString() }, secret, { expiresIn: '1d' })
}

/**
 * Return the Authorization header value for a user.
 */
export function authHeader(user) {
  return `Bearer ${getToken(user)}`
}
