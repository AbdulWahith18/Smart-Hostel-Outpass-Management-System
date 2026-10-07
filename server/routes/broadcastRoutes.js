import express from 'express'
import {
  getPublicBroadcasts,
  getAdminBroadcasts,
  getAdminBroadcastById,
  createBroadcast,
  updateBroadcast,
  publishBroadcast,
  unpublishBroadcast,
  deleteBroadcast,
} from '../controllers/broadcastController.js'
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

// PUBLIC ROUTE - Safe before login, no auth required
router.get('/public', getPublicBroadcasts)

// ADMIN ROUTES - Strictly protected by requireAuth and requireAdmin
router.get('/admin', requireAuth, requireAdmin, getAdminBroadcasts)
router.get('/admin/:id', requireAuth, requireAdmin, getAdminBroadcastById)
router.post('/admin', requireAuth, requireAdmin, createBroadcast)
router.post('/', requireAuth, requireAdmin, createBroadcast)
router.patch('/admin/:id', requireAuth, requireAdmin, updateBroadcast)
router.patch('/admin/:id/publish', requireAuth, requireAdmin, publishBroadcast)
router.patch('/admin/:id/unpublish', requireAuth, requireAdmin, unpublishBroadcast)
router.delete('/admin/:id', requireAuth, requireAdmin, deleteBroadcast)

export default router
