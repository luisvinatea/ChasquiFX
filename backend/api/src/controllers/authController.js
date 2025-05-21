/**
 * Authentication Controller
 * Handles user registration, login, and account management
 */

import {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  verifyToken,
} from "../services/authService.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("auth-controller");

/**
 * Handle user registration
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleRegister(req, res) {
  try {
    const { email, password, username } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    const result = await registerUser(email, password, username);

    if (!result.success) {
      return res.status(400).json({
        status: "error",
        message: result.error,
      });
    }

    res.status(201).json({
      status: "success",
      message:
        "Registration successful. Please check your email for verification.",
      user: result.user,
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    res.status(500).json({
      status: "error",
      message: "Failed to register user",
      error: error.message,
    });
  }
}

/**
 * Handle user login
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    const result = await loginUser(email, password);

    if (!result.success) {
      return res.status(401).json({
        status: "error",
        message: result.error,
      });
    }

    res.status(200).json({
      status: "success",
      message: "Login successful",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({
      status: "error",
      message: "Failed to login",
      error: error.message,
    });
  }
}

/**
 * Handle email verification
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleVerifyEmail(req, res) {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        status: "error",
        message: "Email and token are required",
      });
    }

    const result = await verifyEmail(email, token);

    if (!result.success) {
      return res.status(400).json({
        status: "error",
        message: result.error,
      });
    }

    res.status(200).json({
      status: "success",
      message: "Email verification successful",
      user: result.user,
    });
  } catch (error) {
    logger.error(`Verification error: ${error.message}`);
    res.status(500).json({
      status: "error",
      message: "Failed to verify email",
      error: error.message,
    });
  }
}

/**
 * Handle resend verification email
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleResendVerification(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required",
      });
    }

    const result = await resendVerification(email);

    if (!result.success) {
      return res.status(400).json({
        status: "error",
        message: result.error,
      });
    }

    res.status(200).json({
      status: "success",
      message: "Verification email sent",
    });
  } catch (error) {
    logger.error(`Resend verification error: ${error.message}`);
    res.status(500).json({
      status: "error",
      message: "Failed to resend verification email",
      error: error.message,
    });
  }
}

/**
 * Handle request password reset
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleRequestPasswordReset(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required",
      });
    }

    const result = await requestPasswordReset(email);

    // Always return success for security (don't reveal if email exists)
    res.status(200).json({
      status: "success",
      message:
        "If your email is registered, you will receive password reset instructions.",
    });
  } catch (error) {
    logger.error(`Password reset request error: ${error.message}`);
    res.status(500).json({
      status: "error",
      message: "Failed to process password reset request",
      error: error.message,
    });
  }
}

/**
 * Handle password reset
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleResetPassword(req, res) {
  try {
    const { email, token, password } = req.body;

    if (!email || !token || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email, token, and new password are required",
      });
    }

    const result = await resetPassword(email, token, password);

    if (!result.success) {
      return res.status(400).json({
        status: "error",
        message: result.error,
      });
    }

    res.status(200).json({
      status: "success",
      message: "Password has been reset successfully",
    });
  } catch (error) {
    logger.error(`Password reset error: ${error.message}`);
    res.status(500).json({
      status: "error",
      message: "Failed to reset password",
      error: error.message,
    });
  }
}

/**
 * Handle getting current user profile
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleGetProfile(req, res) {
  try {
    // User is already available from auth middleware
    const { user } = req;

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    res.status(200).json({
      status: "success",
      user,
    });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    res.status(500).json({
      status: "error",
      message: "Failed to get user profile",
      error: error.message,
    });
  }
}
