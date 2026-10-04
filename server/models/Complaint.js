import mongoose from 'mongoose'

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedBy: { type: String, required: true },
    changedByRole: { type: String, required: true },
    note: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
)

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    complainantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    complainantName: {
      type: String,
      required: true,
      trim: true,
    },
    complainantEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    complainantRole: {
      type: String,
      enum: ['Student', 'RC'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'Food / Mess',
        'Cleaning / Hygiene',
        'Room Maintenance',
        'Fan / Electrical',
        'Plumbing / Water',
        'Furniture',
        'Washroom',
        'Wi-Fi / Network',
        'Hostel Infrastructure',
        'Security',
        'Common Area',
        'Other',
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    block: {
      type: String,
      default: '-',
      trim: true,
    },
    floor: {
      type: String,
      default: '-',
      trim: true,
    },
    room: {
      type: String,
      default: '-',
      trim: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'],
      default: 'OPEN',
      index: true,
    },
    adminResponse: {
      type: String,
      default: '',
      trim: true,
    },
    adminRespondedBy: {
      type: String,
      default: null,
    },
    adminRespondedAt: {
      type: Date,
      default: null,
    },
    statusHistory: [statusHistorySchema],
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model('Complaint', complaintSchema)
