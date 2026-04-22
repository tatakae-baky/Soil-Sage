import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'
import { Notification } from '../../src/models/Notification.js'

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/notifications'

async function seedNotification(userId, overrides = {}) {
  return Notification.create({
    userId,
    type: 'diagnosis_ready',
    title: 'Test Notification',
    body: 'Test body',
    read: false,
    ...overrides,
  })
}

describe('GET /notifications', () => {
  it('returns notifications for authenticated user (newest first)', async () => {
    const farmer = await createUser('farmer')
    await seedNotification(farmer._id, { title: 'First' })
    await seedNotification(farmer._id, { title: 'Second' })
    const res = await request(app)
      .get(BASE)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    expect(res.body.notifications).toHaveLength(2)
  })

  it('does not return another user\'s notifications', async () => {
    const a = await createUser('farmer')
    const b = await createUser('farmer')
    await seedNotification(a._id)
    const res = await request(app)
      .get(BASE)
      .set('Authorization', authHeader(b))
    expect(res.body.notifications).toHaveLength(0)
  })

  it('returns 401 without token', async () => {
    const res = await request(app).get(BASE)
    expect(res.status).toBe(401)
  })
})

describe('PATCH /notifications/:id/read', () => {
  it('marks a notification as read', async () => {
    const farmer = await createUser('farmer')
    const notif = await seedNotification(farmer._id)
    const res = await request(app)
      .patch(`${BASE}/${notif._id}/read`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    const updated = await Notification.findById(notif._id)
    expect(updated.read).toBe(true)
  })

  it('returns 404 for another user\'s notification', async () => {
    const owner = await createUser('farmer')
    const other = await createUser('farmer')
    const notif = await seedNotification(owner._id)
    const res = await request(app)
      .patch(`${BASE}/${notif._id}/read`)
      .set('Authorization', authHeader(other))
    expect(res.status).toBe(404)
  })
})

describe('POST /notifications/read-all', () => {
  it('marks all unread notifications as read', async () => {
    const farmer = await createUser('farmer')
    await seedNotification(farmer._id)
    await seedNotification(farmer._id)
    const res = await request(app)
      .post(`${BASE}/read-all`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    const unread = await Notification.countDocuments({ userId: farmer._id, read: false })
    expect(unread).toBe(0)
  })
})
