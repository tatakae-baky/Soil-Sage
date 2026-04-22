import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'
import { Land } from '../../src/models/Land.js'

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/lands'

const sampleCoords = [90.4125, 23.8103] // Dhaka area [lng, lat]

async function createLand(user, overrides = {}) {
  return Land.create({
    ownerId: user._id,
    title: 'Test Farm',
    size: '2 acres',
    location: { type: 'Point', coordinates: sampleCoords },
    ...overrides,
  })
}

describe('POST /lands', () => {
  it('farmer creates a land parcel', async () => {
    const farmer = await createUser('farmer')
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ title: 'My Farm', size: '1 acre', coordinates: sampleCoords })
    expect(res.status).toBe(201)
    expect(res.body.land.ownerId.toString()).toBe(farmer._id.toString())
  })

  it('returns 400 when coordinates are missing', async () => {
    const farmer = await createUser('farmer')
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ title: 'No Coords' })
    expect(res.status).toBe(400)
  })

  it('returns 403 when marking availableForRent without approved land_owner role', async () => {
    const farmer = await createUser('farmer')
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ coordinates: sampleCoords, availableForRent: true })
    expect(res.status).toBe(403)
  })

  it('returns 401 without token', async () => {
    const res = await request(app).post(BASE).send({ coordinates: sampleCoords })
    expect(res.status).toBe(401)
  })
})

describe('GET /lands/mine', () => {
  it('returns lands owned by the authenticated farmer', async () => {
    const farmer = await createUser('farmer')
    await createLand(farmer)
    const res = await request(app)
      .get(`${BASE}/mine`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    expect(res.body.lands).toHaveLength(1)
  })

  it('does not return other users\' lands', async () => {
    const a = await createUser('farmer')
    const b = await createUser('farmer')
    await createLand(a)
    const res = await request(app)
      .get(`${BASE}/mine`)
      .set('Authorization', authHeader(b))
    expect(res.body.lands).toHaveLength(0)
  })
})

describe('GET /lands/for-rent', () => {
  it('returns lands that are available for rent and active', async () => {
    const owner = await createUser('land_owner', {
      roles: ['farmer', 'land_owner'],
      landOwnerApproval: 'approved',
    })
    await createLand(owner, { availableForRent: true })
    await createLand(owner, { availableForRent: false })
    const res = await request(app).get(`${BASE}/for-rent`)
    expect(res.status).toBe(200)
    expect(res.body.lands).toHaveLength(1)
    expect(res.body.lands[0].availableForRent).toBe(true)
  })
})

describe('GET /lands/:id', () => {
  it('returns a land by id (public)', async () => {
    const farmer = await createUser('farmer')
    const land = await createLand(farmer)
    const res = await request(app).get(`${BASE}/${land._id}`)
    expect(res.status).toBe(200)
    expect(res.body.land._id.toString()).toBe(land._id.toString())
  })

  it('returns 404 for non-existent land', async () => {
    const res = await request(app).get(`${BASE}/507f1f77bcf86cd799439011`)
    expect(res.status).toBe(404)
  })
})

describe('PATCH /lands/:id', () => {
  it('farmer updates own land', async () => {
    const farmer = await createUser('farmer')
    const land = await createLand(farmer)
    const res = await request(app)
      .patch(`${BASE}/${land._id}`)
      .set('Authorization', authHeader(farmer))
      .send({ title: 'Updated Farm Name' })
    expect(res.status).toBe(200)
    expect(res.body.land.title).toBe('Updated Farm Name')
  })

  it('returns 403 when updating another user\'s land', async () => {
    const owner = await createUser('farmer')
    const other = await createUser('farmer')
    const land = await createLand(owner)
    const res = await request(app)
      .patch(`${BASE}/${land._id}`)
      .set('Authorization', authHeader(other))
      .send({ title: 'Hijack' })
    expect(res.status).toBe(403)
  })
})

describe('DELETE /lands/:id', () => {
  it('soft-deletes land by setting isActive to false', async () => {
    const farmer = await createUser('farmer')
    const land = await createLand(farmer)
    const res = await request(app)
      .delete(`${BASE}/${land._id}`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    const updated = await Land.findById(land._id)
    expect(updated.isActive).toBe(false)
  })

  it('returns 403 when deleting another user\'s land', async () => {
    const owner = await createUser('farmer')
    const other = await createUser('farmer')
    const land = await createLand(owner)
    const res = await request(app)
      .delete(`${BASE}/${land._id}`)
      .set('Authorization', authHeader(other))
    expect(res.status).toBe(403)
  })
})
