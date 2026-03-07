import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

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

  return {
    statusCode: 500,
    message: fallbackMessage,
    error: error.message,
  }
}

const buildToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      userType: user.userType,
      email: user.email,
    },
    process.env.JWT_SECRET || 'change_this_jwt_secret',
    { expiresIn: '7d' }
  )

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
      const existingRc = await User.findOne({ userType: 'RC', username: normalizedAuthorizedRc })

      if (!existingRc) {
        return res.status(400).json({ message: 'Selected authorized RC does not exist.' })
      }
    }

    const duplicateUser = await User.findOne({
      userType: normalizedUserType,
      email: normalizedEmail,
    })

    if (duplicateUser) {
      return res.status(409).json({
        message: 'An account with this email already exists for the selected user type.',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      userType: normalizedUserType,
      username: normalizedUsername,
      email: normalizedEmail,
      mobileNo: normalizedMobile,
      password: hashedPassword,
      authorizedRc: normalizedUserType === 'Student' ? normalizedAuthorizedRc : '',
    })

    return res.status(201).json({
      message: 'Account created successfully.',
      user: {
        id: user._id,
        userType: user.userType,
        username: user.username,
        email: user.email,
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

    const isPasswordMatch = await bcrypt.compare(password, user.password)

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid login details.' })
    }

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
      },
    })
  } catch (error) {
    const authError = buildAuthErrorResponse(error, 'Failed to login.')
    return res.status(authError.statusCode).json({ message: authError.message, error: authError.error })
  }
}

export const listRcUsers = async (_req, res) => {
  try {
    const rcUsers = await User.find({ userType: 'RC' }).select('username -_id').sort({ username: 1 })
    return res.status(200).json({ rcUsers: rcUsers.map((user) => user.username) })
  } catch (error) {
    const authError = buildAuthErrorResponse(error, 'Failed to fetch RC users.')
    return res.status(authError.statusCode).json({ message: authError.message, error: authError.error })
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { identifier = '', newPassword = '', confirmPassword = '' } = req.body
    const normalizedIdentifier = identifier.trim()

    if (!normalizedIdentifier || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Username/email and both password fields are required.' })
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

    const isEmail = normalizedIdentifier.includes('@')
    const user = await User.findOne(
      isEmail
        ? { email: normalizedIdentifier.toLowerCase() }
        : { username: new RegExp(`^${normalizedIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    )

    if (!user) {
      return res.status(404).json({ message: 'No account found for the provided username/email.' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    await user.save()

    return res.status(200).json({ message: 'Password reset successful. Please login with your new password.' })
  } catch (error) {
    const authError = buildAuthErrorResponse(error, 'Failed to reset password.')
    return res.status(authError.statusCode).json({ message: authError.message, error: authError.error })
  }
}
