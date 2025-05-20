import { Router } from "express";
import {
  getForexRates,
  getForexStatus,
  resetQuotaStatus,
} from "../controllers/forex-mongodb.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

/**
 * @route GET /api/v1/forex/rates
 * @description Get forex exchange rates
 * @access Public
 */
router.get("/rates", getForexRates);

/**
 * @route GET /api/v1/forex/status
 * @description Get forex API status
 * @access Public
 */
router.get("/status", getForexStatus);

/**
 * @route POST /api/v1/forex/reset_quota_status
 * @description Reset quota status (admin only)
 * @access Private
 */
router.post("/reset_quota_status", authMiddleware, resetQuotaStatus);

export const forexRoutesV2 = router;
