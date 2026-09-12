import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import { Server as SocketIOServer } from 'socket.io'
import authRoutes from './server/routes/authRoutes.js'
import passRequestRoutes from './server/routes/passRequestRoutes.js'
import adminRoutes from './server/routes/adminRoutes.js'
import analyticsRoutes from './server/routes/analyticsRoutes.js'
import aiRoutes from './server/routes/aiRoutes.js'
import messageRoutes from './server/routes/messageRoutes.js'
import { sendMail } from './server/utils/sendMail.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)
const port = process.env.PORT || 5000
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
].filter(Boolean)

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
})

app.set('io', io)

io.on('connection', (socket) => {
  socket.on('student:join', ({ studentEmail = '' } = {}) => {
    const normalizedEmail = studentEmail.toString().trim().toLowerCase()
    if (!normalizedEmail) {
      return
    }

    socket.join(`student:${normalizedEmail}`)
    socket.join('group:students-rcs')
  })

  socket.on('student:leave', ({ studentEmail = '' } = {}) => {
    const normalizedEmail = studentEmail.toString().trim().toLowerCase()
    if (!normalizedEmail) {
      return
    }

    socket.leave(`student:${normalizedEmail}`)
  })

  socket.on('rc:join', ({ rcUsername = '' } = {}) => {
    const normalizedUsername = rcUsername.toString().trim()
    if (!normalizedUsername) {
      return
    }

    socket.join(`rc:${normalizedUsername}`)
    socket.join('group:students-rcs')
  })

  socket.on('rc:leave', ({ rcUsername = '' } = {}) => {
    const normalizedUsername = rcUsername.toString().trim()
    if (!normalizedUsername) {
      return
    }

    socket.leave(`rc:${normalizedUsername}`)
  })

  socket.on('admin:join', ({ adminEmail = '' } = {}) => {
    const normalizedEmail = adminEmail.toString().trim().toLowerCase()
    if (!normalizedEmail) {
      return
    }

    socket.join(`admin:${normalizedEmail}`)
    socket.join('admin:all')
  })

  socket.on('admin:leave', ({ adminEmail = '' } = {}) => {
    const normalizedEmail = adminEmail.toString().trim().toLowerCase()
    if (!normalizedEmail) {
      return
    }

    socket.leave(`admin:${normalizedEmail}`)
  })
})

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI is not defined in .env')
}

app.use(
  cors({
    origin: allowedOrigins,
  })
)

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

/* TEST EMAIL ROUTE */
app.get('/api/test-email', async (_req, res) => {
  try {
    await sendMail(
      'arumparithib2@gmail.com',
      'SMTP Test',
      'If you received this email, SMTP is working.'
    )
    res.json({ message: 'Email sent successfully' })
  } catch (err) {
    console.error('TEST EMAIL ERROR:', err)
    res.status(500).json({ message: 'Email failed', error: err.message })
  }
})

/* API ROUTES */
app.use('/api/auth', authRoutes)
app.use('/api/pass-requests', passRequestRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin', analyticsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/messages', messageRoutes)

/* SERVE VITE PRODUCTION BUILD IN UNIFIED DEPLOYMENT */
app.use(express.static(path.join(__dirname, 'dist')))

/* FALLBACK FOR SPA FRONTEND ROUTING */
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next()
  }

  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

/* DATABASE CONNECTION */
mongoose
  .connect(process.env.MONGO_URI, {
    family: 4,
    serverSelectionTimeoutMS: 15000,
  })
  .then(() => {
    console.log('MongoDB Connected ✅')
    httpServer.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`)
    })
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message)
    process.exit(1)
  })