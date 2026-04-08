import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
    read: { type: Boolean, default: false },
    /** Optional related entity id (rental, post, etc.) */
    relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
    relatedType: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 })

export const Notification = mongoose.model('Notification', notificationSchema)
