import mongoose from 'mongoose'

/** @typedef {'farmer' | 'land_owner' | 'specialist' | 'admin'} UserRole */

const ROLE_VALUES = ['farmer', 'land_owner', 'specialist', 'admin']
const APPROVAL_VALUES = ['not_applicable', 'pending', 'approved', 'rejected']

const userSchema = new mongoose.Schema(
  {
    /** Public-facing display name */
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true, select: false },
    /**
     * Multiple roles: farmers may also be land owners once approved.
     * Admin is typically seeded or promoted manually.
     */
    roles: {
      type: [{ type: String, enum: ROLE_VALUES }],
      default: ['farmer'],
    },
    /** Land owners need admin approval before rental listing features (per FR). */
    landOwnerApproval: {
      type: String,
      enum: APPROVAL_VALUES,
      default: 'not_applicable',
    },
    /** Specialists need admin approval before consultation features. */
    specialistApproval: {
      type: String,
      enum: APPROVAL_VALUES,
      default: 'not_applicable',
    },
    profilePhotoUrl: { type: String, default: '' },
    /** Bangla / English per functional requirements */
    languagePreference: {
      type: String,
      enum: ['en', 'bn'],
      default: 'en',
    },
    /** Farmer profile extras */
    farmLandSize: { type: String, default: '' },
    farmSoilType: { type: String, default: '' },
    farmCropCategory: { type: String, default: '' },
  },
  { timestamps: true }
)

export const User = mongoose.model('User', userSchema)
export { ROLE_VALUES, APPROVAL_VALUES }
