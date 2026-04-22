import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'
import { InventoryItem } from '../../src/models/InventoryItem.js'
import { InventoryUsage } from '../../src/models/InventoryUsage.js'

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/inventory'

async function seedItem(farmer, overrides = {}) {
  const item = await InventoryItem.create({
    farmerId: farmer._id,
    category: 'fertilizer',
    name: 'NPK Fertilizer',
    quantity: 50,
    unit: 'kg',
    ...overrides,
  })
  await InventoryUsage.create({
    itemId: item._id,
    farmerId: farmer._id,
    delta: item.quantity,
    reason: 'initial_stock',
    quantityAfter: item.quantity,
  })
  return item
}

describe('POST /inventory/items', () => {
  it('creates an inventory item for a farmer', async () => {
    const farmer = await createUser('farmer')
    const res = await request(app)
      .post(`${BASE}/items`)
      .set('Authorization', authHeader(farmer))
      .send({ category: 'seed', name: 'Wheat Seeds', quantity: 100, unit: 'kg' })
    expect(res.status).toBe(201)
    expect(res.body.item.name).toBe('Wheat Seeds')
    expect(res.body.item.quantity).toBe(100)
    // Initial stock usage log should be created
    const usage = await InventoryUsage.findOne({ itemId: res.body.item._id })
    expect(usage).toBeTruthy()
    expect(usage.delta).toBe(100)
  })

  it('returns 400 for invalid category', async () => {
    const farmer = await createUser('farmer')
    const res = await request(app)
      .post(`${BASE}/items`)
      .set('Authorization', authHeader(farmer))
      .send({ category: 'unknown', name: 'Test', quantity: 10 })
    expect(res.status).toBe(400)
  })

  it('returns 403 for non-farmer', async () => {
    const spec = await createUser('specialist')
    const res = await request(app)
      .post(`${BASE}/items`)
      .set('Authorization', authHeader(spec))
      .send({ category: 'seed', name: 'Seeds', quantity: 10 })
    expect(res.status).toBe(403)
  })
})

describe('GET /inventory/items', () => {
  it('returns farmer\'s items', async () => {
    const farmer = await createUser('farmer')
    await seedItem(farmer)
    const res = await request(app)
      .get(`${BASE}/items`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(1)
  })

  it('does not return other farmers\' items', async () => {
    const a = await createUser('farmer')
    const b = await createUser('farmer')
    await seedItem(a)
    const res = await request(app)
      .get(`${BASE}/items`)
      .set('Authorization', authHeader(b))
    expect(res.body.items).toHaveLength(0)
  })
})

describe('PATCH /inventory/items/:id', () => {
  it('updates item and logs delta as usage', async () => {
    const farmer = await createUser('farmer')
    const item = await seedItem(farmer, { quantity: 50 })
    const res = await request(app)
      .patch(`${BASE}/items/${item._id}`)
      .set('Authorization', authHeader(farmer))
      .send({ quantity: 70 })
    expect(res.status).toBe(200)
    expect(res.body.item.quantity).toBe(70)
    const usageLogs = await InventoryUsage.find({ itemId: item._id }).sort({ createdAt: 1 })
    // Initial log + adjustment log
    expect(usageLogs).toHaveLength(2)
    expect(usageLogs[1].delta).toBe(20)
  })

  it('returns 403 when updating another farmer\'s item', async () => {
    const owner = await createUser('farmer')
    const other = await createUser('farmer')
    const item = await seedItem(owner)
    const res = await request(app)
      .patch(`${BASE}/items/${item._id}`)
      .set('Authorization', authHeader(other))
      .send({ quantity: 999 })
    expect(res.status).toBe(403)
  })
})

describe('DELETE /inventory/items/:id', () => {
  it('deletes item and all its usage logs', async () => {
    const farmer = await createUser('farmer')
    const item = await seedItem(farmer)
    const res = await request(app)
      .delete(`${BASE}/items/${item._id}`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(await InventoryItem.findById(item._id)).toBeNull()
    expect(await InventoryUsage.countDocuments({ itemId: item._id })).toBe(0)
  })
})

describe('POST /inventory/items/:id/usage', () => {
  it('logs positive delta (restock)', async () => {
    const farmer = await createUser('farmer')
    const item = await seedItem(farmer, { quantity: 50 })
    const res = await request(app)
      .post(`${BASE}/items/${item._id}/usage`)
      .set('Authorization', authHeader(farmer))
      .send({ delta: 10, reason: 'restock' })
    expect(res.status).toBe(201)
    expect(res.body.item.quantity).toBe(60)
    expect(res.body.usage.delta).toBe(10)
  })

  it('logs negative delta (consumption)', async () => {
    const farmer = await createUser('farmer')
    const item = await seedItem(farmer, { quantity: 50 })
    const res = await request(app)
      .post(`${BASE}/items/${item._id}/usage`)
      .set('Authorization', authHeader(farmer))
      .send({ delta: -20, reason: 'used on field' })
    expect(res.status).toBe(201)
    expect(res.body.item.quantity).toBe(30)
  })

  it('returns 400 when quantity would go negative', async () => {
    const farmer = await createUser('farmer')
    const item = await seedItem(farmer, { quantity: 10 })
    const res = await request(app)
      .post(`${BASE}/items/${item._id}/usage`)
      .set('Authorization', authHeader(farmer))
      .send({ delta: -100 })
    expect(res.status).toBe(400)
  })
})

describe('GET /inventory/items/:id/usage', () => {
  it('returns usage history for item', async () => {
    const farmer = await createUser('farmer')
    const item = await seedItem(farmer, { quantity: 50 })
    const res = await request(app)
      .get(`${BASE}/items/${item._id}/usage`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    expect(res.body.history).toHaveLength(1)
  })
})

describe('GET /inventory/summary/for-ai', () => {
  it('returns inventory snapshot with items and recent usage', async () => {
    const farmer = await createUser('farmer')
    await seedItem(farmer)
    const res = await request(app)
      .get(`${BASE}/summary/for-ai`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.recentUsage).toBeDefined()
    expect(res.body.generatedAt).toBeDefined()
  })
})
