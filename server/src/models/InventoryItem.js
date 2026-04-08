import mongoose from 'mongoose'

const CATEGORY = ['crop', 'seed', 'fertilizer', 'pesticide', 'tool']

const inventoryItemSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: { type: String, enum: CATEGORY, required: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

inventoryItemSchema.index({ farmerId: 1, category: 1, name: 1 })

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema)
export { CATEGORY as INVENTORY_CATEGORY }
