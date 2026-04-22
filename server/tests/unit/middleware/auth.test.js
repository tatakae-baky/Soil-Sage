import jwt from 'jsonwebtoken'
import { requireAuth, optionalAuth } from '../../../src/middleware/auth.js'
import { User } from '../../../src/models/User.js'
import { connect, disconnect, clearDatabase } from '../../setup/db.js'

const JWT_SECRET = 'test-jwt-secret-for-unit-tests'

function mockRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET
  await connect()
})
afterEach(() => clearDatabase())
afterAll(() => disconnect())

async function seedUser(overrides = {}) {
  return User.create({
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    passwordHash: 'fakehash',
    roles: ['farmer'],
    ...overrides,
  })
}

describe('requireAuth', () => {
  it('returns 401 when no Authorization header is present', async () => {
    const req = { headers: {} }
    const res = mockRes()
    const next = jest.fn()

    await requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is malformed / invalid', async () => {
    const req = { headers: { authorization: 'Bearer notavalidtoken' } }
    const res = mockRes()
    const next = jest.fn()

    await requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is expired', async () => {
    const token = jwt.sign({ sub: 'fake-id' }, JWT_SECRET, { expiresIn: -1 })
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = mockRes()
    const next = jest.fn()

    await requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 401 when user does not exist in DB', async () => {
    const fakeId = '507f1f77bcf86cd799439011'
    const token = jwt.sign({ sub: fakeId }, JWT_SECRET, { expiresIn: '1d' })
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = mockRes()
    const next = jest.fn()

    await requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('attaches req.user and calls next() for a valid token', async () => {
    const user = await seedUser()
    const token = jwt.sign({ sub: user._id.toString() }, JWT_SECRET, {
      expiresIn: '1d',
    })
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = mockRes()
    const next = jest.fn()

    await requireAuth(req, res, next)

    expect(next).toHaveBeenCalledWith()
    expect(req.user).toBeDefined()
    expect(req.user._id.toString()).toBe(user._id.toString())
    // passwordHash must not be exposed
    expect(req.user.passwordHash).toBeUndefined()
  })
})

describe('optionalAuth', () => {
  it('calls next() when no Authorization header is present', async () => {
    const req = { headers: {} }
    const next = jest.fn()

    await optionalAuth(req, {}, next)

    expect(next).toHaveBeenCalled()
    expect(req.user).toBeUndefined()
  })

  it('calls next() when token is invalid (does not throw)', async () => {
    const req = { headers: { authorization: 'Bearer bad-token' } }
    const next = jest.fn()

    await optionalAuth(req, {}, next)

    expect(next).toHaveBeenCalled()
  })

  it('attaches req.user when token is valid', async () => {
    const user = await seedUser()
    const token = jwt.sign({ sub: user._id.toString() }, JWT_SECRET, {
      expiresIn: '1d',
    })
    const req = { headers: { authorization: `Bearer ${token}` } }
    const next = jest.fn()

    await optionalAuth(req, {}, next)

    expect(next).toHaveBeenCalled()
    expect(req.user).toBeDefined()
    expect(req.user._id.toString()).toBe(user._id.toString())
  })
})
