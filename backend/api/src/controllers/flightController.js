/**
 * Flight Controller for ChasquiFX
 *
 * Handles flight-related API endpoints
 */

import { getLogger } from "../utils/logger.js";
import {
  getFlightFare,
  getMultipleFares,
  getServiceStatus,
} from "../services/flightService-v2.js";

// Initialize logger
const logger = getLogger("flight-controller");

/**
 * Get flight fare information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
export async function getFare(req, res) {
  try {
    // Extract parameters
    const {
      departure_airport,
      arrival_airport,
      outbound_date,
      return_date,
      currency = "USD",
    } = req.query;

    // Validate required parameters
    if (!departure_airport || !arrival_airport) {
      logger.warn(
        "Missing required parameters: departure_airport and arrival_airport"
      );
      return res.status(400).json({
        status: "error",
        message:
          "departure_airport and arrival_airport are required parameters",
      });
    }

    // Check if dates are provided
    if (!outbound_date || !return_date) {
      logger.warn("Missing date parameters");
      return res.status(400).json({
        status: "error",
        message: "outbound_date and return_date are required parameters",
      });
    }

    // Get flight fare
    const fare = await getFlightFare(
      departure_airport,
      arrival_airport,
      outbound_date,
      return_date,
      currency
    );

    if (!fare) {
      logger.warn(`No fare found for ${departure_airport}-${arrival_airport}`);
      return res.status(404).json({
        status: "error",
        message: "No fare information available for the specified route",
      });
    }

    // Return the fare
    return res.json({
      status: "success",
      fare,
    });
  } catch (error) {
    logger.error(`Error in getFare: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while processing your request",
    });
  }
}

/**
 * Get multiple flight fares
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
export async function getMultiFares(req, res) {
  try {
    // Extract parameters
    const {
      departure_airport,
      arrival_airports,
      outbound_date,
      return_date,
      currency = "USD",
    } = req.query;

    // Validate required parameters
    if (!departure_airport || !arrival_airports) {
      logger.warn("Missing required parameters");
      return res.status(400).json({
        status: "error",
        message:
          "departure_airport and arrival_airports are required parameters",
      });
    }

    // Parse arrival airports (should be comma-separated list)
    const arrivalAirports = Array.isArray(arrival_airports)
      ? arrival_airports
      : arrival_airports.split(",").map((airport) => airport.trim());

    if (arrivalAirports.length === 0) {
      logger.warn("No valid arrival airports provided");
      return res.status(400).json({
        status: "error",
        message: "At least one valid arrival airport must be provided",
      });
    }

    // Get flight fares
    const fares = await getMultipleFares(
      departure_airport,
      arrivalAirports,
      outbound_date,
      return_date,
      currency
    );

    // Return the fares
    return res.json({
      status: "success",
      fares,
    });
  } catch (error) {
    logger.error(`Error in getMultiFares: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while processing your request",
    });
  }
}

/**
 * Get flight service status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
export async function getStatus(req, res) {
  try {
    const status = getServiceStatus();
    return res.json(status);
  } catch (error) {
    logger.error(`Error in getStatus: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while checking service status",
    });
  }
}

export default {
  getFare,
  getMultiFares,
  getStatus,
};
