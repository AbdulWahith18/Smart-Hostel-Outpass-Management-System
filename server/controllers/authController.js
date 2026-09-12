import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { sendMail } from '../utils/sendMail.js'

const OTP_EXPIRY_MINUTES = 10

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const findUserByIdentifier = async (identifier) => {
  const normalizedIdentifier = identifier.trim()
  const isEmail = normalizedIdentifier.includes('@')

  return User.findOne(
    isEmail
      ? { email: normalizedIdentifier.toLowerCase() }
      : { username: new RegExp(`^${escapeRegex(normalizedIdentifier)}$`, 'i') }
  )
}

const sendPasswordResetOtpEmail = async ({ to, otp }) => {
  await sendMail(to, 'Password Reset OTP', `Your password reset OTP is ${otp}. It is valid for ${OTP_EXPIRY_MINUTES} minutes.`)
}

const isDatabaseConnectionError = (error) => {
  const message = error?.message?.toLowerCase?.() ?? ''

  return (
    message.includes('etimedout') ||
    message.includes('server selection timed out') ||
    message.includes('econnrefused') ||
    message.includes('querysrv') ||
    message.includes('topology')
  )
}

const buildAuthErrorResponse = (error, fallbackMessage) => {
  if (isDatabaseConnectionError(error)) {
    return {
      statusCode: 503,
      message: 'Database connection issue. Please try again in a moment.',
      error: error.message,
    }
  }

  if (error?.code === 11000) {
    return {
      statusCode: 409,
      message: 'An account with this email already exists.',
      error: error.message,
    }
  }

  return {
    statusCode: 500,
    message: fallbackMessage,
    error: error.message,
  }
}

const buildToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    {
      id: user._id,
      _id: user._id,
      userType: user.userType,
      username: user.username,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const registerUser = async (req, res) => {
  try {
    const {
      userType = '',
      username = '',
      email = '',
      mobileNo = '',
      password = '',
      authorizedRc = '',
    } = req.body

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedUserType = userType.trim()
    const normalizedUsername = username.trim()
    const normalizedMobile = mobileNo.trim()
    const normalizedAuthorizedRc = authorizedRc.trim()

    if (!normalizedUserType || !normalizedUsername || !normalizedEmail || !normalizedMobile || !password) {
      return res.status(400).json({ message: 'All required fields must be provided.' })
    }

    if (!['Student', 'RC'].includes(normalizedUserType)) {
      return res.status(400).json({ message: 'Invalid user type.' })
    }

    if (!/^[0-9]{10}$/.test(normalizedMobile)) {
      return res.status(400).json({ message: 'Mobile number must be exactly 10 digits.' })
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,12}$/.test(password)) {
      return res.status(400).json({
        message:
          'Password must be 8-12 characters and include uppercase, lowercase, a number, and a special character.',
      })
    }

    if (normalizedUserType === 'Student' && !normalizedAuthorizedRc) {
      return res.status(400).json({ message: 'Authorized RC is required for students.' })
    }

    if (normalizedUserType === 'Student') {
      const existingRc = await User.findOne({ userType: 'RC', username: normalizedAuthorizedRc, status: 'active' })

      if (!existingRc) {
        return res.status(400).json({ message: 'Selected authorized RC does not exist or is not active.' })
      }
    }

    const existingUserWithEmail = await User.findOne({ email: normalizedEmail })

    if (existingUserWithEmail) {
      if (existingUserWithEmail.userType === 'RC' && existingUserWithEmail.status === 'pending') {
        return res.status(409).json({ message: 'An RC registration using this email is already pending admin approval.' })
      }

      if (existingUserWithEmail.userType === 'RC' && existingUserWithEmail.status === 'rejected') {
        return res.status(409).json({ message: 'An RC registration using this email has been rejected by the administrator.' })
      }

      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const initialStatus = normalizedUserType === 'RC' ? 'pending' : 'active'

    const user = await User.create({
      userType: normalizedUserType,
      username: normalizedUsername,
      email: normalizedEmail,
      mobileNo: normalizedMobile,
      password: hashedPassword,
      authorizedRc: normalizedUserType === 'Student' ? normalizedAuthorizedRc : '',
      status: initialStatus,
    })

    if (normalizedUserType === 'RC') {
      const io = req.app.get('io')
      if (io) {
        io.to('admin:all').emit('rc:pending_new', user)
      }
      return res.status(201).json({
        message: 'Registration submitted successfully! Your RC account is pending admin approval.',
        status: 'pending',
        user: {
          id: user._id,
          userType: user.userType,
          username: user.username,
          email: user.email,
          status: user.status,
        },
      })
    }

    return res.status(201).json({
      message: 'Account created successfully.',
      status: 'active',
      user: {
        id: user._id,
        userType: user.userType,
        username: user.username,
        email: user.email,
        status: user.status,
      },
    })
  } catch (error) {
    const authError = buildAuthErrorResponse(error, 'Failed to register user.')
    return res.status(authError.statusCode).json({ message: authError.message, error: authError.error })
  }
}

export const loginUser = async (req, res) => {
  try {
    const { userType = '', email = '', password = '' } = req.body

    if (!userType || !email || !password) {
      return res.status(400).json({ message: 'User type, email, and password are required.' })
    }

    const user = await User.findOne({
      userType: userType.trim(),
      email: email.trim().toLowerCase(),
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid login details.' })
    }

    if (user.status === 'pending') {
      return res.status(403).json({ message: 'Your RC registration is pending admin approval.' })
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ message: 'Your RC registration has been rejected by the administrator.' })
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact admin.' })
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password)

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid login details.' })
    }

    user.lastLogin = new Date()
    await user.save()

    const token = buildToken(user)

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        userType: user.userType,
        username: user.username,
        email: user.email,
        mobileNo: user.mobileNo,
        authorizedRc: user.authorizedRc,
        status: user.status,
        lastLogin: user.lastLogin,
      },
    })
  } catch (error) {
    const authError = buildAuthErrorResponse(error, 'Failed to login.')
    return res.status(authError.statusCode).json({ message: authError.message, error: authError.error })
  }
}

export const listRcUsers = async (_req, res) => {
  try {
    const rcUsers = await User.find({ userType: 'RC', status: 'active' }).select('username -_id').sort({ username: 1 })
    return res.status(200).json({ rcUsers: rcUsers.map((user) => user.username) })
  } catch (error) {
    const authError = buildAuthErrorResponse(error, 'Failed to fetch RC users.')
    return res.status(authError.statusCode).json({ message: authError.message, error: authError.error })
  }
}


export const resetPassword = async (req, res) => {
  try {
    const { identifier = '', email = '', otp = '', newPassword = '', confirmPassword = '' } = req.body
    const normalizedIdentifier = (identifier || email).trim()
    const normalizedOtp = String(otp).trim()

    if (!normalizedIdentifier || !normalizedOtp || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Username/email, OTP, and both password fields are required.' })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password must match.' })
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,12}$/.test(newPassword)) {
      return res.status(400).json({
        message:
          'Password must be 8-12 characters and include uppercase, lowercase, a number, and a special character.',
      })
    }

    const user = await findUserByIdentifier(normalizedIdentifier)

    if (!user) {
      return res.status(404).json({ message: 'No account found for the provided username/email.' })
    }

    if (!user.otp || user.otp !== normalizedOtp) {
      return res.status(400).json({ message: 'Invalid OTP.' })
    }

    if (!user.otpExpires || user.otpExpires.getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' })
    }

    if (!user.otpVerified) {
      return res.status(400).json({ message: 'Please verify OTP before resetting password.' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    user.otp = null
    user.otpExpires = null
    user.otpVerified = false
    user.passwordResetOtp = null
    user.passwordResetOtpExpiresAt = null
    user.passwordResetOtpVerified = false
    await user.save()

    return res.status(200).json({ message: 'Password reset successful. Please login with your new password.' })
  } catch (error) {
    const authError = buildAuthErrorResponse(error, 'Failed to reset password.')
    return res.status(authError.statusCode).json({ message: authError.message, error: authError.error })
  }
}

export const sendForgotPasswordOtp = async (req, res) => {
  console.log("🔥 SEND OTP ROUTE HIT", req.body)
  try {
    const { identifier = "", email = "" } = req.body
    const normalizedIdentifier = (identifier || email).trim()

    if (!normalizedIdentifier) {
      return res.status(400).json({ message: "Username/email is required." })
    }

    const user = await findUserByIdentifier(normalizedIdentifier)

    if (!user) {
      return res.status(404).json({
        message: "No account found for the provided username/email."
      })
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000))

    user.otp = otp
    user.otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
    user.otpVerified = false

    user.passwordResetOtp = otp
    user.passwordResetOtpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
    user.passwordResetOtpVerified = false

    await user.save()

    try {
      console.log("📧 Attempting to send OTP email to:", user.email)

      await sendPasswordResetOtpEmail({
        to: user.email,
        otp
      })

      console.log("✅ OTP email sent successfully")

    } catch (mailError) {

      console.error("❌ EMAIL ERROR:", mailError)

      user.otp = null
      user.otpExpires = null
      user.otpVerified = false

      user.passwordResetOtp = null
      user.passwordResetOtpExpiresAt = null
      user.passwordResetOtpVerified = false

      await user.save()

      return res.status(500).json({
        message: "Failed to send OTP email. Please try again.",
        error: mailError.message
      })
    }

    return res.status(200).json({
      message: "OTP sent to your registered email."
    })

  } catch (error) {

    console.error("❌ SEND OTP ERROR:", error)

    const authError = buildAuthErrorResponse(error, "Failed to send OTP.")

    return res.status(authError.statusCode).json({
      message: authError.message,
      error: authError.error
    })
  }
}

export const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { identifier = "", email = "", otp = "" } = req.body

    const normalizedIdentifier = (identifier || email).trim()
    const normalizedOtp = String(otp).trim()

    if (!normalizedIdentifier || !normalizedOtp) {
      return res.status(400).json({
        message: "Username/email and OTP are required."
      })
    }

    const user = await findUserByIdentifier(normalizedIdentifier)

    if (!user) {
      return res.status(404).json({
        message: "No account found for the provided username/email."
      })
    }

    if (!user.otp || user.otp !== normalizedOtp) {
      return res.status(400).json({
        message: "Invalid OTP."
      })
    }

    if (!user.otpExpires || user.otpExpires.getTime() < Date.now()) {
      return res.status(400).json({
        message: "OTP has expired. Please request a new OTP."
      })
    }

    user.otpVerified = true
    user.passwordResetOtpVerified = true

    await user.save()

    return res.status(200).json({
      message: "OTP verified successfully."
    })

  } catch (error) {

    console.error("❌ VERIFY OTP ERROR:", error)

    const authError = buildAuthErrorResponse(error, "Failed to verify OTP.")

    return res.status(authError.statusCode).json({
      message: authError.message,
      error: authError.error
    })
  }
}
