import express from 'express'
import { analyzeReason } from '../services/aiService.js'

const router = express.Router()

router.post('/analyze', async (req, res) => {
  const { reason = '' } = req.body ?? {}

  if (!reason.toString().trim()) {
    return res.status(400).json({ message: 'Reason is required.' })
  }

  try {
    const aiAnalysis = await analyzeReason(reason)
    return res.status(200).json({ aiAnalysis })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to analyze reason.', error: error.message })
  }
})

export default router