import express from 'express'
import { deleteUserById, getAllUsers, updateUserStatus } from '../controllers/adminController.js'
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/users', requireAuth, requireAdmin, getAllUsers)
router.patch('/user-status/:id', requireAuth, requireAdmin, updateUserStatus)
router.delete('/users/:id', requireAuth, requireAdmin, deleteUserById)

export default router
