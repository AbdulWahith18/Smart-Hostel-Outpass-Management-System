import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    senderType: {
      type: String,
      enum: ['Student', 'RC', 'Admin'],
      required: true,
      trim: true,
    },
    senderName: {
      type: String,
      default: '',
      trim: true,
    },
    senderEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    senderUsername: {
      type: String,
      default: '',
      trim: true,
    },
    recipientType: {
      type: String,
      enum: ['Student', 'RC', 'Admin'],
      required: true,
      trim: true,
    },
    recipientName: {
      type: String,
      default: '',
      trim: true,
    },
    recipientEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    recipientUsername: {
      type: String,
      default: '',
      trim: true,
    },
    subject: {
      type: String,
      default: '',
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    relatedStudentEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    isBroadcast: {
      type: Boolean,
      default: false,
    },
    chatScope: {
      type: String,
      enum: ['students-rcs', 'private-admin'],
      default: 'students-rcs',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

const Message = mongoose.model('Message', messageSchema)

export default Message
