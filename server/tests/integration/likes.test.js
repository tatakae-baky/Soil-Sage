import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'
import { Community } from '../../src/models/Community.js'
import { CommunityMember } from '../../src/models/CommunityMember.js'
import { Post } from '../../src/models/Post.js'
import { Comment } from '../../src/models/Comment.js'
import { Like } from '../../src/models/Like.js'

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/likes'

async function seedPost(authorId) {
  const c = await Community.create({ name: 'Test', createdBy: authorId })
  await CommunityMember.create({ communityId: c._id, userId: authorId })
  return Post.create({ communityId: c._id, authorId, body: 'Test post' })
}

async function seedComment(authorId, postId) {
  return Comment.create({ postId, authorId, body: 'Test comment' })
}

describe('POST /likes (like a post)', () => {
  it('farmer likes a post and increments likeCount', async () => {
    const farmer = await createUser('farmer')
    const author = await createUser('farmer')
    const post = await seedPost(author._id)

    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ targetType: 'post', targetId: post._id.toString() })
    expect(res.status).toBe(201)
    const updated = await Post.findById(post._id)
    expect(updated.likeCount).toBe(1)
  })

  it('returns 409 when already liked', async () => {
    const farmer = await createUser('farmer')
    const post = await seedPost(farmer._id)
    await Like.create({ userId: farmer._id, targetType: 'post', targetId: post._id })
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ targetType: 'post', targetId: post._id.toString() })
    expect(res.status).toBe(409)
  })

  it('farmer likes a comment', async () => {
    const farmer = await createUser('farmer')
    const author = await createUser('farmer')
    const post = await seedPost(author._id)
    const comment = await seedComment(author._id, post._id)

    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ targetType: 'comment', targetId: comment._id.toString() })
    expect(res.status).toBe(201)
  })

  it('returns 403 for non-farmer', async () => {
    const spec = await createUser('specialist')
    const farmer = await createUser('farmer')
    const post = await seedPost(farmer._id)
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(spec))
      .send({ targetType: 'post', targetId: post._id.toString() })
    expect(res.status).toBe(403)
  })
})

describe('DELETE /likes (unlike)', () => {
  it('farmer unlikes a post and decrements likeCount', async () => {
    const farmer = await createUser('farmer')
    const post = await seedPost(farmer._id)
    await Like.create({ userId: farmer._id, targetType: 'post', targetId: post._id })
    await Post.findByIdAndUpdate(post._id, { likeCount: 1 })

    const res = await request(app)
      .delete(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ targetType: 'post', targetId: post._id.toString() })
    expect(res.status).toBe(200)
    const updated = await Post.findById(post._id)
    expect(updated.likeCount).toBe(0)
  })

  it('returns 404 when not liked', async () => {
    const farmer = await createUser('farmer')
    const post = await seedPost(farmer._id)
    const res = await request(app)
      .delete(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ targetType: 'post', targetId: post._id.toString() })
    expect(res.status).toBe(404)
  })
})
