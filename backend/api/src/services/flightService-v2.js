/**
 * Eimport { FlightFare } from '../models/FlightFare.js';
import { 
  getCachedFlightFare, 
  cacheFlightFare as dbCacheFlightFare,
  logApiCall
} from '../db/flight-db.js';anced Flight Service for ChasquiFX
 *
 * Provides flight data operations and fare estimations with improved modularity and error handling
 */

import axios from "axios";
import { getLogger } from "../utils/logger.js";
import { FlightFare } from "../models/FlightFare.js";
import { initMongoDB } from "../db/mongodb-client.js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Initialize logger
const logger = getLogger("flight-service");

// Handle ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Get API keys from environment variables
const SERPAPI_KEY = process.env.SERPAPI_API_KEY;
const SEARCHAPI_KEY = process.env.SEARCHAPI_API_KEY;

// Cache for flight data
const flightCache = {
  fares: {},
  lastUpdated: null,
  validityPeriodMs: 86400000, // 24 hours
};

// API status tracking
const apiStatus = {
  serpapi: {
    available: !!SERPAPI_KEY,
    quotaExceeded: false,
    lastError: null,
  },
  searchapi: {
    available: !!SEARCHAPI_KEY,
    quotaExceeded: false,
    lastError: null,
  },
};

/**
 * Initialize the flight service
 * @returns {Promise<boolean>} Success status
 */
export async function initFlightService() {
  try {
    logger.info("Initializing flight service");

    // Log API key status
    if (!SERPAPI_KEY && !SEARCHAPI_KEY) {
      logger.warn(
        "No API keys found. Flight fare queries will use simulated data."
      );
    } else if (!SERPAPI_KEY) {
      logger.info("SearchAPI key loaded successfully for flight data.");
    } else if (!SEARCHAPI_KEY) {
      logger.info("SerpAPI key loaded successfully for flight data.");
    } else {
      logger.info("Both API keys loaded successfully for flight data.");
    }

    // Load quota status from file if it exists
    await loadQuotaStatus();

    return true;
  } catch (error) {
    logger.error(`Failed to initialize flight service: ${error.message}`);
    return false;
  }
}

/**
 * Load API quota status from file
 * @returns {Promise<void>}
 */
async function loadQuotaStatus() {
  try {
    const quotaFile = path.resolve(
      __dirname,
      "../../../assets/data/forex/api_quota_status.json"
    );

    if (fs.existsSync(quotaFile)) {
      const quotaData = JSON.parse(fs.readFileSync(quotaFile, "utf8"));

      // Check if the quota exceeded status is recent (within 1 hour)
      if (quotaData.timestamp) {
        const quotaTime = new Date(quotaData.timestamp);
        const currentTime = new Date();
        const timeDiffMs = currentTime - quotaTime;

        // If quota exceeded in the last hour, consider it still active
        if (timeDiffMs < 3600000) {
          // 1 hour
          apiStatus.serpapi.quotaExceeded =
            quotaData.serpapi_exceeded || false;
          apiStatus.searchapi.quotaExceeded =
            quotaData.searchapi_exceeded || false;

          logger.info(
            `Loaded API quota status: SerpAPI exceeded=${apiStatus.serpapi.quotaExceeded}, SearchAPI exceeded=${apiStatus.searchapi.quotaExceeded}`
          );
        }
      }
    }
  } catch (error) {
    logger.warn(`Error loading quota status: ${error.message}`);
  }
}

/**
 * Save API quota status to file
 * @param {Object} status - Quota status object
 * @returns {Promise<void>}
 */
async function saveQuotaStatus(status = null) {
  try {
    const quotaDir = path.resolve(__dirname, "../../../assets/data/forex");
    const quotaFile = path.resolve(quotaDir, "api_quota_status.json");

    // Ensure directory exists
    if (!fs.existsSync(quotaDir)) {
      fs.mkdirSync(quotaDir, { recursive: true });
    }

    // Use provided status or current apiStatus
    const quotaData = status || {
      serpapi_exceeded: apiStatus.serpapi.quotaExceeded,
      searchapi_exceeded: apiStatus.searchapi.quotaExceeded,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(quotaFile, JSON.stringify(quotaData, null, 2));
    logger.info("Updated API quota status file");
  } catch (error) {
    logger.error(`Error saving quota status: ${error.message}`);
  }
}

/**
 * Make an API request to SerpAPI with error handling
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} Response data or error
 */
async function makeSerpApiRequest(params) {
  try {
    if (!SERPAPI_KEY || apiStatus.serpapi.quotaExceeded) {
      return { error: "SerpAPI key missing or quota exceeded" };
    }

    // Build the SerpAPI request URL
    const baseUrl = "https://serpapi.com/search";
    const requestParams = {
      ...params,
      api_key: SERPAPI_KEY,
    };

    // Execute the request
    const response = await axios.get(baseUrl, { params: requestParams });

    if (response.status === 200) {
      return response.data;
    } else {
      logger.warn(`SerpAPI request failed with status ${response.status}`);
      return { error: `Request failed with status ${response.status}` };
    }
  } catch (error) {
    // Check for quota exceeded errors
    if (
      error.message &&
      (error.message.toLowerCase().includes("quota") ||
        error.message.toLowerCase().includes("limit exceeded"))
    ) {
      apiStatus.serpapi.quotaExceeded = true;
      apiStatus.serpapi.lastError = error.message;
      saveQuotaStatus();

      logger.error(`SerpAPI quota exceeded: ${error.message}`);
      return {
        error: error.message,
        quota_exceeded: true,
      };
    }

    logger.error(`SerpAPI request error: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Make an API request to SearchAPI with error handling
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} Response data or error
 */
async function makeSearchApiRequest(params) {
  try {
    if (!SEARCHAPI_KEY || apiStatus.searchapi.quotaExceeded) {
      return { error: "SearchAPI key missing or quota exceeded" };
    }

    // Build the SearchAPI request URL
    const baseUrl = "https://www.searchapi.io/api/v1/search";
    const requestParams = {
      ...params,
      api_key: SEARCHAPI_KEY,
    };

    // Execute the request
    const response = await axios.get(baseUrl, { params: requestParams });

    if (response.status === 200) {
      return response.data;
    } else {
      logger.warn(`SearchAPI request failed with status ${response.status}`);
      return { error: `Request failed with status ${response.status}` };
    }
  } catch (error) {
    // Check for quota exceeded errors
    if (
      error.message &&
      (error.message.toLowerCase().includes("quota") ||
        error.message.toLowerCase().includes("limit exceeded"))
    ) {
      apiStatus.searchapi.quotaExceeded = true;
      apiStatus.searchapi.lastError = error.message;
      saveQuotaStatus();

      logger.error(`SearchAPI quota exceeded: ${error.message}`);
      return {
        error: error.message,
        quota_exceeded: true,
      };
    }

    logger.error(`SearchAPI request error: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Get flight fare from external API, database cache or simulation
 * @param {string} departureAirport - Departure airport IATA code
 * @param {string} arrivalAirport - Arrival airport IATA code
 * @param {string} outboundDate - Outbound date in YYYY-MM-DD format
 * @param {string} returnDate - Return date in YYYY-MM-DD format
 * @param {string} [currency='USD'] - Currency code for fare prices
 * @param {Object} [options={}] - Additional options
 * @returns {Promise<Object|null>} Flight fare information or null
 */
export async function getFlightFare(
  departureAirport,
  arrivalAirport,
  outboundDate,
  returnDate,
  currency = "USD",
  options = {}
) {
  try {
    logger.info(
      `Getting flight fare for ${departureAirport}-${arrivalAirport} (${outboundDate} to ${returnDate})`
    );

    // Check memory cache first
    const cacheKey = `${departureAirport}_${arrivalAirport}_${outboundDate}_${returnDate}_${currency}`;

    if (
      flightCache.fares[cacheKey] &&
      flightCache.lastUpdated &&
      Date.now() - flightCache.lastUpdated < flightCache.validityPeriodMs
    ) {
      logger.info(
        `Using cached flight fare for ${departureAirport}-${arrivalAirport}`
      );
      return flightCache.fares[cacheKey];
    }

    // Then check database cache
    let fare = await getCachedFlightFare(
      departureAirport,
      arrivalAirport,
      outboundDate,
      returnDate,
      currency
    );

    if (fare) {
      // Update memory cache
      flightCache.fares[cacheKey] = fare;
      flightCache.lastUpdated = Date.now();
      return fare;
    }

    // No cache hit, try live API data
    logger.info(
      `No cached flight fare found for ${departureAirport}-${arrivalAirport}, trying APIs`
    );

    // Try SerpAPI first
    if (SERPAPI_KEY && !apiStatus.serpapi.quotaExceeded) {
      fare = await getFlightFareFromSerpApi(
        departureAirport,
        arrivalAirport,
        outboundDate,
        returnDate,
        currency
      );

      if (fare && !fare.error) {
        // Cache the result
        await cacheFlightFare(
          departureAirport,
          arrivalAirport,
          outboundDate,
          returnDate,
          fare,
          currency
        );

        // Update memory cache
        flightCache.fares[cacheKey] = fare;
        flightCache.lastUpdated = Date.now();

        return fare;
      }
    }

    // Try SearchAPI as fallback
    if (SEARCHAPI_KEY && !apiStatus.searchapi.quotaExceeded) {
      fare = await getFlightFareFromSearchApi(
        departureAirport,
        arrivalAirport,
        outboundDate,
        returnDate,
        currency
      );

      if (fare && !fare.error) {
        // Cache the result
        await cacheFlightFare(
          departureAirport,
          arrivalAirport,
          outboundDate,
          returnDate,
          fare,
          currency
        );

        // Update memory cache
        flightCache.fares[cacheKey] = fare;
        flightCache.lastUpdated = Date.now();

        return fare;
      }
    }

    // Fall back to simulated data if both APIs fail
    logger.info(
      `Using simulated flight fare for ${departureAirport}-${arrivalAirport}`
    );
    fare = generateSimulatedFlightFare(
      departureAirport,
      arrivalAirport,
      outboundDate,
      returnDate,
      currency
    );

    // Cache the simulated fare
    flightCache.fares[cacheKey] = fare;
    flightCache.lastUpdated = Date.now();

    return fare;
  } catch (error) {
    logger.error(`Error in getFlightFare: ${error.message}`);
    return null;
  }
}

/**
 * Get flight fare from SerpAPI
 * @param {string} departureAirport - Departure airport IATA code
 * @param {string} arrivalAirport - Arrival airport IATA code
 * @param {string} outboundDate - Outbound date in YYYY-MM-DD format
 * @param {string} returnDate - Return date in YYYY-MM-DD format
 * @param {string} currency - Currency code
 * @returns {Promise<Object|null>} Flight fare or null
 */
async function getFlightFareFromSerpApi(
  departureAirport,
  arrivalAirport,
  outboundDate,
  returnDate,
  currency
) {
  try {
    logger.info(
      `Requesting flight fare from SerpAPI for ${departureAirport}-${arrivalAirport}`
    );

    const params = {
      engine: "google_flights",
      departure_id: departureAirport,
      arrival_id: arrivalAirport,
      outbound_date: outboundDate,
      return_date: returnDate,
      currency,
      hl: "en",
    };

    // Log the API call for analytics
    await logApiCall({
      endpoint: "serpapi/google_flights",
      requestData: {
        origin: departureAirport,
        destination: arrivalAirport,
        dates: `${outboundDate} to ${returnDate}`,
      },
    });

    const responseData = await makeSerpApiRequest(params);

    if (responseData.error) {
      return { error: responseData.error };
    }

    // Extract fare information from response
    return extractFlightFareFromApiResponse(
      responseData,
      currency,
      outboundDate,
      returnDate
    );
  } catch (error) {
    logger.error(`Error in getFlightFareFromSerpApi: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Get flight fare from SearchAPI
 * @param {string} departureAirport - Departure airport IATA code
 * @param {string} arrivalAirport - Arrival airport IATA code
 * @param {string} outboundDate - Outbound date in YYYY-MM-DD format
 * @param {string} returnDate - Return date in YYYY-MM-DD format
 * @param {string} currency - Currency code
 * @returns {Promise<Object|null>} Flight fare or null
 */
async function getFlightFareFromSearchApi(
  departureAirport,
  arrivalAirport,
  outboundDate,
  returnDate,
  currency
) {
  try {
    logger.info(
      `Requesting flight fare from SearchAPI for ${departureAirport}-${arrivalAirport}`
    );

    const params = {
      engine: "google_flights",
      departure_id: departureAirport,
      arrival_id: arrivalAirport,
      outbound_date: outboundDate,
      return_date: returnDate,
      currency,
      hl: "en",
    };

    // Log the API call for analytics
    await logApiCall({
      endpoint: "searchapi/google_flights",
      requestData: {
        origin: departureAirport,
        destination: arrivalAirport,
        dates: `${outboundDate} to ${returnDate}`,
      },
    });

    const responseData = await makeSearchApiRequest(params);

    if (responseData.error) {
      return { error: responseData.error };
    }

    // Extract fare information from response
    return extractFlightFareFromApiResponse(
      responseData,
      currency,
      outboundDate,
      returnDate
    );
  } catch (error) {
    logger.error(`Error in getFlightFareFromSearchApi: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Extract flight fare information from API response
 * @param {Object} responseData - API response data
 * @param {string} currency - Currency code
 * @param {string} outboundDate - Outbound date
 * @param {string} returnDate - Return date
 * @returns {Object} Structured flight fare
 */
function extractFlightFareFromApiResponse(
  responseData,
  currency,
  outboundDate,
  returnDate
) {
  try {
    // Process the API response
    let flightInfo = null;

    // First check best_flights section
    if (responseData.best_flights && responseData.best_flights.length) {
      flightInfo = responseData.best_flights[0];
    }
    // If no best_flights, check other_flights section
    else if (responseData.other_flights && responseData.other_flights.length) {
      flightInfo = responseData.other_flights[0];
    }

    if (!flightInfo) {
      return { error: "No flight information found in API response" };
    }

    // Extract price
    let price = 0;

    if (typeof flightInfo === "object" && flightInfo !== null) {
      price = flightInfo.price || 0;
    } else {
      logger.warn(`flightInfo is not an object: ${typeof flightInfo}`);
      return { error: "Invalid flight information format" };
    }

    if (typeof price === "string") {
      // Handle string price format
      const priceStr = price
        .replace(currency, "")
        .replace(/\$/g, "")
        .replace(/,/g, "")
        .trim();
      price = parseFloat(priceStr);
    }

    // Extract airlines
    let airlines = [];

    // Check if there are multiple flights in the itinerary
    if (
      typeof flightInfo === "object" &&
      flightInfo !== null &&
      flightInfo.flights &&
      Array.isArray(flightInfo.flights)
    ) {
      // Collect airlines from all flight segments
      for (const flight of flightInfo.flights) {
        if (
          typeof flight === "object" &&
          flight !== null &&
          flight.airline &&
          !airlines.includes(flight.airline)
        ) {
          airlines.push(flight.airline);
        }
      }
    }
    // Single airline for the entire itinerary
    else if (
      typeof flightInfo === "object" &&
      flightInfo !== null &&
      flightInfo.airline
    ) {
      const airline = flightInfo.airline;
      if (airline) {
        airlines.push(airline);
      }
    }
    // Explicit airlines list
    else if (
      typeof flightInfo === "object" &&
      flightInfo !== null &&
      flightInfo.airlines &&
      Array.isArray(flightInfo.airlines)
    ) {
      airlines = flightInfo.airlines || [];
    }

    // Extract duration
    let duration = "Unknown";
    if (
      typeof flightInfo === "object" &&
      flightInfo !== null &&
      flightInfo.total_duration !== undefined
    ) {
      // Convert minutes to hours and minutes format
      try {
        const totalMinutes = parseInt(flightInfo.total_duration || 0, 10);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        duration = `${hours}h ${minutes}m`;
      } catch (e) {
        duration = "Unknown";
      }
    }

    // Extract carbon emissions
    let carbonEmissions = null;
    if (
      typeof flightInfo === "object" &&
      flightInfo !== null &&
      flightInfo.carbon_emissions &&
      typeof flightInfo.carbon_emissions === "object"
    ) {
      const carbonInfo = flightInfo.carbon_emissions || {};
      if (typeof carbonInfo === "object" && carbonInfo !== null) {
        carbonEmissions = carbonInfo.this_flight;
      }
    }

    logger.info(
      `Successfully extracted flight data: ${price} ${currency}, duration: ${duration}`
    );

    // Ensure airlines is always an array of strings
    if (!Array.isArray(airlines)) {
      airlines = airlines ? [String(airlines)] : [];
    } else {
      airlines = airlines.filter((a) => a).map((a) => String(a));
    }

    return new FlightFare({
      price,
      currency,
      airlines,
      duration,
      outboundDate,
      returnDate,
      carbonEmissions,
    });
  } catch (error) {
    logger.error(
      `Error extracting flight fare from response: ${error.message}`
    );
    return { error: error.message };
  }
}

/**
 * Fetch flight data from database cache
 * @param {string} departureAirport - Departure airport IATA code
 * @param {string} arrivalAirport - Arrival airport IATA code
 * @param {string} outboundDate - Outbound date
 * @param {string} returnDate - Return date
 * @param {string} currency - Currency code
 * @returns {Promise<Object|null>} Flight fare or null if not found
 */
async function getFlightFareFromDatabase(
  departureAirport,
  arrivalAirport,
  outboundDate,
  returnDate,
  currency
) {
  // Use the database module function instead
  return await getCachedFlightFare(
    departureAirport,
    arrivalAirport,
    outboundDate,
    returnDate,
    currency
  );
}

/**
 * Save flight fare to database cache
 * @param {string} departureAirport - Departure airport IATA code
 * @param {string} arrivalAirport - Arrival airport IATA code
 * @param {string} outboundDate - Outbound date
 * @param {string} returnDate - Return date
 * @param {Object} fare - Flight fare object
 * @param {string} currency - Currency code
 * @param {number} expiryHours - Cache expiry in hours
 * @returns {Promise<boolean>} Success status
 */
async function cacheFlightFare(
  departureAirport,
  arrivalAirport,
  outboundDate,
  returnDate,
  fare,
  currency,
  expiryHours = 24
) {
  // Use the database module function instead
  return await dbCacheFlightFare(
    departureAirport,
    arrivalAirport,
    outboundDate,
    returnDate,
    fare,
    currency,
    expiryHours
  );
}

/**
 * Log API call to database for analytics
 * @param {Object} options - API call details
 * @returns {Promise<void>}
 */
async function logApiCall({
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
  } catch (error) {
    logger.error(`Error logging API call: ${error.message}`);
  }
}

/**
 * Generate simulated flight fare when APIs are unavailable
 * @param {string} departureAirport - Departure airport IATA code
 * @param {string} arrivalAirport - Arrival airport IATA code
 * @param {string} outboundDate - Outbound date
 * @param {string} returnDate - Return date
 * @param {string} currency - Currency code
 * @returns {Object} Simulated flight fare
 */
function generateSimulatedFlightFare(
  departureAirport,
  arrivalAirport,
  outboundDate,
  returnDate,
  currency = "USD"
) {
  try {
    // Validate input types
    if (typeof departureAirport !== 'string' || typeof arrivalAirport !== 'string') {
      throw new Error("Invalid input: departureAirport and arrivalAirport must be strings");
    }

    // Simulated fare data generation based on airport codes
    const basePrice =
      (departureAirport.charCodeAt(0) + arrivalAirport.charCodeAt(0)) * 2.5;

    // Using a deterministic "hash" function for consistent results
    const hashString = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      return hash;
    };

    const price = parseFloat(
      (
        basePrice *
        (1 + (Math.abs(hashString(arrivalAirport)) % 100) / 100)
      ).toFixed(2)
    );

    // Add some variety to the airlines
    const airlinesOptions = [
      ["AirSample", "ConnectFly"],
      ["GlobalAir", "RegionExpress"],
      ["SkyWings", "OceanAir", "MountainJet"],
    ];

    const airlines =
      airlinesOptions[
        Math.abs(hashString(departureAirport + arrivalAirport)) %
          airlinesOptions.length
      ];

    // Generate flight duration based on airport codes
    const hours =
      1 +
      ((departureAirport.charCodeAt(0) + arrivalAirport.charCodeAt(0)) % 10);
    const minutes =
      (departureAirport.charCodeAt(1) + arrivalAirport.charCodeAt(1)) % 60;
    const duration = `${hours}h ${minutes}m`;

    // Generate carbon emissions based on duration
    const carbonEmissions = hours * 100 + minutes * 1.5;

    return new FlightFare({
      price,
      currency,
      airlines,
      duration,
      outboundDate,
      returnDate,
      carbonEmissions,
    });
  } catch (error) {
    logger.error(`Error generating simulated flight fare: ${error.message}`);

    // Return a very basic fallback
    return new FlightFare({
      price: 500,
      currency,
      airlines: ["Unknown"],
      duration: "3h 0m",
      outboundDate,
      returnDate,
      carbonEmissions: 300,
    });
  }
}

/**
 * Estimate flight price based on distance, seasonality and current trends
 * @param {string} departureAirport - Departure airport IATA code
 * @param {string} arrivalAirport - Arrival airport IATA code
 * @param {Object} options - Estimation options
 * @returns {Promise<number>} Estimated price
 */
export async function estimateFlightPrice(
  departureAirport,
  arrivalAirport,
  options = {}
) {
  // Implementation will depend on geo service for distance calculation
  // This is a placeholder that will be implemented when geo service is ready
  return 0;
}

/**
 * Get multiple flight fares in parallel
 * @param {string} departureAirport - Departure airport IATA code
 * @param {Array<string>} arrivalAirports - List of arrival airport IATA codes
 * @param {string} outboundDate - Outbound date
 * @param {string} returnDate - Return date
 * @param {string} currency - Currency code
 * @returns {Promise<Object>} Dictionary mapping airport codes to fares
 */
export async function getMultipleFares(
  departureAirport,
  arrivalAirports,
  outboundDate,
  returnDate,
  currency = "USD"
) {
  try {
    logger.info(
      `Fetching fares for ${arrivalAirports.length} destinations from ${departureAirport}`
    );

    const results = {};

    // Use Promise.all to fetch all fares in parallel
    const farePromises = arrivalAirports.map(async (airport) => {
      const fare = await getFlightFare(
        departureAirport,
        airport,
        outboundDate,
        returnDate,
        currency
      );
      return { airport, fare };
    });

    const fares = await Promise.all(farePromises);

    // Convert array of results to object
    fares.forEach(({ airport, fare }) => {
      results[airport] = fare;
    });

    return results;
  } catch (error) {
    logger.error(`Error fetching multiple fares: ${error.message}`);
    return {};
  }
}

/**
 * Check API service status
 * @returns {Object} Status of all flight data services
 */
export function getServiceStatus() {
  return {
    service: "flight-service",
    operational: true,
    apis: {
      serpapi: {
        available: apiStatus.serpapi.available,
        quotaExceeded: apiStatus.serpapi.quotaExceeded,
      },
      searchapi: {
        available: apiStatus.searchapi.available,
        quotaExceeded: apiStatus.searchapi.quotaExceeded,
      },
    },
    simulationMode:
      !apiStatus.serpapi.available && !apiStatus.searchapi.available,
  };
}
