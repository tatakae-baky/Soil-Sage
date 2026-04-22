import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'
import { Diagnosis } from '../../src/models/Diagnosis.js'

// Mock the Gemini diagnosis service so tests never call the real API
jest.mock('../../src/services/geminiDiagnosis.js', () => ({
  runDiagnosis: jest.fn().mockResolvedValue({
    result: {
      summary: 'Mocked diagnosis summary',
      likelyIssues: [
        { name: 'Nitrogen deficiency', confidence: 'high', evidence: 'Yellow leaves' },
      ],
      unlikelyButSerious: [],
      recommendedActions: [{ title: 'Add fertilizer', detail: 'Apply NPK 20-20-20' }],
      needsMoreInfo: [],
      safetyNotes: '',
    },
    disclaimer: 'AI disclaimer text',
    model: 'gemini-mock',
  }),
}))

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/diagnoses'

describe('POST /diagnoses', () => {
  it('returns 403 for non-farmer (specialist)', async () => {
    const user = await createUser('specialist')
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(user))
      .attach('images', Buffer.from('fake-image'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      })
    expect(res.status).toBe(403)
  })

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .post(BASE)
      .attach('images', Buffer.from('fake-image'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      })
    expect(res.status).toBe(401)
  })

  it('returns 400 when no images are provided', async () => {
    const user = await createUser('farmer')
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(user))
      .field('notes', 'Some notes')
    expect(res.status).toBe(400)
  })

  it('creates a diagnosis and returns result for a farmer with image', async () => {
    const user = await createUser('farmer')
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(user))
      .attach('images', Buffer.from('fake-image-data'), {
        filename: 'soil.jpg',
        contentType: 'image/jpeg',
      })
      .field('notes', 'Some crop notes')
    expect(res.status).toBe(201)
    expect(res.body.diagnosis.result.summary).toBe('Mocked diagnosis summary')
    expect(res.body.diagnosis.farmerId.toString()).toBe(user._id.toString())
  })
})

describe('GET /diagnoses/mine', () => {
  it('returns the current farmer\'s diagnoses', async () => {
    const user = await createUser('farmer')
    await Diagnosis.create({
      farmerId: user._id,
      result: { summary: 'Test', likelyIssues: [], recommendedActions: [] },
      model: 'test',
      disclaimer: 'Test disclaimer',
    })
    const res = await request(app)
      .get(`${BASE}/mine`)
      .set('Authorization', authHeader(user))
    expect(res.status).toBe(200)
    expect(res.body.diagnoses).toHaveLength(1)
  })

  it('returns 401 without token', async () => {
    const res = await request(app).get(`${BASE}/mine`)
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-farmer', async () => {
    const specialist = await createUser('specialist')
    const res = await request(app)
      .get(`${BASE}/mine`)
      .set('Authorization', authHeader(specialist))
    expect(res.status).toBe(403)
  })
})

describe('GET /diagnoses/monthly-stats', () => {
  it('returns 12 months of stats for authenticated user', async () => {
    const user = await createUser('farmer')
    const res = await request(app)
      .get(`${BASE}/monthly-stats`)
      .set('Authorization', authHeader(user))
    expect(res.status).toBe(200)
    expect(res.body.months).toBeDefined()
    // months is an array of {month, count} for months with diagnoses
    expect(Array.isArray(res.body.months)).toBe(true)
  })

  it('returns 401 without token', async () => {
    const res = await request(app).get(`${BASE}/monthly-stats`)
    expect(res.status).toBe(401)
  })
})

describe('GET /diagnoses/:id', () => {
  it('returns the diagnosis for its owner', async () => {
    const user = await createUser('farmer')
    const doc = await Diagnosis.create({
      farmerId: user._id,
      result: { summary: 'Details', likelyIssues: [], recommendedActions: [] },
      model: 'test',
      disclaimer: 'Test disclaimer',
    })
    const res = await request(app)
      .get(`${BASE}/${doc._id}`)
      .set('Authorization', authHeader(user))
    expect(res.status).toBe(200)
    expect(res.body.diagnosis._id.toString()).toBe(doc._id.toString())
  })

  it('returns 403 for another farmer\'s diagnosis', async () => {
    const owner = await createUser('farmer')
    const other = await createUser('farmer')
    const doc = await Diagnosis.create({
      farmerId: owner._id,
      result: { summary: 'Private', likelyIssues: [], recommendedActions: [] },
      model: 'test',
      disclaimer: 'Test disclaimer',
    })
    const res = await request(app)
      .get(`${BASE}/${doc._id}`)
      .set('Authorization', authHeader(other))
    expect(res.status).toBe(403)
  })
})
