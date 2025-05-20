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
import {
  getRoute,
  getRoutesForDeparture,
  getPopularRoutes,
  findCheapestRoutes,
  findEcoFriendlyRoutes,
  calculateRouteDistance,
  estimateCarbonEmissions,
} from "../services/flightRouteService.js";

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
    if (!departure_airport || !arrival_airport || typeof departure_airport !== 'string' || typeof arrival_airport !== 'string') {
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

/**
 * Get routes for a specific departure airport
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
export async function getRoutesFromAirport(req, res) {
  try {
    const { departure_airport } = req.params;

    if (!departure_airport) {
      logger.warn("Missing departure airport parameter");
      return res.status(400).json({
        status: "error",
        message: "Departure airport is required",
      });
    }

    const routes = await getRoutesForDeparture(departure_airport);

    return res.json({
      status: "success",
      count: routes.length,
      routes,
    });
  } catch (error) {
    logger.error(`Error in getRoutesFromAirport: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving routes",
    });
  }
}

/**
 * Get a specific route between two airports
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
export async function getSpecificRoute(req, res) {
  try {
    const { departure_airport, arrival_airport } = req.params;

    if (!departure_airport || !arrival_airport) {
      logger.warn("Missing airport parameters");
      return res.status(400).json({
        status: "error",
        message: "Both departure and arrival airports are required",
      });
    }

    const route = await getRoute(departure_airport, arrival_airport);

    if (!route) {
      return res.status(404).json({
        status: "error",
        message: `No route found between ${departure_airport} and ${arrival_airport}`,
      });
    }

    return res.json({
      status: "success",
      route,
    });
  } catch (error) {
    logger.error(`Error in getSpecificRoute: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving the route",
    });
  }
}

/**
 * Get popular flight routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
export async function getTopRoutes(req, res) {
  try {
    const { limit = 10 } = req.query;

    const routes = await getPopularRoutes(parseInt(limit, 10));

    return res.json({
      status: "success",
      count: routes.length,
      routes,
    });
  } catch (error) {
    logger.error(`Error in getTopRoutes: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving popular routes",
    });
  }
}

/**
 * Get cheapest flight routes from a departure airport
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
export async function getCheapestRoutes(req, res) {
  try {
    const { departure_airport } = req.params;
    const {
      outbound_date,
      return_date,
      currency = "USD",
      limit = 5,
    } = req.query;

    if (!departure_airport) {
      logger.warn("Missing departure airport parameter");
      return res.status(400).json({
        status: "error",
        message: "Departure airport is required",
      });
    }

    if (!outbound_date || !return_date) {
      logger.warn("Missing date parameters");
      return res.status(400).json({
        status: "error",
        message: "Both outbound_date and return_date are required",
      });
    }

    const cheapestRoutes = await findCheapestRoutes(
      departure_airport,
      outbound_date,
      return_date,
      currency,
      parseInt(limit, 10)
    );

    return res.json({
      status: "success",
      count: cheapestRoutes.length,
      routes: cheapestRoutes,
    });
  } catch (error) {
    logger.error(`Error in getCheapestRoutes: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while finding cheapest routes",
    });
  }
}

/**
 * Get eco-friendly flight routes from a departure airport
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
export async function getEcoFriendlyRoutes(req, res) {
  try {
    const { departure_airport } = req.params;
    const {
      outbound_date,
      return_date,
      currency = "USD",
      limit = 5,
    } = req.query;

    if (!departure_airport) {
      logger.warn("Missing departure airport parameter");
      return res.status(400).json({
        status: "error",
        message: "Departure airport is required",
      });
    }

    if (!outbound_date || !return_date) {
      logger.warn("Missing date parameters");
      return res.status(400).json({
        status: "error",
        message: "Both outbound_date and return_date are required",
      });
    }

    const ecoRoutes = await findEcoFriendlyRoutes(
      departure_airport,
      outbound_date,
      return_date,
      currency,
      parseInt(limit, 10)
    );

    return res.json({
      status: "success",
      count: ecoRoutes.length,
      routes: ecoRoutes,
    });
  } catch (error) {
    logger.error(`Error in getEcoFriendlyRoutes: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while finding eco-friendly routes",
    });
  }
}

/**
 * Estimate carbon emissions for a flight route
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
export async function getRouteEmissions(req, res) {
  try {
    const { departure_airport, arrival_airport } = req.params;

    if (!departure_airport || !arrival_airport) {
      logger.warn("Missing airport parameters");
      return res.status(400).json({
        status: "error",
        message: "Both departure and arrival airports are required",
      });
    }

    const emissions = await estimateCarbonEmissions(
      departure_airport,
      arrival_airport
    );
    const distance = await calculateRouteDistance(
      departure_airport,
      arrival_airport
    );

    if (emissions === null || distance < 0) {
      return res.status(404).json({
        status: "error",
        message: "Could not calculate emissions for this route",
      });
    }

    return res.json({
      status: "success",
      departure: departure_airport,
      arrival: arrival_airport,
      distance_km: distance,
      emissions_kg: emissions,
      emissions_per_km: parseFloat((emissions / distance).toFixed(3)),
    });
  } catch (error) {
    logger.error(`Error in getRouteEmissions: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while calculating emissions",
    });
  }
}

export default {
  getFare,
  getMultiFares,
  getStatus,
  getRoutesFromAirport,
  getSpecificRoute,
  getTopRoutes,
  getCheapestRoutes,
  getEcoFriendlyRoutes,
  getRouteEmissions,
  getRoutesFromAirport,
  getSpecificRoute,
  getTopRoutes,
  getCheapestRoutes,
  getEcoFriendlyRoutes,
  getRouteEmissions,
};
