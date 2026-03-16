import mongoose from 'mongoose'

const passRequestSchema = new mongoose.Schema(
  {
    studentEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    studentUsername: {
      type: String,
      required: true,
      trim: true,
    },
    authorizedRc: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    registerNo: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    hostelBlockNo: {
      type: String,
      required: true,
      trim: true,
    },
    roomNo: {
      type: String,
      required: true,
      trim: true,
    },
    appliedOn: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    leaveDateTime: {
      type: String,
      required: true,
      trim: true,
    },
    returnDateTime: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNo: {
      type: String,
      required: true,
      trim: true,
    },
    guardianPhoneNo: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedAt: {
      type: String,
      default: '',
      trim: true,
    },
    rejectedBy: {
      type: String,
      default: '',
      trim: true,
    },
    rejectedAt: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

const PassRequest = mongoose.model('PassRequest', passRequestSchema)

export default PassRequest
