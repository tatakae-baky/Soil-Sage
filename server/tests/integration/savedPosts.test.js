import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'
import { Community } from '../../src/models/Community.js'
import { CommunityMember } from '../../src/models/CommunityMember.js'
import { Post } from '../../src/models/Post.js'
import { SavedPost } from '../../src/models/SavedPost.js'

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/saved-posts'

async function seedPost(authorId) {
  const c = await Community.create({ name: 'Test', createdBy: authorId })
  await CommunityMember.create({ communityId: c._id, userId: authorId })
  return Post.create({ communityId: c._id, authorId, body: 'Test post' })
}

describe('POST /saved-posts', () => {
  it('farmer saves a post', async () => {
    const farmer = await createUser('farmer')
    const post = await seedPost(farmer._id)
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ postId: post._id.toString() })
    expect(res.status).toBe(201)
  })

  it('returns 409 when already saved', async () => {
    const farmer = await createUser('farmer')
    const post = await seedPost(farmer._id)
    await SavedPost.create({ userId: farmer._id, postId: post._id })
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ postId: post._id.toString() })
    expect(res.status).toBe(409)
  })

  it('returns 404 for deleted post', async () => {
    const farmer = await createUser('farmer')
    const post = await seedPost(farmer._id)
    await Post.findByIdAndUpdate(post._id, { deletedAt: new Date() })
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ postId: post._id.toString() })
    expect(res.status).toBe(404)
  })

  it('returns 403 for non-farmer', async () => {
    const spec = await createUser('specialist')
    const farmer = await createUser('farmer')
    const post = await seedPost(farmer._id)
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(spec))
      .send({ postId: post._id.toString() })
    expect(res.status).toBe(403)
  })
})

describe('GET /saved-posts', () => {
  it('returns farmer\'s saved posts', async () => {
    const farmer = await createUser('farmer')
    const post = await seedPost(farmer._id)
    await SavedPost.create({ userId: farmer._id, postId: post._id })
    const res = await request(app)
      .get(BASE)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    expect(res.body.saved).toHaveLength(1)
  })
})

describe('DELETE /saved-posts', () => {
  it('removes a saved post', async () => {
    const farmer = await createUser('farmer')
    const post = await seedPost(farmer._id)
    await SavedPost.create({ userId: farmer._id, postId: post._id })
    const res = await request(app)
      .delete(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ postId: post._id.toString() })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(await SavedPost.countDocuments({ userId: farmer._id })).toBe(0)
  })

  it('returns 404 when not saved', async () => {
    const farmer = await createUser('farmer')
    const post = await seedPost(farmer._id)
    const res = await request(app)
      .delete(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ postId: post._id.toString() })
    expect(res.status).toBe(404)
  })
})
