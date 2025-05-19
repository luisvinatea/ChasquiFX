/**
 * Flight Database Operations Module
 *
 * Provides an interface for flight data operations with MongoDB
 */

import { getLogger } from "../utils/logger.js";
import { initMongoDB } from "./mongodb-client.js";
import { FlightFare } from "../models/FlightFare.js";

// Initialize logger
const logger = getLogger("flight-db");

/**
 * Get cached flight fare from MongoDB
 * @param {string} departureAirport - Departure airport IATA code
 * @param {string} arrivalAirport - Arrival airport IATA code
 * @param {string} outboundDate - Outbound date (YYYY-MM-DD)
 * @param {string} returnDate - Return date (YYYY-MM-DD)
 * @param {string} currency - Currency code
 * @returns {Promise<FlightFare|null>} Flight fare or null if not found
 */
export async function getCachedFlightFare(
  departureAirport,
  arrivalAirport,
  outboundDate,
  returnDate,
  currency = "USD"
) {
  try {
    logger.debug(
      `Looking for cached flight fare: ${departureAirport}-${arrivalAirport}`
    );

    const { db } = await initMongoDB();
    const cacheCollection = db.collection("flightCache");

    // Create cache key
    const cacheKey = `${departureAirport}_${arrivalAirport}_${outboundDate}_${returnDate}`;

    // Find the cache entry
    const cacheEntry = await cacheCollection.findOne({
      cacheKey,
      expiresAt: { $gt: new Date() },
    });

    if (cacheEntry && cacheEntry.data) {
      logger.info(
        `Found valid cache entry for ${departureAirport}-${arrivalAirport}`
      );

      try {
        // Convert to FlightFare object
        return FlightFare.fromData({
          ...cacheEntry.data,
          outboundDate,
          returnDate,
          currency: cacheEntry.data.currency || currency,
        });
      } catch (error) {
        logger.warn(`Error parsing cached flight data: ${error.message}`);
        return null;
      }
    }

    logger.debug(
      `No valid cache found for ${departureAirport}-${arrivalAirport}`
    );
    return null;
  } catch (error) {
    logger.error(`Error retrieving cached flight fare: ${error.message}`);
    return null;
  }
}

/**
 * Cache flight fare in MongoDB
 * @param {string} departureAirport - Departure airport IATA code
 * @param {string} arrivalAirport - Arrival airport IATA code
 * @param {string} outboundDate - Outbound date (YYYY-MM-DD)
 * @param {string} returnDate - Return date (YYYY-MM-DD)
 * @param {FlightFare} fare - Flight fare object
 * @param {string} currency - Currency code
 * @param {number} expiryHours - Cache expiry in hours
 * @returns {Promise<boolean>} Success status
 */
export async function cacheFlightFare(
  departureAirport,
  arrivalAirport,
  outboundDate,
  returnDate,
  fare,
  currency,
  expiryHours = 24
) {
  try {
    logger.debug(
      `Caching flight fare for ${departureAirport}-${arrivalAirport}`
    );

    const { db } = await initMongoDB();
    const cacheCollection = db.collection("flightCache");

    // Create cache key
    const cacheKey = `${departureAirport}_${arrivalAirport}_${outboundDate}_${returnDate}`;

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Create or update the cache entry
    await cacheCollection.updateOne(
      { cacheKey },
      {
        $set: {
          cacheKey,
          searchParameters: {
            departure_id: departureAirport,
            arrival_id: arrivalAirport,
            outbound_date: outboundDate,
            return_date: returnDate,
            currency,
          },
          data: fare.toJSON(),
          expiresAt,
        },
      },
      { upsert: true }
    );

    logger.info(
      `Cached flight fare for ${departureAirport}-${arrivalAirport}`
    );
    return true;
  } catch (error) {
    logger.error(`Error caching flight fare: ${error.message}`);
    return false;
  }
}

/**
 * Store flight route in MongoDB
 * @param {Object} route - Flight route object
 * @returns {Promise<boolean>} Success status
 */
export async function saveFlightRoute(route) {
  try {
    const { db } = await initMongoDB();
    const routesCollection = db.collection("routes");

    // Ensure required fields
    if (!route.departureCode || !route.arrivalCode) {
      throw new Error("Route must include departureCode and arrivalCode");
    }

    // Add timestamp if not present
    if (!route.timestamp) {
      route.timestamp = new Date();
    }

    // Create or update the route
    await routesCollection.updateOne(
      {
        departureCode: route.departureCode,
        arrivalCode: route.arrivalCode,
      },
      { $set: route },
      { upsert: true }
    );

    logger.info(
      `Saved flight route: ${route.departureCode}-${route.arrivalCode}`
    );
    return true;
  } catch (error) {
    logger.error(`Error saving flight route: ${error.message}`);
    return false;
  }
}

/**
 * Get flight routes from MongoDB
 * @param {string} departureCode - Departure airport IATA code
 * @returns {Promise<Array<Object>>} List of routes
 */
export async function getFlightRoutes(departureCode) {
  try {
    const { db } = await initMongoDB();
    const routesCollection = db.collection("routes");

    const routes = await routesCollection.find({ departureCode }).toArray();

    return routes;
  } catch (error) {
    logger.error(`Error getting flight routes: ${error.message}`);
    return [];
  }
}

/**
 * Get a specific flight route
 * @param {string} departureCode - Departure airport IATA code
 * @param {string} arrivalCode - Arrival airport IATA code
 * @returns {Promise<Object|null>} Route or null if not found
 */
export async function getFlightRoute(departureCode, arrivalCode) {
  try {
    const { db } = await initMongoDB();
    const routesCollection = db.collection("routes");

    const route = await routesCollection.findOne({
      departureCode,
      arrivalCode,
    });

    return route;
  } catch (error) {
    logger.error(`Error getting flight route: ${error.message}`);
    return null;
  }
}

/**
 * Get popular flight routes
 * @param {number} limit - Maximum number of routes to return
 * @returns {Promise<Array<Object>>} List of popular routes
 */
export async function getPopularFlightRoutes(limit = 10) {
  try {
    const { db } = await initMongoDB();
    const routesCollection = db.collection("routes");

    const routes = await routesCollection
      .find({})
      .sort({ popularity: -1 })
      .limit(limit)
      .toArray();

    return routes;
  } catch (error) {
    logger.error(`Error getting popular flight routes: ${error.message}`);
    return [];
  }
}

/**
 * Log API call for analytics
 * @param {Object} options - API call options
 * @returns {Promise<boolean>} Success status
 */
export async function logApiCall({
  endpoint,
  requestData,
  responseStatus = 200,
  userId = null,
}) {
  try {
    const { db } = await initMongoDB();
    const apiLogsCollection = db.collection("apiLogs");

    await apiLogsCollection.insertOne({
      endpoint,
      requestData,
      responseStatus,
      userId,
      timestamp: new Date(),
    });

    return true;
  } catch (error) {
    logger.error(`Error logging API call: ${error.message}`);
    return false;
  }
}

/**
 * Get flight emissions data
 * @param {string} departureCode - Departure airport IATA code
 * @param {string} arrivalCode - Arrival airport IATA code
 * @returns {Promise<Object|null>} Emissions data or null
 */
export async function getFlightEmissions(departureCode, arrivalCode) {
  try {
    const { db } = await initMongoDB();
    const emissionsCollection = db.collection("flightEmissions");

    const emissions = await emissionsCollection.findOne({
      departureCode,
      arrivalCode,
    });

    return emissions;
  } catch (error) {
    logger.error(`Error getting flight emissions: ${error.message}`);
    return null;
  }
}

/**
 * Save flight emissions data
 * @param {string} departureCode - Departure airport IATA code
 * @param {string} arrivalCode - Arrival airport IATA code
 * @param {number} emissions - CO2 emissions in kg
 * @param {number} distance - Distance in km
 * @returns {Promise<boolean>} Success status
 */
export async function saveFlightEmissions(
  departureCode,
  arrivalCode,
  emissions,
  distance
) {
  try {
    const { db } = await initMongoDB();
    const emissionsCollection = db.collection("flightEmissions");

    // Create or update emissions data
    await emissionsCollection.updateOne(
      {
        departureCode,
        arrivalCode,
      },
      {
        $set: {
          departureCode,
          arrivalCode,
          emissions_kg: emissions,
          distance_km: distance,
          emissions_per_km: parseFloat((emissions / distance).toFixed(3)),
          timestamp: new Date(),
        },
      },
      { upsert: true }
    );

    return true;
  } catch (error) {
    logger.error(`Error saving flight emissions: ${error.message}`);
    return false;
  }
}
