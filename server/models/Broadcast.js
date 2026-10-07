import mongoose from 'mongoose'

const broadcastSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    content: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      required: true,
      enum: [
        'General',
        'Hostel Allocation',
        'Important',
        'Deadline',
        'Maintenance',
        'Event',
        'Academic',
        'Other',
      ],
      default: 'General',
      index: true,
    },
    priority: {
      type: String,
      required: true,
      enum: ['Normal', 'Important', 'Urgent'],
      default: 'Normal',
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED', 'UNPUBLISHED'],
      default: 'DRAFT',
      index: true,
    },
    publishAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// Compound index for efficient public query: active published broadcasts
broadcastSchema.index({ status: 1, publishAt: 1, expiresAt: 1, isPinned: -1, createdAt: -1 })

export default mongoose.model('Broadcast', broadcastSchema)
