import { verifyToken } from "../services/authService.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("auth-middleware");

/**
 * Middleware to authenticate requests
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
export async function authMiddleware(req, res, next) {
  try {
    // Get the JWT from the Authorization header
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized: No token provided",
      });
    }

    // Verify the token with our authentication service
    const result = await verifyToken(token);

    if (!result.success || !result.user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized: Invalid token",
      });
    }

    // Set the user on the request object
    req.user = result.user;

    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "Authentication error",
    });
  }
}
