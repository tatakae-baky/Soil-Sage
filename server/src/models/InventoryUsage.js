import mongoose from 'mongoose'

const inventoryUsageSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
      index: true,
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Negative for consumption, positive for restock */
    delta: { type: Number, required: true },
    reason: { type: String, trim: true, default: '' },
    quantityAfter: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
)

inventoryUsageSchema.index({ itemId: 1, createdAt: -1 })

export const InventoryUsage = mongoose.model('InventoryUsage', inventoryUsageSchema)
