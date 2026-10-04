import express from 'express'
import {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  reopenComplaint,
  getAllComplaintsAdmin,
  updateComplaintStatusAdmin,
  addAdminResponse,
} from '../controllers/complaintController.js'
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

/* STUDENT / RC USER ROUTES */
router.post('/', requireAuth, createComplaint)
router.get('/my', requireAuth, getMyComplaints)
router.get('/:id', requireAuth, getComplaintById)
router.patch('/:id/reopen', requireAuth, reopenComplaint)

/* ADMIN ROUTES */
router.get('/admin/all', requireAuth, requireAdmin, getAllComplaintsAdmin)
router.patch('/admin/:id/status', requireAuth, requireAdmin, updateComplaintStatusAdmin)
router.patch('/admin/:id/response', requireAuth, requireAdmin, addAdminResponse)

export default router
