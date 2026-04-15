import mongoose from 'mongoose'

const discoveryCommentSchema = new mongoose.Schema(
  {
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiscoveryArticle',
      required: true,
      index: true,
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiscoveryComment',
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

discoveryCommentSchema.index({ articleId: 1, createdAt: 1 })

export const DiscoveryComment = mongoose.model('DiscoveryComment', discoveryCommentSchema)
