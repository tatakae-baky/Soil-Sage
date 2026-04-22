import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'
import { Land } from '../../src/models/Land.js'
import { RentalRequest } from '../../src/models/RentalRequest.js'

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/rentals'

const sampleCoords = [90.4125, 23.8103]

async function createRentableLand(owner) {
  return Land.create({
    ownerId: owner._id,
    title: 'Rentable Farm',
    location: { type: 'Point', coordinates: sampleCoords },
    availableForRent: true,
    isActive: true,
  })
}

async function makeApprovedLandOwner() {
  return createUser('land_owner', {
    roles: ['farmer', 'land_owner'],
    landOwnerApproval: 'approved',
  })
}

describe('POST /rentals/requests', () => {
  it('farmer sends rental request', async () => {
    const owner = await makeApprovedLandOwner()
    const farmer = await createUser('farmer')
    const land = await createRentableLand(owner)

    const res = await request(app)
      .post(`${BASE}/requests`)
      .set('Authorization', authHeader(farmer))
      .send({ landId: land._id.toString(), message: 'I want to rent this.' })
    expect(res.status).toBe(201)
    expect(res.body.request.status).toBe('pending')
  })

  it('returns 400 when land is not available for rent', async () => {
    const owner = await makeApprovedLandOwner()
    const farmer = await createUser('farmer')
    const land = await Land.create({
      ownerId: owner._id,
      title: 'Not Rentable',
      location: { type: 'Point', coordinates: sampleCoords },
      availableForRent: false,
    })
    const res = await request(app)
      .post(`${BASE}/requests`)
      .set('Authorization', authHeader(farmer))
      .send({ landId: land._id.toString() })
    expect(res.status).toBe(400)
  })

  it('returns 400 when requesting own land', async () => {
    const owner = await makeApprovedLandOwner()
    const land = await createRentableLand(owner)
    const res = await request(app)
      .post(`${BASE}/requests`)
      .set('Authorization', authHeader(owner))
      .send({ landId: land._id.toString() })
    expect(res.status).toBe(400)
  })

  it('returns 409 for duplicate pending request', async () => {
    const owner = await makeApprovedLandOwner()
    const farmer = await createUser('farmer')
    const land = await createRentableLand(owner)
    await RentalRequest.create({
      landId: land._id,
      requesterId: farmer._id,
      ownerId: owner._id,
      status: 'pending',
    })
    const res = await request(app)
      .post(`${BASE}/requests`)
      .set('Authorization', authHeader(farmer))
      .send({ landId: land._id.toString() })
    expect(res.status).toBe(409)
  })
})

describe('GET /rentals/requests/mine/outgoing', () => {
  it('returns farmer\'s outgoing requests', async () => {
    const owner = await makeApprovedLandOwner()
    const farmer = await createUser('farmer')
    const land = await createRentableLand(owner)
    await RentalRequest.create({
      landId: land._id,
      requesterId: farmer._id,
      ownerId: owner._id,
    })
    const res = await request(app)
      .get(`${BASE}/requests/mine/outgoing`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    expect(res.body.requests).toHaveLength(1)
  })
})

describe('GET /rentals/requests/mine/incoming', () => {
  it('returns land owner\'s incoming requests', async () => {
    const owner = await makeApprovedLandOwner()
    const farmer = await createUser('farmer')
    const land = await createRentableLand(owner)
    await RentalRequest.create({
      landId: land._id,
      requesterId: farmer._id,
      ownerId: owner._id,
    })
    const res = await request(app)
      .get(`${BASE}/requests/mine/incoming`)
      .set('Authorization', authHeader(owner))
    expect(res.status).toBe(200)
    expect(res.body.requests).toHaveLength(1)
  })

  it('returns 403 for non-approved land owner', async () => {
    const farmer = await createUser('farmer')
    const res = await request(app)
      .get(`${BASE}/requests/mine/incoming`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(403)
  })
})

describe('PATCH /rentals/requests/:id', () => {
  it('land owner approves a rental request', async () => {
    const owner = await makeApprovedLandOwner()
    const farmer = await createUser('farmer')
    const land = await createRentableLand(owner)
    const rentalReq = await RentalRequest.create({
      landId: land._id,
      requesterId: farmer._id,
      ownerId: owner._id,
      status: 'pending',
    })
    const res = await request(app)
      .patch(`${BASE}/requests/${rentalReq._id}`)
      .set('Authorization', authHeader(owner))
      .send({ status: 'approved' })
    expect(res.status).toBe(200)
    expect(res.body.request.status).toBe('approved')
  })

  it('land owner rejects a rental request', async () => {
    const owner = await makeApprovedLandOwner()
    const farmer = await createUser('farmer')
    const land = await createRentableLand(owner)
    const rentalReq = await RentalRequest.create({
      landId: land._id,
      requesterId: farmer._id,
      ownerId: owner._id,
      status: 'pending',
    })
    const res = await request(app)
      .patch(`${BASE}/requests/${rentalReq._id}`)
      .set('Authorization', authHeader(owner))
      .send({ status: 'rejected' })
    expect(res.status).toBe(200)
    expect(res.body.request.status).toBe('rejected')
  })
})
