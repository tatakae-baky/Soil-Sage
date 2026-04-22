import request from 'supertest'
import { app } from '../../src/app.js'
import { connect, disconnect, clearDatabase } from '../setup/db.js'
import { createUser, authHeader } from '../helpers/auth.js'
import { Appointment } from '../../src/models/Appointment.js'

beforeAll(() => connect())
afterEach(() => clearDatabase())
afterAll(() => disconnect())

const BASE = '/api/v1/appointments'

async function makeApprovedSpecialist() {
  return createUser('specialist', { specialistApproval: 'approved' })
}

describe('POST /appointments', () => {
  it('farmer creates appointment with approved specialist', async () => {
    const farmer = await createUser('farmer')
    const specialist = await makeApprovedSpecialist()

    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ specialistId: specialist._id.toString(), title: 'Need advice on crops' })
    expect(res.status).toBe(201)
    expect(res.body.appointment.status).toBe('pending')
    expect(res.body.appointment.farmerId.toString()).toBe(farmer._id.toString())
  })

  it('returns 404 for non-existent or non-approved specialist', async () => {
    const farmer = await createUser('farmer')
    const pendingSpec = await createUser('specialist', { specialistApproval: 'pending' })

    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ specialistId: pendingSpec._id.toString(), title: 'Test' })
    expect(res.status).toBe(404)
  })

  it('returns 403 for specialist trying to create appointment', async () => {
    const specialist = await makeApprovedSpecialist()
    const otherSpec = await makeApprovedSpecialist()

    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(specialist))
      .send({ specialistId: otherSpec._id.toString(), title: 'Test' })
    expect(res.status).toBe(403)
  })

  it('returns 401 without token', async () => {
    const res = await request(app).post(BASE).send({ specialistId: 'x', title: 'y' })
    expect(res.status).toBe(401)
  })

  it('returns 400 when title is missing', async () => {
    const farmer = await createUser('farmer')
    const specialist = await makeApprovedSpecialist()
    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader(farmer))
      .send({ specialistId: specialist._id.toString() })
    expect(res.status).toBe(400)
  })
})

describe('GET /appointments/outgoing', () => {
  it('returns farmer\'s outgoing requests', async () => {
    const farmer = await createUser('farmer')
    const specialist = await makeApprovedSpecialist()
    await Appointment.create({
      farmerId: farmer._id,
      specialistId: specialist._id,
      title: 'Test appt',
    })
    const res = await request(app)
      .get(`${BASE}/outgoing`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    expect(res.body.appointments).toHaveLength(1)
  })

  it('returns 403 for specialist', async () => {
    const spec = await makeApprovedSpecialist()
    const res = await request(app)
      .get(`${BASE}/outgoing`)
      .set('Authorization', authHeader(spec))
    expect(res.status).toBe(403)
  })
})

describe('GET /appointments/incoming', () => {
  it('returns approved specialist\'s incoming requests', async () => {
    const farmer = await createUser('farmer')
    const specialist = await makeApprovedSpecialist()
    await Appointment.create({
      farmerId: farmer._id,
      specialistId: specialist._id,
      title: 'Incoming appt',
    })
    const res = await request(app)
      .get(`${BASE}/incoming`)
      .set('Authorization', authHeader(specialist))
    expect(res.status).toBe(200)
    expect(res.body.appointments).toHaveLength(1)
  })

  it('returns 403 for farmer', async () => {
    const farmer = await createUser('farmer')
    const res = await request(app)
      .get(`${BASE}/incoming`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(403)
  })

  it('returns 403 for pending specialist', async () => {
    const pending = await createUser('specialist', { specialistApproval: 'pending' })
    const res = await request(app)
      .get(`${BASE}/incoming`)
      .set('Authorization', authHeader(pending))
    expect(res.status).toBe(403)
  })
})

describe('PATCH /appointments/:id/status', () => {
  it('specialist confirms appointment', async () => {
    const farmer = await createUser('farmer')
    const specialist = await makeApprovedSpecialist()
    const appt = await Appointment.create({
      farmerId: farmer._id,
      specialistId: specialist._id,
      title: 'To confirm',
    })
    const res = await request(app)
      .patch(`${BASE}/${appt._id}/status`)
      .set('Authorization', authHeader(specialist))
      .send({ status: 'confirmed' })
    expect(res.status).toBe(200)
    expect(res.body.appointment.status).toBe('confirmed')
  })

  it('specialist cancels appointment', async () => {
    const farmer = await createUser('farmer')
    const specialist = await makeApprovedSpecialist()
    const appt = await Appointment.create({
      farmerId: farmer._id,
      specialistId: specialist._id,
      title: 'To cancel',
    })
    const res = await request(app)
      .patch(`${BASE}/${appt._id}/status`)
      .set('Authorization', authHeader(specialist))
      .send({ status: 'cancelled' })
    expect(res.status).toBe(200)
    expect(res.body.appointment.status).toBe('cancelled')
  })

  it('returns 404 when specialist tries to update another specialist\'s appointment', async () => {
    const farmer = await createUser('farmer')
    const spec1 = await makeApprovedSpecialist()
    const spec2 = await makeApprovedSpecialist()
    const appt = await Appointment.create({
      farmerId: farmer._id,
      specialistId: spec1._id,
      title: 'Not yours',
    })
    const res = await request(app)
      .patch(`${BASE}/${appt._id}/status`)
      .set('Authorization', authHeader(spec2))
      .send({ status: 'confirmed' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /appointments/:id', () => {
  it('farmer deletes a pending appointment', async () => {
    const farmer = await createUser('farmer')
    const specialist = await makeApprovedSpecialist()
    const appt = await Appointment.create({
      farmerId: farmer._id,
      specialistId: specialist._id,
      title: 'To delete',
    })
    const res = await request(app)
      .delete(`${BASE}/${appt._id}`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('returns 404 for non-pending appointment', async () => {
    const farmer = await createUser('farmer')
    const specialist = await makeApprovedSpecialist()
    const appt = await Appointment.create({
      farmerId: farmer._id,
      specialistId: specialist._id,
      title: 'Confirmed',
      status: 'confirmed',
    })
    const res = await request(app)
      .delete(`${BASE}/${appt._id}`)
      .set('Authorization', authHeader(farmer))
    expect(res.status).toBe(404)
  })
})
