import mongoose from 'mongoose'

const landSchema = new mongoose.Schema(
  {
    /** Land owner user id */
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    /** Size description or numeric string (hectares, acres, etc.) */
    size: { type: String, trim: true, default: '' },
    soilCondition: { type: String, trim: true, default: '' },
    cropType: { type: String, trim: true, default: '' },
    /** GeoJSON Point for geospatial queries (lng, lat) */
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
    availableForRent: { type: Boolean, default: false },
    /** Soft visibility without deleting record */
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

landSchema.index({ location: '2dsphere' })
landSchema.index({ ownerId: 1, createdAt: -1 })

export const Land = mongoose.model('Land', landSchema)
