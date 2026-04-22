import {
  requireRoles,
  requireAdmin,
  requireApprovedSpecialist,
  requireApprovedLandOwner,
} from '../../../src/middleware/rbac.js'

function mockRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

function makeReq(user) {
  return { user }
}

describe('requireRoles', () => {
  it('calls next() when user has a matching role', () => {
    const req = makeReq({ roles: ['farmer'] })
    const next = jest.fn()
    requireRoles('farmer')(req, mockRes(), next)
    expect(next).toHaveBeenCalled()
  })

  it('returns 403 when user lacks any matching role', () => {
    const req = makeReq({ roles: ['farmer'] })
    const res = mockRes()
    const next = jest.fn()
    requireRoles('admin')(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when req.user is undefined', () => {
    const req = makeReq(undefined)
    const res = mockRes()
    const next = jest.fn()
    requireRoles('farmer')(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('passes when user has at least one of multiple allowed roles', () => {
    const req = makeReq({ roles: ['specialist'] })
    const next = jest.fn()
    requireRoles('farmer', 'specialist')(req, mockRes(), next)
    expect(next).toHaveBeenCalled()
  })
})

describe('requireAdmin', () => {
  it('calls next() for admin user', () => {
    const req = makeReq({ roles: ['admin'] })
    const next = jest.fn()
    requireAdmin(req, mockRes(), next)
    expect(next).toHaveBeenCalled()
  })

  it('returns 403 for non-admin user', () => {
    const req = makeReq({ roles: ['farmer'] })
    const res = mockRes()
    requireAdmin(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(403)
  })
})

describe('requireApprovedSpecialist', () => {
  it('calls next() for approved specialist', () => {
    const req = makeReq({ roles: ['specialist'], specialistApproval: 'approved' })
    const next = jest.fn()
    requireApprovedSpecialist(req, mockRes(), next)
    expect(next).toHaveBeenCalled()
  })

  it('returns 403 for pending specialist', () => {
    const req = makeReq({ roles: ['specialist'], specialistApproval: 'pending' })
    const res = mockRes()
    requireApprovedSpecialist(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('returns 403 for farmer (wrong role)', () => {
    const req = makeReq({ roles: ['farmer'], specialistApproval: 'not_applicable' })
    const res = mockRes()
    requireApprovedSpecialist(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('returns 401 when no user', () => {
    const req = makeReq(undefined)
    const res = mockRes()
    requireApprovedSpecialist(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(401)
  })
})

describe('requireApprovedLandOwner', () => {
  it('calls next() for approved land_owner', () => {
    const req = makeReq({ roles: ['land_owner'], landOwnerApproval: 'approved' })
    const next = jest.fn()
    requireApprovedLandOwner(req, mockRes(), next)
    expect(next).toHaveBeenCalled()
  })

  it('returns 403 for pending land_owner', () => {
    const req = makeReq({ roles: ['land_owner'], landOwnerApproval: 'pending' })
    const res = mockRes()
    requireApprovedLandOwner(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('returns 401 when no user', () => {
    const req = makeReq(undefined)
    const res = mockRes()
    requireApprovedLandOwner(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(401)
  })
})
