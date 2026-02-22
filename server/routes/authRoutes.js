import express from 'express'
import { listRcUsers, loginUser, registerUser } from '../controllers/authController.js'

const router = express.Router()

router.get('/rc-users', listRcUsers)
router.post('/register', registerUser)
router.post('/login', loginUser)

export default router
