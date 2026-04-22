import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'
import { User } from '../../src/models/User.js'

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/admin'

describe('Admin RBAC gate', () => {
  it('returns 403 for non-admin user', async () => {
    const farmer = await createUser('farmer')
    const res = await request(app)
      .get(`${BASE}/stats`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(403)
  })

  it('returns 401 without token', async () => {
    const res = await request(app).get(`${BASE}/stats`)
    expect(res.status).toBe(401)
  })
})

describe('GET /admin/stats', () => {
  it('returns platform-wide stats for admin', async () => {
    const admin = await createUser('admin')
    const res = await request(app)
      .get(`${BASE}/stats`)
      .set('Authorization', authHeader(admin))
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('totalUsers')
    expect(res.body).toHaveProperty('totalDiagnoses')
    expect(res.body).toHaveProperty('totalLands')
    expect(res.body).toHaveProperty('totalPosts')
    expect(res.body).toHaveProperty('totalSpecialists')
  })
})

describe('GET /admin/users', () => {
  it('lists all users with search', async () => {
    const admin = await createUser('admin')
    await createUser('farmer', { email: 'searchme@test.com', name: 'Search Target' })
    const res = await request(app)
      .get(`${BASE}/users?q=searchme`)
      .set('Authorization', authHeader(admin))
    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(1)
    expect(res.body.users[0].email).toBe('searchme@test.com')
  })

  it('filters users by role', async () => {
    const admin = await createUser('admin')
    await createUser('farmer')
    await createUser('specialist')
    const res = await request(app)
      .get(`${BASE}/users?role=specialist`)
      .set('Authorization', authHeader(admin))
    expect(res.status).toBe(200)
    // All results have specialist role
    res.body.users.forEach((u) => expect(u.roles).toContain('specialist'))
  })

  it('never returns passwordHash', async () => {
    const admin = await createUser('admin')
    await createUser('farmer')
    const res = await request(app)
      .get(`${BASE}/users`)
      .set('Authorization', authHeader(admin))
    res.body.users.forEach((u) => expect(u.passwordHash).toBeUndefined())
  })
})

describe('GET /admin/pending-approvals', () => {
  it('returns users with pending approvals', async () => {
    const admin = await createUser('admin')
    await createUser('specialist', { specialistApproval: 'pending' })
    await createUser('farmer')
    const res = await request(app)
      .get(`${BASE}/pending-approvals`)
      .set('Authorization', authHeader(admin))
    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(1)
  })
})

describe('PATCH /admin/approvals', () => {
  it('approves a specialist', async () => {
    const admin = await createUser('admin')
    const spec = await createUser('specialist', { specialistApproval: 'pending' })
    const res = await request(app)
      .patch(`${BASE}/approvals`)
      .set('Authorization', authHeader(admin))
      .send({ userId: spec._id.toString(), specialist: 'approved' })
    expect(res.status).toBe(200)
    expect(res.body.user.specialistApproval).toBe('approved')

    const updated = await User.findById(spec._id)
    expect(updated.specialistApproval).toBe('approved')
  })

  it('rejects a land owner', async () => {
    const admin = await createUser('admin')
    const owner = await createUser('land_owner', { landOwnerApproval: 'pending' })
    const res = await request(app)
      .patch(`${BASE}/approvals`)
      .set('Authorization', authHeader(admin))
      .send({ userId: owner._id.toString(), landOwner: 'rejected' })
    expect(res.status).toBe(200)
    expect(res.body.user.landOwnerApproval).toBe('rejected')
  })

  it('returns 404 for non-existent user', async () => {
    const admin = await createUser('admin')
    const res = await request(app)
      .patch(`${BASE}/approvals`)
      .set('Authorization', authHeader(admin))
      .send({ userId: '507f1f77bcf86cd799439011', specialist: 'approved' })
    expect(res.status).toBe(404)
  })
})

describe('Admin provider management', () => {
  it('creates a provider', async () => {
    const admin = await createUser('admin')
    const res = await request(app)
      .post(`${BASE}/providers`)
      .set('Authorization', authHeader(admin))
      .send({
        name: 'AgroShop Dhaka',
        categories: ['seeds', 'fertilizer'],
        lng: 90.4125,
        lat: 23.8103,
      })
    expect(res.status).toBe(201)
    expect(res.body.provider.name).toBe('AgroShop Dhaka')
  })

  it('updates a provider', async () => {
    const admin = await createUser('admin')
    const createRes = await request(app)
      .post(`${BASE}/providers`)
      .set('Authorization', authHeader(admin))
      .send({ name: 'Old Name', categories: ['tools'], lng: 90.4, lat: 23.8 })
    const id = createRes.body.provider._id
    const res = await request(app)
      .patch(`${BASE}/providers/${id}`)
      .set('Authorization', authHeader(admin))
      .send({ name: 'New Name' })
    expect(res.status).toBe(200)
    expect(res.body.provider.name).toBe('New Name')
  })

  it('deletes a provider', async () => {
    const admin = await createUser('admin')
    const createRes = await request(app)
      .post(`${BASE}/providers`)
      .set('Authorization', authHeader(admin))
      .send({ name: 'To Delete', categories: ['tools'], lng: 90.4, lat: 23.8 })
    const id = createRes.body.provider._id
    const res = await request(app)
      .delete(`${BASE}/providers/${id}`)
      .set('Authorization', authHeader(admin))
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

describe('Admin discovery article management', () => {
  it('creates an article', async () => {
    const admin = await createUser('admin')
    const res = await request(app)
      .post(`${BASE}/discovery/articles`)
      .set('Authorization', authHeader(admin))
      .send({ title: 'Irrigation Tips', body: 'Drip irrigation saves water.' })
    expect(res.status).toBe(201)
    expect(res.body.article.title).toBe('Irrigation Tips')
  })

  it('updates an article', async () => {
    const admin = await createUser('admin')
    const createRes = await request(app)
      .post(`${BASE}/discovery/articles`)
      .set('Authorization', authHeader(admin))
      .send({ title: 'Old Title', body: 'Some body.' })
    const id = createRes.body.article._id
    const res = await request(app)
      .patch(`${BASE}/discovery/articles/${id}`)
      .set('Authorization', authHeader(admin))
      .send({ title: 'Updated Title' })
    expect(res.status).toBe(200)
    expect(res.body.article.title).toBe('Updated Title')
  })

  it('deletes an article', async () => {
    const admin = await createUser('admin')
    const createRes = await request(app)
      .post(`${BASE}/discovery/articles`)
      .set('Authorization', authHeader(admin))
      .send({ title: 'Delete Me', body: 'Body.' })
    const id = createRes.body.article._id
    const res = await request(app)
      .delete(`${BASE}/discovery/articles/${id}`)
      .set('Authorization', authHeader(admin))
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
