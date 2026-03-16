import express from 'express'
import {
  approvePassRequest,
  rejectPassRequest,
  createPassRequest,
  getPassRequestsForRc,
  getPassRequestsForStudent,
} from '../controllers/passRequestController.js'

const router = express.Router()

router.post('/', createPassRequest)
router.get('/rc/:rcUsername', getPassRequestsForRc)
router.get('/student', getPassRequestsForStudent)
router.get('/student/:studentEmail', getPassRequestsForStudent)
router.patch('/:requestId/approve', approvePassRequest)
router.patch('/:requestId/reject', rejectPassRequest)

export default router
