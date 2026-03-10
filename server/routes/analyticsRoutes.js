import express from 'express'
import { askAiAnalyticsQuestion, getAiAnalyticsSnapshot, getAiAnalyticsSummary } from '../controllers/adminController.js'
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/ai-analytics', requireAuth, requireAdmin, getAiAnalyticsSummary)
router.get('/ai-analytics', requireAuth, requireAdmin, getAiAnalyticsSummary)
router.get('/ai-analytics/snapshot', requireAuth, getAiAnalyticsSnapshot)
router.post('/ai-chat', requireAuth, requireAdmin, askAiAnalyticsQuestion)

export default router