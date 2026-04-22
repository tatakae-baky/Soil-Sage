import { sendError } from '../../../src/utils/errors.js'

function makeMockRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('sendError', () => {
  it('sets the status code and returns { error } JSON', () => {
    const res = makeMockRes()
    sendError(res, 404, 'Not found')
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found' })
  })

  it('includes details when provided', () => {
    const res = makeMockRes()
    const details = { fieldErrors: { email: ['Invalid email'] } }
    sendError(res, 400, 'Validation failed', details)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      details,
    })
  })

  it('omits details key when details is undefined', () => {
    const res = makeMockRes()
    sendError(res, 500, 'Internal server error')
    const call = res.json.mock.calls[0][0]
    expect(call).not.toHaveProperty('details')
  })
})
