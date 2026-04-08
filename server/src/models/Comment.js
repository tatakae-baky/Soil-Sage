import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    /** Null for top-level comments; set for replies */
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    body: { type: String, required: true, trim: true },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    hiddenByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
)

commentSchema.index({ postId: 1, createdAt: 1 })

export const Comment = mongoose.model('Comment', commentSchema)
