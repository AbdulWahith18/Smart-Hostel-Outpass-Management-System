import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || ''

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token is required.' })
  }

  const token = authHeader.slice(7)

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change_this_jwt_secret')
    req.user = payload
    return next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

const normalizeRole = (value) => value?.toString().trim().toLowerCase() || ''

const getNormalizedRoleFromUser = (user) => normalizeRole(user?.userType || user?.role)

export const requireAdmin = async (req, res, next) => {
  const tokenRole = getNormalizedRoleFromUser(req.user)
  if (tokenRole === 'admin') {
    return next()
  }

  if (req.user?.id) {
    try {
      const authenticatedUser = await User.findById(req.user.id).select('userType status')
      if (authenticatedUser && normalizeRole(authenticatedUser.userType) === 'admin') {
        if (authenticatedUser.status === 'inactive') {
          return res.status(403).json({ message: 'Your account has been deactivated. Contact admin.' })
        }

        return next()
      }
    } catch {
      return res.status(500).json({ message: 'Failed to validate admin access.' })
    }
  }

  return res.status(403).json({ message: 'Admin access only.' })
}

export const requireAdminOrRc = async (req, res, next) => {
  const tokenRole = getNormalizedRoleFromUser(req.user)
  if (tokenRole === 'admin' || tokenRole === 'rc') {
    return next()
  }

  if (req.user?.id) {
    try {
      const authenticatedUser = await User.findById(req.user.id).select('userType status')
      const dbRole = normalizeRole(authenticatedUser?.userType)

      if (dbRole === 'admin' || dbRole === 'rc') {
        if (authenticatedUser.status === 'inactive') {
          return res.status(403).json({ message: 'Your account has been deactivated. Contact admin.' })
        }

        return next()
      }
    } catch {
      return res.status(500).json({ message: 'Failed to validate user access.' })
    }
  }

  return res.status(403).json({ message: 'Admin or RC access only.' })
}
