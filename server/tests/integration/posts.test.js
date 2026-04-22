import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'
import { Community } from '../../src/models/Community.js'
import { CommunityMember } from '../../src/models/CommunityMember.js'
import { Post } from '../../src/models/Post.js'
import { Comment } from '../../src/models/Comment.js'
import { UserFollow } from '../../src/models/UserFollow.js'

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/posts'

async function seedCommunityAndPost(member, authorId = null) {
  const author = authorId ? { _id: authorId } : member
  const c = await Community.create({ name: 'Test', createdBy: author._id })
  await CommunityMember.create({ communityId: c._id, userId: member._id })
  const post = await Post.create({ communityId: c._id, authorId: author._id, body: 'Hello world' })
  return { community: c, post }
}

describe('GET /posts/:postId', () => {
  it('returns a post by id', async () => {
    const farmer = await createUser('farmer')
    const { post } = await seedCommunityAndPost(farmer)
    const res = await request(app).get(`${BASE}/${post._id}`)
    expect(res.status).toBe(200)
    expect(res.body.post.body).toBe('Hello world')
  })

  it('returns 404 for deleted post', async () => {
    const farmer = await createUser('farmer')
    const { post } = await seedCommunityAndPost(farmer)
    await Post.findByIdAndUpdate(post._id, { deletedAt: new Date() })
    const res = await request(app).get(`${BASE}/${post._id}`)
    expect(res.status).toBe(404)
  })

  it('returns 404 for hidden post to non-admin', async () => {
    const farmer = await createUser('farmer')
    const { post } = await seedCommunityAndPost(farmer)
    await Post.findByIdAndUpdate(post._id, { hiddenByAdmin: true })
    const res = await request(app).get(`${BASE}/${post._id}`)
    expect(res.status).toBe(404)
  })
})

describe('PATCH /posts/:postId', () => {
  it('farmer can update their own post', async () => {
    const farmer = await createUser('farmer')
    const { post } = await seedCommunityAndPost(farmer)
    const res = await request(app)
      .patch(`${BASE}/${post._id}`)
      .set('Authorization', authHeader(farmer))
      .send({ body: 'Updated content' })
    expect(res.status).toBe(200)
    expect(res.body.post.body).toBe('Updated content')
  })

  it('returns 403 when updating another user\'s post', async () => {
    const farmer1 = await createUser('farmer')
    const farmer2 = await createUser('farmer')
    const c = await Community.create({ name: 'c', createdBy: farmer1._id })
    await CommunityMember.create({ communityId: c._id, userId: farmer1._id })
    const post = await Post.create({ communityId: c._id, authorId: farmer1._id, body: 'Original' })
    const res = await request(app)
      .patch(`${BASE}/${post._id}`)
      .set('Authorization', authHeader(farmer2))
      .send({ body: 'Hacked' })
    expect(res.status).toBe(403)
  })
})

describe('DELETE /posts/:postId', () => {
  it('soft-deletes own post', async () => {
    const farmer = await createUser('farmer')
    const { post } = await seedCommunityAndPost(farmer)
    const res = await request(app)
      .delete(`${BASE}/${post._id}`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    const updated = await Post.findById(post._id)
    expect(updated.deletedAt).not.toBeNull()
  })
})

describe('GET /posts/:postId/comments', () => {
  it('returns comments for a post', async () => {
    const farmer = await createUser('farmer')
    const { post } = await seedCommunityAndPost(farmer)
    await Comment.create({ postId: post._id, authorId: farmer._id, body: 'Nice post!' })
    const res = await request(app).get(`${BASE}/${post._id}/comments`)
    expect(res.status).toBe(200)
    expect(res.body.comments).toHaveLength(1)
    expect(res.body.comments[0].body).toBe('Nice post!')
  })
})

describe('POST /posts/:postId/comments', () => {
  it('farmer posts a comment', async () => {
    const farmer = await createUser('farmer')
    const { post } = await seedCommunityAndPost(farmer)
    const res = await request(app)
      .post(`${BASE}/${post._id}/comments`)
      .set('Authorization', authHeader(farmer))
      .send({ body: 'Great post!' })
    expect(res.status).toBe(201)
    expect(res.body.comment.body).toBe('Great post!')
  })

  it('returns 403 for non-authorized role', async () => {
    const farmer = await createUser('farmer')
    const admin = await createUser('admin')
    const { post } = await seedCommunityAndPost(farmer)
    const res = await request(app)
      .post(`${BASE}/${post._id}/comments`)
      .set('Authorization', authHeader(admin))
      .send({ body: 'Admin comment' })
    expect(res.status).toBe(403)
  })
})

describe('GET /posts/following-feed', () => {
  it('returns posts from followed users in joined communities', async () => {
    const reader = await createUser('farmer')
    const author = await createUser('farmer')
    const c = await Community.create({ name: 'Shared', createdBy: author._id })
    await CommunityMember.create({ communityId: c._id, userId: reader._id })
    await CommunityMember.create({ communityId: c._id, userId: author._id })
    await Post.create({ communityId: c._id, authorId: author._id, body: 'Feed post' })
    await UserFollow.create({ followerId: reader._id, followingId: author._id })

    const res = await request(app)
      .get(`${BASE}/following-feed`)
      .set('Authorization', authHeader(reader))
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(1)
    expect(res.body.posts[0].body).toBe('Feed post')
  })

  it('returns empty feed when user follows nobody', async () => {
    const reader = await createUser('farmer')
    const res = await request(app)
      .get(`${BASE}/following-feed`)
      .set('Authorization', authHeader(reader))
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(0)
  })
})
