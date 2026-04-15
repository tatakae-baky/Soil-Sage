import mongoose from 'mongoose'

const discoveryReactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiscoveryArticle',
      required: true,
      index: true,
    },
    /** One vote per user per article — flip updates counts on the article */
    kind: { type: String, enum: ['like', 'dislike'], required: true },
  },
  { timestamps: true }
)

discoveryReactionSchema.index({ userId: 1, articleId: 1 }, { unique: true })

export const DiscoveryReaction = mongoose.model('DiscoveryReaction', discoveryReactionSchema)
