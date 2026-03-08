import express from "express"
import {
  listRcUsers,
  loginUser,
  registerUser,
  resetPassword,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
} from "../controllers/authController.js"

const router = express.Router()

router.get("/rc-users", listRcUsers)
router.post("/register", registerUser)
router.post("/login", loginUser)

// Forgot password flow
router.post("/forgot-password/send-otp", sendForgotPasswordOtp)
router.post("/forgot-password/verify-otp", verifyForgotPasswordOtp)
router.post("/reset-password", resetPassword)
router.post("/forgot-password/reset", resetPassword)

export default router