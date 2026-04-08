import mongoose from 'mongoose'

const postSchema = new mongoose.Schema(
  {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    body: { type: String, required: true, trim: true },
    mediaUrls: [{ type: String }],
    editedAt: { type: Date, default: null },
    /** Soft delete by author */
    deletedAt: { type: Date, default: null },
    /** Admin moderation: hide from feed without deleting row */
    hiddenByAdmin: { type: Boolean, default: false },
    moderationNote: { type: String, trim: true, default: '' },
    /** Denormalized counters for list views */
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

postSchema.index({ communityId: 1, createdAt: -1 })
postSchema.index({ authorId: 1, createdAt: -1 })

export const Post = mongoose.model('Post', postSchema)
