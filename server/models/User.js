import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      enum: ['Student', 'RC', 'Admin'],
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    mobileNo: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    authorizedRc: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    otpVerified: {
      type: Boolean,
      default: false,
    },
    passwordResetOtp: {
      type: String,
      default: null,
    },
    passwordResetOtpExpiresAt: {
      type: Date,
      default: null,
    },
    passwordResetOtpVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

userSchema.index({ userType: 1, email: 1 }, { unique: true })

const User = mongoose.model('User', userSchema)

export default User
