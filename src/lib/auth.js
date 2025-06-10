/**
 * Authentication middleware utilities
 * Provides functions for protecting routes and verifying user authentication
 */

import jwt from "jsonwebtoken";
import { connectToDatabase, createLogger } from "../app/lib/mongodb.js";

const logger = createLogger();
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

/**
 * Middleware to verify JWT token from request headers
 * @param {Request} request - Next.js request object
 * @returns {Object} - Decoded token data or error
 */
export async function verifyAuthToken(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return { error: "No token provided", status: 401 };
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      logger.warn("Invalid token verification attempt");
      return { error: "Invalid or expired token", status: 401 };
    }

    // Connect to MongoDB and verify user still exists
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({
      _id: decoded.userId,
    });

    if (!user) {
      return { error: "User not found", status: 404 };
    }

    // Check if user is still active
    if (user.status === "inactive") {
      return { error: "Account is inactive", status: 401 };
    }

    // Update last active timestamp
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastActive: new Date() } }
    );

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || "user",
      },
      decoded,
      error: null,
    };
  } catch (error) {
    logger.error("Auth verification error:", error);
    return { error: "Internal server error", status: 500 };
  }
}

/**
 * Higher-order function to protect API routes
 * @param {Function} handler - The API route handler
 * @param {Object} options - Protection options
 * @returns {Function} - Protected route handler
 */
export function protectRoute(handler, options = {}) {
  return async function protectedHandler(request, context) {
    try {
      const authResult = await verifyAuthToken(request);

      if (authResult.error) {
        return new Response(JSON.stringify({ message: authResult.error }), {
          status: authResult.status || 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check role permissions if specified
      if (
        options.requiredRole &&
        authResult.user.role !== options.requiredRole
      ) {
        if (
          options.requiredRole === "admin" &&
          authResult.user.role !== "admin"
        ) {
          return new Response(
            JSON.stringify({ message: "Admin access required" }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }

      // Add user info to request context
      request.user = authResult.user;
      request.auth = authResult.decoded;

      // Call the original handler
      return await handler(request, context);
    } catch (error) {
      logger.error("Route protection error:", error);
      return new Response(
        JSON.stringify({ message: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };
}

/**
 * Client-side authentication utility
 * Checks if user is authenticated based on localStorage
 */
export const clientAuth = {
  /**
   * Get stored authentication token
   * @returns {string|null} - JWT token or null
   */
  getToken: () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authToken");
  },

  /**
   * Get stored user data
   * @returns {Object|null} - User object or null
   */
  getUser: () => {
    if (typeof window === "undefined") return null;
    try {
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} - Authentication status
   */
  isAuthenticated: () => {
    const token = clientAuth.getToken();
    const user = clientAuth.getUser();
    return !!(token && user);
  },

  /**
   * Clear authentication data
   */
  clearAuth: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  },

  /**
   * Set authentication data
   * @param {string} token - JWT token
   * @param {Object} user - User object
   */
  setAuth: (token, user) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("authToken", token);
    localStorage.setItem("user", JSON.stringify(user));
  },
};
