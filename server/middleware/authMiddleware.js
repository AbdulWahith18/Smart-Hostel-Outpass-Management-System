import jwt from 'jsonwebtoken'

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

export const requireAdmin = (req, res, next) => {
  if (req.user?.userType !== 'Admin') {
    return res.status(403).json({ message: 'Admin access only.' })
  }

  return next()
}
