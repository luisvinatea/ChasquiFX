/**
 * Flight Routes for ChasquiFX
 *
 * Defines API endpoints for flight-related operations
 */

import { Router } from "express";
import {
  getFare,
  getMultiFares,
  getStatus,
} from "../controllers/flightController.js";

const router = Router();

/**
 * @route GET /api/v2/flights/fare
 * @desc Get flight fare information
 * @access Public
 */
router.get("/fare", getFare);

/**
 * @route GET /api/v2/flights/multi-fares
 * @desc Get multiple flight fares
 * @access Public
 */
router.get("/multi-fares", getMultiFares);

/**
 * @route GET /api/v2/flights/status
 * @desc Get flight service status
 * @access Public
 */
router.get("/status", getStatus);

export default router;
