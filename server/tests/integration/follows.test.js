import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'
import { UserFollow } from '../../src/models/UserFollow.js'

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/follows'

describe('POST /follows/users/:userId', () => {
  it('farmer follows another user', async () => {
    const follower = await createUser('farmer')
    const target = await createUser('farmer')
    const res = await request(app)
      .post(`${BASE}/users/${target._id}`)
      .set('Authorization', authHeader(follower))
    expect(res.status).toBe(201)
    expect(await UserFollow.countDocuments({ followerId: follower._id, followingId: target._id })).toBe(1)
  })

  it('prevents self-follow', async () => {
    const farmer = await createUser('farmer')
    const res = await request(app)
      .post(`${BASE}/users/${farmer._id}`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(400)
  })

  it('returns 409 when already following', async () => {
    const follower = await createUser('farmer')
    const target = await createUser('farmer')
    await UserFollow.create({ followerId: follower._id, followingId: target._id })
    const res = await request(app)
      .post(`${BASE}/users/${target._id}`)
      .set('Authorization', authHeader(follower))
    expect(res.status).toBe(409)
  })

  it('returns 403 for non-farmer', async () => {
    const spec = await createUser('specialist')
    const target = await createUser('farmer')
    const res = await request(app)
      .post(`${BASE}/users/${target._id}`)
      .set('Authorization', authHeader(spec))
    expect(res.status).toBe(403)
  })
})

describe('DELETE /follows/users/:userId', () => {
  it('farmer unfollows a user', async () => {
    const follower = await createUser('farmer')
    const target = await createUser('farmer')
    await UserFollow.create({ followerId: follower._id, followingId: target._id })
    const res = await request(app)
      .delete(`${BASE}/users/${target._id}`)
      .set('Authorization', authHeader(follower))
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(await UserFollow.countDocuments({ followerId: follower._id })).toBe(0)
  })
})

describe('GET /follows/users/:userId/status', () => {
  it('returns follow counts and isFollowing status', async () => {
    const follower = await createUser('farmer')
    const target = await createUser('farmer')
    await UserFollow.create({ followerId: follower._id, followingId: target._id })
    const res = await request(app)
      .get(`${BASE}/users/${target._id}/status`)
      .set('Authorization', authHeader(follower))
    expect(res.status).toBe(200)
    expect(res.body.following).toBe(true)
    expect(res.body.followerCount).toBe(1)
    expect(res.body.followingCount).toBe(0)
  })
})

describe('GET /follows/users/:userId/followers', () => {
  it('returns list of followers (public)', async () => {
    const follower = await createUser('farmer')
    const target = await createUser('farmer')
    await UserFollow.create({ followerId: follower._id, followingId: target._id })
    const res = await request(app).get(`${BASE}/users/${target._id}/followers`)
    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(1)
  })
})

describe('GET /follows/users/:userId/following', () => {
  it('returns list of users someone is following (public)', async () => {
    const follower = await createUser('farmer')
    const target = await createUser('farmer')
    await UserFollow.create({ followerId: follower._id, followingId: target._id })
    const res = await request(app).get(`${BASE}/users/${follower._id}/following`)
    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(1)
  })
})
