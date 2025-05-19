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
  getRoutesFromAirport,
  getSpecificRoute,
  getTopRoutes,
  getCheapestRoutes,
  getEcoFriendlyRoutes,
  getRouteEmissions,
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

/**
 * @route GET /api/v2/flights/routes/popular
 * @desc Get popular flight routes
 * @access Public
 */
router.get("/routes/popular", getTopRoutes);

/**
 * @route GET /api/v2/flights/routes/:departure_airport
 * @desc Get all routes from a departure airport
 * @access Public
 */
router.get("/routes/:departure_airport", getRoutesFromAirport);

/**
 * @route GET /api/v2/flights/routes/:departure_airport/:arrival_airport
 * @desc Get specific route between two airports
 * @access Public
 */
router.get("/routes/:departure_airport/:arrival_airport", getSpecificRoute);

/**
 * @route GET /api/v2/flights/cheapest/:departure_airport
 * @desc Get cheapest routes from a departure airport
 * @access Public
 */
router.get("/cheapest/:departure_airport", getCheapestRoutes);

/**
 * @route GET /api/v2/flights/eco-friendly/:departure_airport
 * @desc Get eco-friendly routes from a departure airport
 * @access Public
 */
router.get("/eco-friendly/:departure_airport", getEcoFriendlyRoutes);

/**
 * @route GET /api/v2/flights/emissions/:departure_airport/:arrival_airport
 * @desc Get estimated carbon emissions for a route
 * @access Public
 */
router.get(
  "/emissions/:departure_airport/:arrival_airport",
  getRouteEmissions
);

export default router;
