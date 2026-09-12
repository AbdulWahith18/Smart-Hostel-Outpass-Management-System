import mongoose from 'mongoose'

const slotSchema = new mongoose.Schema(
  {
    slotNumber: { type: Number, required: true },
    slotCode: { type: String, required: true },
    isBooked: { type: Boolean, default: false },
    bookedBy: {
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      studentName: { type: String },
      studentEmail: { type: String },
      registerNo: { type: String },
      department: { type: String },
      year: { type: String },
      bookedAt: { type: Date },
    },
  },
  { _id: false }
)

const hostelRoomSchema = new mongoose.Schema(
  {
    allocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostelAllocation',
      required: true,
      index: true,
    },
    blockNumber: { type: Number, required: true },
    blockName: { type: String, required: true },
    floorNumber: { type: Number, required: true },
    roomNumber: { type: String, required: true },
    isRcRoom: { type: Boolean, default: false },
    capacity: { type: Number, required: true, default: 4 },
    occupiedCount: { type: Number, default: 0 },
    slots: [slotSchema],
  },
  {
    timestamps: true,
  }
)

hostelRoomSchema.index({ allocationId: 1, roomNumber: 1 }, { unique: true })
hostelRoomSchema.index({ allocationId: 1, blockNumber: 1, floorNumber: 1 })

export default mongoose.model('HostelRoom', hostelRoomSchema)
