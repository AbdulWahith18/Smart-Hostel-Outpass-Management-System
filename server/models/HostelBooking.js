import mongoose from 'mongoose'

const hostelBookingSchema = new mongoose.Schema(
  {
    allocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostelAllocation',
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostelRoom',
      required: true,
    },
    roomNumber: { type: String, required: true },
    blockNumber: { type: Number, required: true },
    floorNumber: { type: Number, required: true },
    slotNumber: { type: Number, required: true },
    slotCode: { type: String, required: true },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true, lowercase: true, trim: true },
    registerNo: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },
    year: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['active', 'cancelled'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

hostelBookingSchema.index({ allocationId: 1, studentId: 1, status: 1 }, { unique: true })
hostelBookingSchema.index({ allocationId: 1, roomId: 1, slotNumber: 1, status: 1 }, { unique: true })

export default mongoose.model('HostelBooking', hostelBookingSchema)
