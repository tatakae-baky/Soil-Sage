import { Notification } from '../models/Notification.js'

/**
 * Creates an in-app notification for a user.
 */
export async function createNotification({
  userId,
  type,
  title,
  body = '',
  relatedId = null,
  relatedType = '',
}) {
  return Notification.create({
    userId,
    type,
    title,
    body,
    relatedId,
    relatedType,
  })
}
