import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'
import { Community } from '../../src/models/Community.js'
import { CommunityMember } from '../../src/models/CommunityMember.js'

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/communities'

async function seedCommunity(creatorId) {
  const c = await Community.create({
    name: 'Test Community',
    description: 'A test community',
    createdBy: creatorId,
  })
  await CommunityMember.create({ communityId: c._id, userId: creatorId })
  return c
}

describe('GET /communities', () => {
  it('returns all communities with member counts (no auth required)', async () => {
    const farmer = await createUser('farmer')
    await seedCommunity(farmer._id)
    const res = await request(app).get(BASE)
    expect(res.status).toBe(200)
    expect(res.body.communities).toHaveLength(1)
    expect(res.body.communities[0].memberCount).toBe(1)
  })

  it('marks isMember correctly for authenticated user', async () => {
    const farmer = await createUser('farmer')
    const community = await seedCommunity(farmer._id)
    const res = await request(app)
      .get(BASE)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    expect(res.body.communities[0].isMember).toBe(true)
  })

  it('isMember is false when user is not a member', async () => {
    const creator = await createUser('farmer')
    const visitor = await createUser('farmer')
    await seedCommunity(creator._id)
    const res = await request(app)
      .get(BASE)
      .set('Authorization', authHeader(visitor))
    expect(res.body.communities[0].isMember).toBe(false)
  })
})

describe('POST /communities', () => {
  it('farmer creates a community and auto-joins', async () => {
    const farmer = await createUser('farmer')
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ name: 'My Farm Group', description: 'Discussing crops' })
    expect(res.status).toBe(201)
    expect(res.body.community.name).toBe('My Farm Group')
    const member = await CommunityMember.exists({
      communityId: res.body.community._id,
      userId: farmer._id,
    })
    expect(member).toBeTruthy()
  })

  it('returns 400 when name is missing', async () => {
    const farmer = await createUser('farmer')
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ description: 'No name' })
    expect(res.status).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post(BASE).send({ name: 'x' })
    expect(res.status).toBe(401)
  })
})

describe('GET /communities/mine', () => {
  it('returns communities the user belongs to', async () => {
    const farmer = await createUser('farmer')
    await seedCommunity(farmer._id)
    const res = await request(app)
      .get(`${BASE}/mine`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    expect(res.body.communities).toHaveLength(1)
  })
})

describe('GET /communities/:communityId', () => {
  it('returns community details', async () => {
    const farmer = await createUser('farmer')
    const community = await seedCommunity(farmer._id)
    const res = await request(app).get(`${BASE}/${community._id}`)
    expect(res.status).toBe(200)
    expect(res.body.community.name).toBe('Test Community')
    expect(res.body.community.memberCount).toBe(1)
  })

  it('returns 404 for non-existent community', async () => {
    const res = await request(app).get(`${BASE}/507f1f77bcf86cd799439011`)
    expect(res.status).toBe(404)
  })
})

describe('POST /communities/:communityId/join', () => {
  it('allows a new farmer to join', async () => {
    const creator = await createUser('farmer')
    const joiner = await createUser('farmer')
    const community = await seedCommunity(creator._id)

    const res = await request(app)
      .post(`${BASE}/${community._id}/join`)
      .set('Authorization', authHeader(joiner))
    expect(res.status).toBe(201)
  })

  it('returns 409 when already a member', async () => {
    const farmer = await createUser('farmer')
    const community = await seedCommunity(farmer._id)

    const res = await request(app)
      .post(`${BASE}/${community._id}/join`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(409)
  })
})

describe('DELETE /communities/:communityId/leave', () => {
  it('removes the user from the community', async () => {
    const farmer = await createUser('farmer')
    const community = await seedCommunity(farmer._id)
    const res = await request(app)
      .delete(`${BASE}/${community._id}/leave`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    const member = await CommunityMember.exists({ communityId: community._id, userId: farmer._id })
    expect(member).toBeNull()
  })
})

describe('GET /communities/:communityId/posts', () => {
  it('returns posts in the community', async () => {
    const farmer = await createUser('farmer')
    const community = await seedCommunity(farmer._id)
    await request(app)
      .post(`${BASE}/${community._id}/posts`)
      .set('Authorization', authHeader(farmer))
      .send({ body: 'Hello community!' })
    const res = await request(app).get(`${BASE}/${community._id}/posts`)
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(1)
    expect(res.body.posts[0].body).toBe('Hello community!')
  })
})

describe('POST /communities/:communityId/posts', () => {
  it('member posts to community', async () => {
    const farmer = await createUser('farmer')
    const community = await seedCommunity(farmer._id)
    const res = await request(app)
      .post(`${BASE}/${community._id}/posts`)
      .set('Authorization', authHeader(farmer))
      .send({ body: 'Great harvest this season!' })
    expect(res.status).toBe(201)
    expect(res.body.post.body).toBe('Great harvest this season!')
  })

  it('returns 403 when user is not a member of the community', async () => {
    const creator = await createUser('farmer')
    const nonMember = await createUser('farmer')
    const community = await seedCommunity(creator._id)

    const res = await request(app)
      .post(`${BASE}/${community._id}/posts`)
      .set('Authorization', authHeader(nonMember))
      .send({ body: 'I should not post here' })
    expect(res.status).toBe(403)
  })
})
