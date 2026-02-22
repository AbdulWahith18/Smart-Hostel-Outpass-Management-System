import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import authRoutes from './server/routes/authRoutes.js'
import passRequestRoutes from './server/routes/passRequestRoutes.js'

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

app.use('/api/auth', authRoutes)
app.use('/api/pass-requests', passRequestRoutes)

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
