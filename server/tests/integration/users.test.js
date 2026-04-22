import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/users'

describe('GET /users/specialists', () => {
  it('returns only approved specialists', async () => {
    await createUser('specialist', { specialistApproval: 'approved' })
    await createUser('specialist', { specialistApproval: 'pending' })
    await createUser('farmer')

    const res = await request(app).get(`${BASE}/specialists`)
    expect(res.status).toBe(200)
    expect(res.body.specialists).toHaveLength(1)
    expect(res.body.specialists[0].specialistApproval).toBe('approved')
  })

  it('returns empty list when no specialists exist', async () => {
    const res = await request(app).get(`${BASE}/specialists`)
    expect(res.status).toBe(200)
    expect(res.body.specialists).toHaveLength(0)
    expect(res.body.total).toBe(0)
  })

  it('supports pagination', async () => {
    for (let i = 0; i < 3; i++) {
      await createUser('specialist', {
        specialistApproval: 'approved',
        email: `spec${i}@test.com`,
      })
    }
    const res = await request(app).get(`${BASE}/specialists?limit=2&page=1`)
    expect(res.status).toBe(200)
    expect(res.body.specialists).toHaveLength(2)
    expect(res.body.total).toBe(3)
  })
})

describe('GET /users/public/:userId', () => {
  it('returns public profile with follow counts', async () => {
    const user = await createUser('farmer')
    const res = await request(app).get(`${BASE}/public/${user._id}`)
    expect(res.status).toBe(200)
    expect(res.body.user.name).toBe(user.name)
    expect(res.body.user.email).toBeUndefined()
    expect(res.body.user.followerCount).toBe(0)
    expect(res.body.lands).toBeInstanceOf(Array)
  })

  it('returns 404 for non-existent user id', async () => {
    const res = await request(app).get(
      `${BASE}/public/507f1f77bcf86cd799439011`
    )
    expect(res.status).toBe(404)
  })

  it('returns 404 for invalid object id', async () => {
    const res = await request(app).get(`${BASE}/public/not-an-id`)
    expect(res.status).toBe(404)
  })
})

describe('PATCH /users/me', () => {
  it('updates name and phone', async () => {
    const user = await createUser('farmer')
    const res = await request(app)
      .patch(`${BASE}/me`)
      .set('Authorization', authHeader(user))
      .send({ name: 'Updated Name', phone: '01700000000' })
    expect(res.status).toBe(200)
    expect(res.body.user.name).toBe('Updated Name')
    expect(res.body.user.phone).toBe('01700000000')
  })

  it('changes password when currentPassword is correct', async () => {
    // Register via auth endpoint so we have a real password hash
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Change PW',
      email: 'changepw@test.com',
      password: 'OldPass123!',
      roles: ['farmer'],
    })
    const token = regRes.body.token

    const res = await request(app)
      .patch(`${BASE}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'OldPass123!', newPassword: 'NewPass456!' })
    expect(res.status).toBe(200)
  })

  it('returns 400 when currentPassword is wrong during change', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Wrong PW',
      email: 'wrongpw@test.com',
      password: 'OldPass123!',
      roles: ['farmer'],
    })
    const token = regRes.body.token

    const res = await request(app)
      .patch(`${BASE}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrongpassword', newPassword: 'NewPass456!' })
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).patch(`${BASE}/me`).send({ name: 'X' })
    expect(res.status).toBe(401)
  })
})
