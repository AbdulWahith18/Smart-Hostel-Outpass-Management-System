import mongoose from 'mongoose'

const blockConfigSchema = new mongoose.Schema(
  {
    blockNumber: { type: Number, required: true },
    blockName: { type: String, required: true },
    floorCount: { type: Number, required: true, min: 1 },
    roomsPerFloor: { type: Number, required: true, min: 1 },
    studentsPerRoom: { type: Number, required: true, min: 1 },
    totalStudentRooms: { type: Number, required: true },
    totalStudentCapacity: { type: Number, required: true },
  },
  { _id: false }
)

const hostelAllocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft',
      index: true,
    },
    blocks: [blockConfigSchema],
    totalBlocks: { type: Number, required: true },
    totalRooms: { type: Number, required: true },
    totalCapacity: { type: Number, required: true },
    occupiedCount: { type: Number, default: 0 },
    publishedAt: { type: Date },
    closedAt: { type: Date },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model('HostelAllocation', hostelAllocationSchema)
