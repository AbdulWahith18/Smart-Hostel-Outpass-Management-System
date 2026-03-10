import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { createServer } from 'node:http'
import { Server as SocketIOServer } from 'socket.io'
import authRoutes from './server/routes/authRoutes.js'
import passRequestRoutes from './server/routes/passRequestRoutes.js'
import adminRoutes from './server/routes/adminRoutes.js'
import { sendMail } from './server/utils/sendMail.js'

dotenv.config()

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
  })

  socket.on('rc:leave', ({ rcUsername = '' } = {}) => {
    const normalizedUsername = rcUsername.toString().trim()
    if (!normalizedUsername) {
      return
    }

    socket.leave(`rc:${normalizedUsername}`)
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