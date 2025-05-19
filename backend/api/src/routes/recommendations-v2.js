import { Router } from "express";
import {
  getRecommendations,
  saveUserRecommendation,
  getUserHistory,
} from "../controllers/recommendations-v2.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

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
router.post("/save", authMiddleware, saveUserRecommendation);

export const recommendationsRoutesV2 = router;
