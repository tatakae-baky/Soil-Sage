import mongoose from 'mongoose'

const appointmentSchema = new mongoose.Schema(
  {
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    specialistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 200 },
    notes: { type: String, default: '', maxlength: 2000 },
    requestedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    specialistNote: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true }
)

appointmentSchema.index({ farmerId: 1, createdAt: -1 })
appointmentSchema.index({ specialistId: 1, createdAt: -1 })

export const Appointment = mongoose.model('Appointment', appointmentSchema)
