import { asyncHandler } from '../../../src/utils/asyncHandler.js'

describe('asyncHandler', () => {
  it('calls the wrapped function with (req, res, next)', async () => {
    const fn = jest.fn().mockResolvedValue(undefined)
    const handler = asyncHandler(fn)
    const req = {}
    const res = {}
    const next = jest.fn()

    await handler(req, res, next)

    expect(fn).toHaveBeenCalledWith(req, res, next)
    expect(next).not.toHaveBeenCalled()
  })

  it('forwards rejected promise to next(err)', async () => {
    const error = new Error('something went wrong')
    const fn = jest.fn().mockRejectedValue(error)
    const handler = asyncHandler(fn)
    const next = jest.fn()

    await handler({}, {}, next)

    expect(next).toHaveBeenCalledWith(error)
  })

  it('does not swallow sync throws (Promise.resolve catches them)', async () => {
    const error = new Error('sync throw')
    const fn = jest.fn().mockImplementation(() => {
      return Promise.reject(error)
    })
    const handler = asyncHandler(fn)
    const next = jest.fn()

    await handler({}, {}, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})
