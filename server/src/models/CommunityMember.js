import mongoose from 'mongoose'

const communityMemberSchema = new mongoose.Schema(
  {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Optional role inside the community (e.g. moderator later) */
    memberRole: { type: String, enum: ['member', 'moderator'], default: 'member' },
  },
  { timestamps: true }
)

communityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true })

export const CommunityMember = mongoose.model('CommunityMember', communityMemberSchema)
