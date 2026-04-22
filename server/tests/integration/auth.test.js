import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/auth'

describe('POST /auth/register', () => {
  it('registers a farmer and returns token + user', async () => {
    const res = await request(app).post(`${BASE}/register`).send({
      name: 'John Farmer',
      email: 'john@farm.com',
      password: 'Password123!',
      roles: ['farmer'],
    })
    expect(res.status).toBe(201)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user.email).toBe('john@farm.com')
    expect(res.body.user.passwordHash).toBeUndefined()
  })

  it('auto-adds farmer role when registering as land_owner', async () => {
    const res = await request(app).post(`${BASE}/register`).send({
      name: 'Land Owner',
      email: 'owner@land.com',
      password: 'Password123!',
      roles: ['land_owner'],
    })
    expect(res.status).toBe(201)
    expect(res.body.user.roles).toContain('farmer')
    expect(res.body.user.roles).toContain('land_owner')
  })

  it('sets specialistApproval to pending for specialist registration', async () => {
    const res = await request(app).post(`${BASE}/register`).send({
      name: 'Dr Specialist',
      email: 'spec@test.com',
      password: 'Password123!',
      roles: ['specialist'],
    })
    expect(res.status).toBe(201)
    expect(res.body.user.specialistApproval).toBe('pending')
  })

  it('returns 409 when email is already registered', async () => {
    await request(app).post(`${BASE}/register`).send({
      name: 'First',
      email: 'dup@test.com',
      password: 'Password123!',
      roles: ['farmer'],
    })
    const res = await request(app).post(`${BASE}/register`).send({
      name: 'Second',
      email: 'dup@test.com',
      password: 'Password123!',
      roles: ['farmer'],
    })
    expect(res.status).toBe(409)
  })

  it('returns 400 for missing required fields', async () => {
    const res = await request(app).post(`${BASE}/register`).send({
      name: 'No Email',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when password is too short', async () => {
    const res = await request(app).post(`${BASE}/register`).send({
      name: 'Short',
      email: 'short@test.com',
      password: '123',
      roles: ['farmer'],
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app).post(`${BASE}/register`).send({
      name: 'Login User',
      email: 'login@test.com',
      password: 'Password123!',
      roles: ['farmer'],
    })
  })

  it('returns token and user on valid credentials', async () => {
    const res = await request(app).post(`${BASE}/login`).send({
      email: 'login@test.com',
      password: 'Password123!',
    })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user.email).toBe('login@test.com')
  })

  it('returns 401 for wrong password', async () => {
    const res = await request(app).post(`${BASE}/login`).send({
      email: 'login@test.com',
      password: 'wrongpassword',
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 for non-existent email', async () => {
    const res = await request(app).post(`${BASE}/login`).send({
      email: 'nobody@test.com',
      password: 'Password123!',
    })
    expect(res.status).toBe(401)
  })
})

describe('GET /auth/me', () => {
  it('returns current user for valid token', async () => {
    const user = await createUser('farmer')
    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', authHeader(user))
    expect(res.status).toBe(200)
    expect(res.body.user._id.toString()).toBe(user._id.toString())
    expect(res.body.user.passwordHash).toBeUndefined()
  })

  it('returns 401 without token', async () => {
    const res = await request(app).get(`${BASE}/me`)
    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', 'Bearer invalidtoken')
    expect(res.status).toBe(401)
  })
})
