import mongoose from 'mongoose'

/**
 * Persisted soil/crop AI assessment: structured JSON from the model, no raw image blobs (v1).
 */
const diagnosisSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Optional context land — must belong to the same farmer when set */
    landId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Land',
      default: null,
    },
    notes: { type: String, trim: true, default: '' },
    /** Parsed LLM output (Zod-validated object from Gemini JSON mode) */
    result: { type: mongoose.Schema.Types.Mixed, required: true },
    /** Model id used for this run (audit / reproducibility) */
    model: { type: String, required: true, trim: true },
    /** Legal / agronomy disclaimer shown with every result */
    disclaimer: { type: String, required: true, trim: true },
  },
  { timestamps: true }
)

diagnosisSchema.index({ farmerId: 1, createdAt: -1 })

export const Diagnosis = mongoose.model('Diagnosis', diagnosisSchema)
