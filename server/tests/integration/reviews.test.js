import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'
import { SpecialistReview } from '../../src/models/SpecialistReview.js'

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/reviews/specialists'

async function makeApprovedSpecialist() {
  return createUser('specialist', { specialistApproval: 'approved' })
}

describe('GET /reviews/specialists/:userId', () => {
  it('returns reviews and average rating (public)', async () => {
    const specialist = await makeApprovedSpecialist()
    const farmer = await createUser('farmer')
    await SpecialistReview.create({
      specialistId: specialist._id,
      reviewerId: farmer._id,
      rating: 4,
      body: 'Very helpful',
    })
    const res = await request(app).get(`${BASE}/${specialist._id}`)
    expect(res.status).toBe(200)
    expect(res.body.reviews).toHaveLength(1)
    expect(res.body.averageRating).toBeCloseTo(4)
  })

  it('returns empty reviews for specialist with no reviews', async () => {
    const specialist = await makeApprovedSpecialist()
    const res = await request(app).get(`${BASE}/${specialist._id}`)
    expect(res.status).toBe(200)
    expect(res.body.reviews).toHaveLength(0)
    expect(res.body.averageRating).toBeNull()
  })
})

describe('POST /reviews/specialists/:userId', () => {
  it('farmer submits a review for an approved specialist', async () => {
    const specialist = await makeApprovedSpecialist()
    const farmer = await createUser('farmer')
    const res = await request(app)
      .post(`${BASE}/${specialist._id}`)
      .set('Authorization', authHeader(farmer))
      .send({ rating: 5, body: 'Excellent advice' })
    expect(res.status).toBe(201)
    expect(res.body.review.rating).toBe(5)
  })

  it('returns 400 for rating out of range', async () => {
    const specialist = await makeApprovedSpecialist()
    const farmer = await createUser('farmer')
    const res = await request(app)
      .post(`${BASE}/${specialist._id}`)
      .set('Authorization', authHeader(farmer))
      .send({ rating: 6 })
    expect(res.status).toBe(400)
  })

  it('prevents self-review', async () => {
    const specialist = await makeApprovedSpecialist()
    const res = await request(app)
      .post(`${BASE}/${specialist._id}`)
      .set('Authorization', authHeader(specialist))
      .send({ rating: 5 })
    expect(res.status).toBe(403)
  })

  it('returns 403 for non-farmer', async () => {
    const specialist = await makeApprovedSpecialist()
    const otherSpec = await makeApprovedSpecialist()
    const res = await request(app)
      .post(`${BASE}/${specialist._id}`)
      .set('Authorization', authHeader(otherSpec))
      .send({ rating: 4 })
    expect(res.status).toBe(403)
  })

  it('returns 401 without token', async () => {
    const specialist = await makeApprovedSpecialist()
    const res = await request(app)
      .post(`${BASE}/${specialist._id}`)
      .send({ rating: 4 })
    expect(res.status).toBe(401)
  })
})

describe('DELETE /reviews/specialists/:userId', () => {
  it('farmer deletes own review', async () => {
    const specialist = await makeApprovedSpecialist()
    const farmer = await createUser('farmer')
    await SpecialistReview.create({
      specialistId: specialist._id,
      reviewerId: farmer._id,
      rating: 3,
    })
    const res = await request(app)
      .delete(`${BASE}/${specialist._id}`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(await SpecialistReview.countDocuments({ reviewerId: farmer._id })).toBe(0)
  })

  it('returns 404 when no review exists to delete', async () => {
    const specialist = await makeApprovedSpecialist()
    const farmer = await createUser('farmer')
    const res = await request(app)
      .delete(`${BASE}/${specialist._id}`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(404)
  })
})
