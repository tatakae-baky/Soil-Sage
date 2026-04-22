import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'
import { DiscoveryArticle } from '../../src/models/DiscoveryArticle.js'
import { DiscoveryReaction } from '../../src/models/DiscoveryReaction.js'

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/discovery'

async function seedArticle(authorId, overrides = {}) {
  return DiscoveryArticle.create({
    authorId,
    title: 'Test Article',
    body: 'Article body content',
    kind: 'general',
    hiddenByAdmin: false,
    ...overrides,
  })
}

describe('GET /discovery/articles', () => {
  it('returns public articles (no auth required)', async () => {
    const admin = await createUser('admin')
    await seedArticle(admin._id)
    const res = await request(app).get(`${BASE}/articles`)
    expect(res.status).toBe(200)
    expect(res.body.articles).toHaveLength(1)
  })

  it('hides admin-hidden articles from regular users', async () => {
    const admin = await createUser('admin')
    await seedArticle(admin._id, { hiddenByAdmin: true })
    const res = await request(app).get(`${BASE}/articles`)
    expect(res.status).toBe(200)
    expect(res.body.articles).toHaveLength(0)
  })

  it('admin can see hidden articles', async () => {
    const admin = await createUser('admin')
    await seedArticle(admin._id, { hiddenByAdmin: true })
    const res = await request(app)
      .get(`${BASE}/articles`)
      .set('Authorization', authHeader(admin))
    expect(res.body.articles).toHaveLength(1)
  })

  it('filters by kind', async () => {
    const admin = await createUser('admin')
    await seedArticle(admin._id, { kind: 'research' })
    await seedArticle(admin._id, { kind: 'alert' })
    const res = await request(app).get(`${BASE}/articles?kind=research`)
    expect(res.body.articles).toHaveLength(1)
    expect(res.body.articles[0].kind).toBe('research')
  })
})

describe('GET /discovery/articles/:id', () => {
  it('returns article with myReaction for authenticated user', async () => {
    const admin = await createUser('admin')
    const farmer = await createUser('farmer')
    const article = await seedArticle(admin._id)
    await DiscoveryReaction.create({
      userId: farmer._id,
      articleId: article._id,
      kind: 'like',
    })
    const res = await request(app)
      .get(`${BASE}/articles/${article._id}`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    expect(res.body.myReaction).toBe('like')
  })

  it('returns 404 for hidden article to non-admin', async () => {
    const admin = await createUser('admin')
    const article = await seedArticle(admin._id, { hiddenByAdmin: true })
    const res = await request(app).get(`${BASE}/articles/${article._id}`)
    expect(res.status).toBe(404)
  })
})

describe('GET /discovery/articles/:id/comments', () => {
  it('returns comments on an article', async () => {
    const admin = await createUser('admin')
    const farmer = await createUser('farmer')
    const article = await seedArticle(admin._id)
    // Post a comment
    await request(app)
      .post(`${BASE}/articles/${article._id}/comments`)
      .set('Authorization', authHeader(farmer))
      .send({ body: 'Great article!' })
    const res = await request(app).get(`${BASE}/articles/${article._id}/comments`)
    expect(res.status).toBe(200)
    expect(res.body.comments).toHaveLength(1)
    expect(res.body.comments[0].body).toBe('Great article!')
  })
})

describe('POST /discovery/articles/:id/comments', () => {
  it('farmer posts a comment', async () => {
    const admin = await createUser('admin')
    const farmer = await createUser('farmer')
    const article = await seedArticle(admin._id)
    const res = await request(app)
      .post(`${BASE}/articles/${article._id}/comments`)
      .set('Authorization', authHeader(farmer))
      .send({ body: 'Very informative!' })
    expect(res.status).toBe(201)
    expect(res.body.comment.body).toBe('Very informative!')
  })

  it('returns 403 for non-farmer (specialist)', async () => {
    const admin = await createUser('admin')
    const specialist = await createUser('specialist')
    const article = await seedArticle(admin._id)
    const res = await request(app)
      .post(`${BASE}/articles/${article._id}/comments`)
      .set('Authorization', authHeader(specialist))
      .send({ body: 'Test' })
    expect(res.status).toBe(403)
  })
})

describe('POST /discovery/articles/:id/react', () => {
  it('farmer likes an article', async () => {
    const admin = await createUser('admin')
    const farmer = await createUser('farmer')
    const article = await seedArticle(admin._id)
    const res = await request(app)
      .post(`${BASE}/articles/${article._id}/react`)
      .set('Authorization', authHeader(farmer))
      .send({ kind: 'like' })
    expect(res.status).toBe(200)
    const reaction = await DiscoveryReaction.findOne({ userId: farmer._id, articleId: article._id })
    expect(reaction.kind).toBe('like')
  })

  it('same reaction removes the vote (toggle)', async () => {
    const admin = await createUser('admin')
    const farmer = await createUser('farmer')
    const article = await seedArticle(admin._id)
    await DiscoveryReaction.create({ userId: farmer._id, articleId: article._id, kind: 'like' })
    const res = await request(app)
      .post(`${BASE}/articles/${article._id}/react`)
      .set('Authorization', authHeader(farmer))
      .send({ kind: 'like' })
    expect(res.status).toBe(200)
    // Toggled off — no reaction remains
    const reaction = await DiscoveryReaction.findOne({ userId: farmer._id, articleId: article._id })
    expect(reaction).toBeNull()
  })

  it('different reaction switches the vote', async () => {
    const admin = await createUser('admin')
    const farmer = await createUser('farmer')
    const article = await seedArticle(admin._id)
    await DiscoveryReaction.create({ userId: farmer._id, articleId: article._id, kind: 'like' })
    await request(app)
      .post(`${BASE}/articles/${article._id}/react`)
      .set('Authorization', authHeader(farmer))
      .send({ kind: 'dislike' })
    const reaction = await DiscoveryReaction.findOne({ userId: farmer._id, articleId: article._id })
    expect(reaction.kind).toBe('dislike')
  })
})
