import mongoose from 'mongoose'

const STATUS = ['pending', 'approved', 'rejected']

const rentalRequestSchema = new mongoose.Schema(
  {
    landId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Land',
      required: true,
      index: true,
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: STATUS,
      default: 'pending',
    },
    message: { type: String, trim: true, default: '' },
    /** Optional agreement text or URL for digital record */
    agreementNote: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

rentalRequestSchema.index({ landId: 1, status: 1 })
rentalRequestSchema.index({ requesterId: 1, createdAt: -1 })
rentalRequestSchema.index({ ownerId: 1, createdAt: -1 })

export const RentalRequest = mongoose.model('RentalRequest', rentalRequestSchema)
export { STATUS as RENTAL_STATUS }
