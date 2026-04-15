import mongoose from 'mongoose'

export const DISCOVERY_KIND_VALUES = ['research', 'alert', 'policy', 'general']

const discoveryArticleSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: DISCOVERY_KIND_VALUES,
      default: 'general',
      index: true,
    },
    tags: [{ type: String, trim: true }],
    hiddenByAdmin: { type: Boolean, default: false },
    moderationNote: { type: String, trim: true, default: '' },
    likeCount: { type: Number, default: 0 },
    dislikeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

discoveryArticleSchema.index({ createdAt: -1 })
discoveryArticleSchema.index({ kind: 1, createdAt: -1 })

export const DiscoveryArticle = mongoose.model('DiscoveryArticle', discoveryArticleSchema)
