/**
 * Flight Route Service for ChasquiFX
 *
 * Provides operations for finding and analyzing flight routes
 */

import { getLogger } from "../utils/logger.js";
import { initMongoDB } from "../db/mongodb-client.js";
import { getMultipleFares } from "./flightService-v2.js";
import { Airport, FlightRoute } from "../models/geo.js";

// Initialize logger
const logger = getLogger("flight-route-service");

/**
 * Flight route cache to avoid repeated database queries
 */
const routeCache = {
  routes: {},
  popularRoutes: [],
  lastUpdated: null,
  validityPeriodMs: 3600000, // 1 hour
};

/**
 * Initialize the flight route service
 * @returns {Promise<boolean>} Success status
 */
export async function initFlightRouteService() {
  try {
    logger.info("Initializing flight route service");
    await loadPopularRoutes();
    return true;
  } catch (error) {
    logger.error(
      `Failed to initialize flight route service: ${error.message}`
    );
    return false;
  }
}

/**
 * Load popular routes from database
 * @returns {Promise<void>}
 */
async function loadPopularRoutes() {
  try {
    const { db } = await initMongoDB();
    const routesCollection = db.collection("routes");

    // Get top 50 most popular routes
    const popularRoutes = await routesCollection
      .find({})
      .sort({ popularity: -1 })
      .limit(50)
      .toArray();

    if (popularRoutes.length > 0) {
      routeCache.popularRoutes = popularRoutes.map(
        (route) => new FlightRoute(route)
      );
      routeCache.lastUpdated = Date.now();
      logger.info(`Loaded ${popularRoutes.length} popular routes`);
    } else {
      logger.warn("No popular routes found in database");
    }
  } catch (error) {
    logger.error(`Error loading popular routes: ${error.message}`);
  }
}

/**
 * Get all routes for a departure airport
 * @param {string} departureCode - Airport IATA code
 * @returns {Promise<Array<FlightRoute>>} List of flight routes
 */
export async function getRoutesForDeparture(departureCode) {
  try {
    logger.info(`Getting routes for departure airport: ${departureCode}`);

    // Check cache first
    if (
      routeCache.routes[departureCode] &&
      routeCache.lastUpdated &&
      Date.now() - routeCache.lastUpdated < routeCache.validityPeriodMs
    ) {
      logger.info(`Using cached routes for ${departureCode}`);
      return routeCache.routes[departureCode];
    }

    // Get routes from database
    const { db } = await initMongoDB();
    const routesCollection = db.collection("routes");

    const routes = await routesCollection.find({ departureCode }).toArray();

    // Convert to FlightRoute objects
    const flightRoutes = routes.map((route) => new FlightRoute(route));

    // Update cache
    routeCache.routes[departureCode] = flightRoutes;
    routeCache.lastUpdated = Date.now();

    logger.info(`Found ${flightRoutes.length} routes for ${departureCode}`);
    return flightRoutes;
  } catch (error) {
    logger.error(
      `Error getting routes for ${departureCode}: ${error.message}`
    );
    return [];
  }
}

/**
 * Get route between two airports
 * @param {string} departureCode - Departure airport IATA code
 * @param {string} arrivalCode - Arrival airport IATA code
 * @returns {Promise<FlightRoute|null>} Flight route or null if not found
 */
export async function getRoute(departureCode, arrivalCode) {
  try {
    logger.info(`Getting route: ${departureCode}-${arrivalCode}`);

    const { db } = await initMongoDB();
    const routesCollection = db.collection("routes");

    const route = await routesCollection.findOne({
      departureCode,
      arrivalCode,
    });

    if (route) {
      return new FlightRoute(route);
    }

    logger.warn(`Route not found: ${departureCode}-${arrivalCode}`);
    return null;
  } catch (error) {
    logger.error(
      `Error getting route ${departureCode}-${arrivalCode}: ${error.message}`
    );
    return null;
  }
}

/**
 * Get popular routes
 * @param {number} limit - Maximum number of routes to return
 * @returns {Promise<Array<FlightRoute>>} List of popular routes
 */
export async function getPopularRoutes(limit = 10) {
  try {
    // Ensure popular routes are loaded
    if (
      !routeCache.popularRoutes.length ||
      !routeCache.lastUpdated ||
      Date.now() - routeCache.lastUpdated > routeCache.validityPeriodMs
    ) {
      await loadPopularRoutes();
    }

    return routeCache.popularRoutes.slice(0, limit);
  } catch (error) {
    logger.error(`Error getting popular routes: ${error.message}`);
    return [];
  }
}

/**
 * Find cheapest routes from a departure airport
 * @param {string} departureCode - Departure airport IATA code
 * @param {string} outboundDate - Outbound date (YYYY-MM-DD)
 * @param {string} returnDate - Return date (YYYY-MM-DD)
 * @param {string} currency - Currency code
 * @param {number} limit - Maximum number of routes to return
 * @returns {Promise<Array<Object>>} List of routes with fare information
 */
export async function findCheapestRoutes(
  departureCode,
  outboundDate,
  returnDate,
  currency = "USD",
  limit = 5
) {
  try {
    logger.info(`Finding cheapest routes from ${departureCode}`);

    // Get all routes for the departure airport
    const routes = await getRoutesForDeparture(departureCode);

    if (routes.length === 0) {
      logger.warn(`No routes found for ${departureCode}`);
      return [];
    }

    // Get destination airport codes
    const destinationCodes = routes.map((route) => route.arrivalCode);

    // Limit to top 20 destinations for performance
    const limitedDestinations = destinationCodes.slice(0, 20);

    // Get fares for all destinations
    const fares = await getMultipleFares(
      departureCode,
      limitedDestinations,
      outboundDate,
      returnDate,
      currency
    );

    // Combine route and fare data
    const routesWithFares = limitedDestinations
      .filter((code) => fares[code]) // Only include destinations with fare data
      .map((code) => {
        const route = routes.find((r) => r.arrivalCode === code);
        return {
          route,
          fare: fares[code],
        };
      });

    // Sort by price (ascending)
    routesWithFares.sort((a, b) => a.fare.price - b.fare.price);

    // Return the cheapest routes
    return routesWithFares.slice(0, limit);
  } catch (error) {
    logger.error(
      `Error finding cheapest routes from ${departureCode}: ${error.message}`
    );
    return [];
  }
}

/**
 * Find eco-friendly routes from a departure airport
 * @param {string} departureCode - Departure airport IATA code
 * @param {string} outboundDate - Outbound date (YYYY-MM-DD)
 * @param {string} returnDate - Return date (YYYY-MM-DD)
 * @param {string} currency - Currency code
 * @param {number} limit - Maximum number of routes to return
 * @returns {Promise<Array<Object>>} List of routes with fare information
 */
export async function findEcoFriendlyRoutes(
  departureCode,
  outboundDate,
  returnDate,
  currency = "USD",
  limit = 5
) {
  try {
    logger.info(`Finding eco-friendly routes from ${departureCode}`);

    // Get all routes for the departure airport
    const routes = await getRoutesForDeparture(departureCode);

    if (routes.length === 0) {
      logger.warn(`No routes found for ${departureCode}`);
      return [];
    }

    // Get destination airport codes
    const destinationCodes = routes.map((route) => route.arrivalCode);

    // Limit to top 20 destinations for performance
    const limitedDestinations = destinationCodes.slice(0, 20);

    // Get fares for all destinations
    const fares = await getMultipleFares(
      departureCode,
      limitedDestinations,
      outboundDate,
      returnDate,
      currency
    );

    // Combine route and fare data
    const routesWithFares = limitedDestinations
      .filter((code) => fares[code] && fares[code].carbonEmissions !== null) // Only include destinations with carbon data
      .map((code) => {
        const route = routes.find((r) => r.arrivalCode === code);
        return {
          route,
          fare: fares[code],
        };
      });

    // Sort by carbon emissions (ascending)
    routesWithFares.sort(
      (a, b) => (a.fare.carbonEmissions || 0) - (b.fare.carbonEmissions || 0)
    );

    // Return the most eco-friendly routes
    return routesWithFares.slice(0, limit);
  } catch (error) {
    logger.error(
      `Error finding eco-friendly routes from ${departureCode}: ${error.message}`
    );
    return [];
  }
}

/**
 * Calculate route distance
 * @param {string} departureCode - Departure airport IATA code
 * @param {string} arrivalCode - Arrival airport IATA code
 * @returns {Promise<number>} Distance in kilometers or -1 if not available
 */
export async function calculateRouteDistance(departureCode, arrivalCode) {
  try {
    // Get airports
    const { db } = await initMongoDB();
    const airportsCollection = db.collection("airports");

    const departureAirport = await airportsCollection.findOne({
      iataCode: departureCode,
    });
    const arrivalAirport = await airportsCollection.findOne({
      iataCode: arrivalCode,
    });

    if (!departureAirport || !arrivalAirport) {
      logger.warn(
        `Could not find airports for ${departureCode}-${arrivalCode}`
      );
      return -1;
    }

    // Create Airport objects to use the distance calculation method
    const departure = new Airport(departureAirport);
    const arrival = new Airport(arrivalAirport);

    // Calculate distance
    return departure.distanceTo(arrival);
  } catch (error) {
    logger.error(`Error calculating route distance: ${error.message}`);
    return -1;
  }
}

/**
 * Estimate carbon emissions for a route
 * @param {string} departureCode - Departure airport IATA code
 * @param {string} arrivalCode - Arrival airport IATA code
 * @returns {Promise<number>} Carbon emissions in kg or null if not available
 */
export async function estimateCarbonEmissions(departureCode, arrivalCode) {
  try {
    // Get route distance
    const distance = await calculateRouteDistance(departureCode, arrivalCode);

    if (distance <= 0) {
      return null;
    }

    // Simple carbon estimation formula based on distance
    // Average emissions per passenger km: ~115g CO2 for short flights, ~85g for medium, ~105g for long
    let emissionFactor;

    if (distance < 1500) {
      emissionFactor = 0.115; // kg per km
    } else if (distance < 4000) {
      emissionFactor = 0.085; // kg per km
    } else {
      emissionFactor = 0.105; // kg per km
    }

    // Calculate total emissions
    const emissions = distance * emissionFactor;

    return Math.round(emissions);
  } catch (error) {
    logger.error(`Error estimating carbon emissions: ${error.message}`);
    return null;
  }
}
