import mongoose from 'mongoose'

const recommendedCropSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    reasoning: { type: String, default: '' },
    careNotes: { type: String, default: '' },
  },
  { _id: false }
)

const cropRecommendationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    landId: { type: mongoose.Schema.Types.ObjectId, ref: 'Land', default: null },
    /** Input context */
    cropType: { type: String, default: '' },
    soilType: { type: String, default: '' },
    region: { type: String, default: '' },
    season: { type: String, default: '' },
    notes: { type: String, default: '' },
    /** Gemini output */
    recommendedCrops: { type: [recommendedCropSchema], default: [] },
    rotationAdvice: { type: String, default: '' },
    seasonalTips: { type: String, default: '' },
    generalNotes: { type: String, default: '' },
    disclaimer: { type: String, default: '' },
    model: { type: String, default: '' },
  },
  { timestamps: true }
)

cropRecommendationSchema.index({ userId: 1, createdAt: -1 })

export const CropRecommendation = mongoose.model('CropRecommendation', cropRecommendationSchema)
