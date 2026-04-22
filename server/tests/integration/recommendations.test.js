import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'
import { CropRecommendation } from '../../src/models/CropRecommendation.js'

jest.mock('../../src/services/geminiRecommendation.js', () => ({
  runRecommendation: jest.fn().mockResolvedValue({
    result: {
      recommendedCrops: [
        { name: 'Rice', reasoning: 'Thrives in monsoon', careNotes: 'Regular watering' },
        { name: 'Jute', reasoning: 'Good for region', careNotes: 'Well-drained soil' },
      ],
      rotationAdvice: 'Rotate with lentils',
      seasonalTips: 'Plant in June',
      generalNotes: 'Use organic fertilizer',
    },
    disclaimer: 'AI disclaimer',
    model: 'gemini-mock',
  }),
}))

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/recommendations'

describe('POST /recommendations', () => {
  it('creates a recommendation for a farmer', async () => {
    const user = await createUser('farmer')
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(user))
      .send({ cropType: 'Rice', soilType: 'Clay', region: 'Sylhet', season: 'Kharif' })
    expect(res.status).toBe(201)
    expect(res.body.recommendation.recommendedCrops).toHaveLength(2)
    expect(res.body.recommendation.userId.toString()).toBe(user._id.toString())
  })

  it('returns 403 for non-farmer', async () => {
    const specialist = await createUser('specialist')
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(specialist))
      .send({ cropType: 'Rice' })
    expect(res.status).toBe(403)
  })

  it('returns 401 without token', async () => {
    const res = await request(app).post(BASE).send({ cropType: 'Rice' })
    expect(res.status).toBe(401)
  })
})

describe('GET /recommendations', () => {
  it('returns paginated list for the authenticated farmer', async () => {
    const user = await createUser('farmer')
    await CropRecommendation.create([
      {
        userId: user._id,
        recommendedCrops: [],
        rotationAdvice: '',
        seasonalTips: '',
        generalNotes: '',
        disclaimer: '',
        model: 'test',
      },
      {
        userId: user._id,
        recommendedCrops: [],
        rotationAdvice: '',
        seasonalTips: '',
        generalNotes: '',
        disclaimer: '',
        model: 'test',
      },
    ])
    const res = await request(app)
      .get(BASE)
      .set('Authorization', authHeader(user))
    expect(res.status).toBe(200)
    expect(res.body.recommendations).toHaveLength(2)
    expect(res.body.total).toBe(2)
  })

  it('does not return another farmer\'s recommendations', async () => {
    const owner = await createUser('farmer')
    const other = await createUser('farmer')
    await CropRecommendation.create({
      userId: owner._id,
      recommendedCrops: [],
      rotationAdvice: '',
      seasonalTips: '',
      generalNotes: '',
      disclaimer: '',
      model: 'test',
    })
    const res = await request(app)
      .get(BASE)
      .set('Authorization', authHeader(other))
    expect(res.status).toBe(200)
    expect(res.body.recommendations).toHaveLength(0)
  })
})

describe('GET /recommendations/:id', () => {
  it('returns the recommendation by ID for its owner', async () => {
    const user = await createUser('farmer')
    const rec = await CropRecommendation.create({
      userId: user._id,
      recommendedCrops: [],
      rotationAdvice: '',
      seasonalTips: '',
      generalNotes: '',
      disclaimer: '',
      model: 'test',
    })
    const res = await request(app)
      .get(`${BASE}/${rec._id}`)
      .set('Authorization', authHeader(user))
    expect(res.status).toBe(200)
    expect(res.body.recommendation._id.toString()).toBe(rec._id.toString())
  })

  it('returns 404 for another user\'s recommendation', async () => {
    const owner = await createUser('farmer')
    const other = await createUser('farmer')
    const rec = await CropRecommendation.create({
      userId: owner._id,
      recommendedCrops: [],
      rotationAdvice: '',
      seasonalTips: '',
      generalNotes: '',
      disclaimer: '',
      model: 'test',
    })
    const res = await request(app)
      .get(`${BASE}/${rec._id}`)
      .set('Authorization', authHeader(other))
    expect(res.status).toBe(404)
  })
})
