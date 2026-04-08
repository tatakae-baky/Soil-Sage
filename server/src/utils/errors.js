/**
 * Consistent API error payload for Zod and Mongoose.
 */
export function sendError(res, status, message, details) {
  const body = { error: message }
  if (details !== undefined) body.details = details
  return res.status(status).json(body)
}
