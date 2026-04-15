import mongoose from 'mongoose'

/** Allowed tags for filtering nearby agronomic businesses / extension offices */
export const PROVIDER_CATEGORY_VALUES = [
  'seeds',
  'fertilizer',
  'pesticide',
  'tools',
  'extension',
  'general',
]

const solutionProviderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    /** One or more categories for map filters (e.g. seeds, fertilizer) */
    categories: {
      type: [{ type: String, enum: PROVIDER_CATEGORY_VALUES }],
      default: ['general'],
    },
    /** GeoJSON Point — same pattern as Land for `$near` queries */
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: (v) => Array.isArray(v) && v.length === 2,
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

solutionProviderSchema.index({ location: '2dsphere' })
solutionProviderSchema.index({ isActive: 1, createdAt: -1 })

export const SolutionProvider = mongoose.model('SolutionProvider', solutionProviderSchema)
