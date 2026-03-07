import express from 'express'
import { listRcUsers, loginUser, registerUser, resetPassword } from '../controllers/authController.js'

const router = express.Router()

router.get('/rc-users', listRcUsers)
router.post('/register', registerUser)
router.post('/login', loginUser)
router.post('/reset-password', resetPassword)

export default router
