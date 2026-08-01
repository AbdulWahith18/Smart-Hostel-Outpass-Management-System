import express from 'express'
import { broadcastMessage, getMessagesForUser, sendMessage } from '../controllers/messageController.js'
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', requireAuth, getMessagesForUser)
router.post('/send', requireAuth, sendMessage)
router.post('/broadcast', requireAuth, requireAdmin, broadcastMessage)

export default router
