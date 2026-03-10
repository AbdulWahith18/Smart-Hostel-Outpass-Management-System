import mongoose from 'mongoose'

const analyticsSnapshotSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global',
      trim: true,
    },
    insights: {
      type: [String],
      default: [],
    },
    summaryText: {
      type: String,
      default: '',
      trim: true,
    },
    analyticsData: {
      type: Object,
      default: {},
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

const AnalyticsSnapshot = mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema)

export default AnalyticsSnapshot