import mongoose from 'mongoose'

const specialistReviewSchema = new mongoose.Schema(
  {
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    specialistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    body: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

/** One review per reviewer-specialist pair */
specialistReviewSchema.index({ reviewerId: 1, specialistId: 1 }, { unique: true })
specialistReviewSchema.index({ specialistId: 1, createdAt: -1 })

export const SpecialistReview = mongoose.model('SpecialistReview', specialistReviewSchema)
