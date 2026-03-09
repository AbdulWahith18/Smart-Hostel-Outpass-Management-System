import express from 'express'
import { deleteUserById, getAllUsers } from '../controllers/adminController.js'
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/users', requireAuth, requireAdmin, getAllUsers)
router.delete('/users/:id', requireAuth, requireAdmin, deleteUserById)

export default router
