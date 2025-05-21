/**
 * Authentication Service
 * Handles user registration, login, and token management
 */

import crypto from "crypto";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "../db/mongodb.js";
import User from "../models/user.js";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from "./emailService.js";
import { getLogger } from "../utils/logger.js";
import { getRequiredEnv, getEnv } from "../utils/env.js";

const logger = getLogger("auth-service");
// Using the environment utility to handle JWT secret securely
const JWT_SECRET = getRequiredEnv(
  "JWT_SECRET",
  "PLACEHOLDER_SECRET_DO_NOT_USE_IN_PRODUCTION"
);
const JWT_EXPIRY = getEnv("JWT_EXPIRY", "7d"); // Token expiry, default 7 days

/**
 * Generate a JWT token
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      verified: user.verified,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} username - Optional username
 * @returns {Promise<Object>} - Registration result
 */
export async function registerUser(email, password, username = "") {
  try {
    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return {
        success: false,
        error: "User already exists",
      };
    }

    // Create new user
    const newUser = new User({
      email,
      username: username || email.split("@")[0], // Default username from email
      verified: false,
    });

    // Set password
    newUser.setPassword(password);

    // Generate verification token
    const verificationToken = newUser.generateVerificationToken();

    // Save user to database
    await newUser.save();

    // Send verification email
    await sendVerificationEmail(email, verificationToken, newUser.username);

    logger.info(`User registered: ${email}`);

    return {
      success: true,
      user: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        verified: newUser.verified,
      },
    };
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    return {
      success: false,
      error: `Registration failed: ${error.message}`,
    };
  }
}

/**
 * Verify a user's email
 * @param {string} email - User email
 * @param {string} token - Verification token
 * @returns {Promise<Object>} - Verification result
 */
export async function verifyEmail(email, token) {
  try {
    await connectToDatabase();

    // Find user with matching email and token
    const user = await User.findOne({
      email,
      "verificationToken.token": token,
      "verificationToken.expires": { $gt: new Date() }, // Token hasn't expired
    });

    if (!user) {
      return {
        success: false,
        error: "Invalid or expired verification token",
      };
    }

    // Update user as verified
    user.verified = true;
    user.verificationToken = undefined; // Clear the token
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(email, user.username);

    logger.info(`Email verified for user: ${email}`);

    return {
      success: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        verified: user.verified,
      },
    };
  } catch (error) {
    logger.error(`Email verification error: ${error.message}`);
    return {
      success: false,
      error: `Email verification failed: ${error.message}`,
    };
  }
}

/**
 * Resend verification email
 * @param {string} email - User email
 * @returns {Promise<Object>} - Result
 */
export async function resendVerification(email) {
  try {
    await connectToDatabase();

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    if (user.verified) {
      return {
        success: false,
        error: "Email already verified",
      };
    }

    // Generate a new verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Send verification email
    await sendVerificationEmail(email, verificationToken, user.username);

    logger.info(`Verification email resent to: ${email}`);

    return {
      success: true,
    };
  } catch (error) {
    logger.error(`Resend verification error: ${error.message}`);
    return {
      success: false,
      error: `Failed to resend verification: ${error.message}`,
    };
  }
}

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - Login result with token
 */
export async function loginUser(email, password) {
  try {
    await connectToDatabase();

    // Find user with password field included
    const user = await User.findOne({ email }).select("+password +salt");

    if (!user) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Verify password
    if (!user.validPassword(password)) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user);

    logger.info(`User logged in: ${email}`);

    return {
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        verified: user.verified,
        role: user.role,
      },
    };
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    return {
      success: false,
      error: `Login failed: ${error.message}`,
    };
  }
}

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} - Result
 */
export async function requestPasswordReset(email) {
  try {
    await connectToDatabase();

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      // For security, don't reveal that the email doesn't exist
      // We'll still return success but won't send an email
      logger.info(`Password reset requested for non-existent user: ${email}`);
      return { success: true };
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send password reset email
    await sendPasswordResetEmail(email, resetToken, user.username);

    logger.info(`Password reset requested for user: ${email}`);

    return { success: true };
  } catch (error) {
    logger.error(`Password reset request error: ${error.message}`);
    return {
      success: false,
      error: `Failed to request password reset: ${error.message}`,
    };
  }
}

/**
 * Reset password
 * @param {string} email - User email
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Result
 */
export async function resetPassword(email, token, newPassword) {
  try {
    await connectToDatabase();

    // Validate email
    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return {
        success: false,
        error: "Invalid email format",
      };
    }

    // Find user with matching email and token
    const user = await User.findOne({
      email: { $eq: email },
      "resetPasswordToken.token": token,
      "resetPasswordToken.expires": { $gt: new Date() }, // Token hasn't expired
    }).select("+salt");

    if (!user) {
      return {
        success: false,
        error: "Invalid or expired reset token",
      };
    }

    // Update password
    user.setPassword(newPassword);
    user.resetPasswordToken = undefined; // Clear the token
    await user.save();

    logger.info(`Password reset for user: ${email}`);

    return { success: true };
  } catch (error) {
    logger.error(`Password reset error: ${error.message}`);
    return {
      success: false,
      error: `Failed to reset password: ${error.message}`,
    };
  }
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token
 * @returns {Promise<Object>} - Verification result with user data
 */
export async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    await connectToDatabase();

    // Find user
    const user = await User.findById(decoded.id);

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    return {
      success: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        verified: user.verified,
        role: user.role,
      },
    };
  } catch (error) {
    logger.error(`Token verification error: ${error.message}`);
    return {
      success: false,
      error: `Token verification failed: ${error.message}`,
    };
  }
}
