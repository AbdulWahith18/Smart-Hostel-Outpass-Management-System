import express from 'express'
import {
	approvePassRequestInAccessMode,
	deleteUserById,
	getAdminAccessModeData,
	getAllUsers,
	rejectPassRequestInAccessMode,
	updateUserStatus,
} from '../controllers/adminController.js'
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/users', requireAuth, requireAdmin, getAllUsers)
router.get('/access-mode', requireAuth, requireAdmin, getAdminAccessModeData)
router.patch('/access-mode/:requestId/approve', requireAuth, requireAdmin, approvePassRequestInAccessMode)
router.patch('/access-mode/:requestId/reject', requireAuth, requireAdmin, rejectPassRequestInAccessMode)
router.patch('/user-status/:id', requireAuth, requireAdmin, updateUserStatus)
router.delete('/users/:id', requireAuth, requireAdmin, deleteUserById)

export default router
