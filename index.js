import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import authRoutes from './server/routes/authRoutes.js'
import passRequestRoutes from './server/routes/passRequestRoutes.js'
import adminRoutes from './server/routes/adminRoutes.js'
import { sendMail } from './server/utils/sendMail.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 5000

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI is not defined in .env')
}

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
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
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`)
    })
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message)
    process.exit(1)
  })