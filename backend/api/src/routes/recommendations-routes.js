import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  getRecommendations,
  handleSaveUserRecommendation,
  getUserHistory,
} from "../controllers/recommendations-controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Rate limiter for the /save route: max 10 requests per minute
const saveRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per windowMs
  message: "Too many requests, please try again later.",
});

/**
 * @route GET /api/v2/recommendations
 * @description Get travel recommendations based on forex rates
 * @access Public
 */
router.get("/", getRecommendations);

/**
 * @route GET /api/v2/recommendations/history
 * @description Get user's recommendation history
 * @access Private
 */
router.get("/history", authMiddleware, getUserHistory);

/**
 * @route POST /api/v2/recommendations/save
 * @description Save a recommendation to user's history
 * @access Private
 */
router.post("/save", saveRateLimiter, authMiddleware, handleSaveUserRecommendation);

export const recommendationsRoutesV2 = router;
