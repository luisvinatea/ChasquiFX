/**
 * Authentication Routes
 * Handles user registration, login, and account management
 */

import express from "express";
import {
  handleRegister,
  handleLogin,
  handleVerifyEmail,
  handleResendVerification,
  handleRequestPasswordReset,
  handleResetPassword,
  handleGetProfile,
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/register", handleRegister);
router.post("/login", handleLogin);
router.post("/verify-email", handleVerifyEmail);
router.post("/resend-verification", handleResendVerification);
router.post("/forgot-password", handleRequestPasswordReset);
router.post("/reset-password", handleResetPassword);

// Protected routes
router.get("/profile", authMiddleware, handleGetProfile);

export default router;
