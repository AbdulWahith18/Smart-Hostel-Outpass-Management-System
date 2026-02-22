import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      enum: ['Student', 'RC'],
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
  },
  {
    timestamps: true,
  }
)

userSchema.index({ userType: 1, email: 1 }, { unique: true })

const User = mongoose.model('User', userSchema)

export default User
