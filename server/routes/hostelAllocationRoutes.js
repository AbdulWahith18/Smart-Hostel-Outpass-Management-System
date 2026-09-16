import express from 'express'
import {
  previewAllocation,
  createAllocation,
  getAllocations,
  getAllocationById,
  publishAllocation,
  closeAllocation,
  deleteAllocation,
  getAllocationOccupancy,
  getAllocationBookings,
  getAllocationReport,
  downloadAllocationPDF,
  downloadAllocationCSV,
  regenerateReport,
  getActiveAllocation,
  getMyBooking,
  getRooms,
  getRoomById,
  bookSlot,
} from '../controllers/hostelAllocationController.js'
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

/* STUDENT ROUTES */
router.get('/active', requireAuth, getActiveAllocation)
router.get('/my-booking', requireAuth, getMyBooking)
router.get('/:id/rooms', requireAuth, getRooms)
router.get('/:id/rooms/:roomId', requireAuth, getRoomById)
router.post('/:id/book', requireAuth, bookSlot)

/* ADMIN ROUTES */
router.post('/admin/preview', requireAuth, requireAdmin, previewAllocation)
router.post('/admin', requireAuth, requireAdmin, createAllocation)
router.get('/admin/list', requireAuth, requireAdmin, getAllocations)
router.get('/admin/:id', requireAuth, requireAdmin, getAllocationById)
router.patch('/admin/:id/publish', requireAuth, requireAdmin, publishAllocation)
router.patch('/admin/:id/close', requireAuth, requireAdmin, closeAllocation)
router.delete('/admin/:id', requireAuth, requireAdmin, deleteAllocation)
router.get('/admin/:id/occupancy', requireAuth, requireAdmin, getAllocationOccupancy)
router.get('/admin/:id/bookings', requireAuth, requireAdmin, getAllocationBookings)

/* REPORT ROUTES */
router.get('/admin/:id/report', requireAuth, requireAdmin, getAllocationReport)
router.get('/admin/:id/report/pdf', requireAuth, requireAdmin, downloadAllocationPDF)
router.get('/admin/:id/report/csv', requireAuth, requireAdmin, downloadAllocationCSV)
router.post('/admin/:id/report/regenerate', requireAuth, requireAdmin, regenerateReport)

export default router
