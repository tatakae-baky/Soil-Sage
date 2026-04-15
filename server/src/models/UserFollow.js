import mongoose from 'mongoose'

/**
 * Directed follow edge: `followerId` subscribed to updates from `followingId`.
 * One row per pair — unique compound index enforces idempotency.
 */
const userFollowSchema = new mongoose.Schema(
  {
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    followingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
)

userFollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true })

export const UserFollow = mongoose.model('UserFollow', userFollowSchema)
