/**
 * Database operations for ChasquiFX Node.js backend
 * MongoDB implementation for caching API responses
 */

const logger = require("../utils/logger");
const { connectToDatabase } = require("./mongodb");
const { ForexCache, FlightCache, ApiCallLog } = require("./schemas");
const {
  generateCacheKey,
  standardizeFlightFilename,
  standardizeForexFilename,
} = require("../services/fileStandardizationService").default;

// Ensure database connection is established before operations
let dbInitialized = false;

async function ensureDbConnection() {
  if (!dbInitialized) {
    await connectToDatabase();
    dbInitialized = true;
  }
}

/**
 * Generate a standardized cache key for flight data based on file_renamer.py logic
 * @param {Object} params - Flight search parameters
 * @returns {String|Promise<String>} - Cache key using (departure_id)_(arrival_id)_(outbound_date)_(return_date) format
 */
function generateFlightCacheKey(params) {
  const { departure_id, arrival_id, outbound_date, return_date } = params;

  // If standardizeFlightFilename is available, use it
  if (standardizeFlightFilename) {
    const data = {
      search_parameters: {
        departure_id,
        arrival_id,
        outbound_date,
        return_date,
      },
    };
    return standardizeFlightFilename(data);
  }

  // Fallback to the original implementation
  return `${departure_id}_${arrival_id}_${outbound_date}_${return_date}`;
}

/**
 * Generate a standardized cache key for forex data based on file_renamer.py logic
 * @param {Object} params - Forex search parameters
 * @returns {String|Promise<String>} - Cache key using (q)_(created_at) format
 */
function generateForexCacheKey(params) {
  const { q } = params;

  // If standardizeForexFilename is available, use it
  if (standardizeForexFilename) {
    // Format date as YYYY-MM-DD-HH-MM-SS
    const now = new Date();
    const formattedDate = now
      .toISOString()
      .replace(/T/, "-")
      .replace(/\..+/, "")
      .replace(/:/g, "-");

    const data = {
      search_parameters: { q },
      search_metadata: {
        created_at: formattedDate,
      },
    };
    return standardizeForexFilename(data);
  }

  // Fallback to the original implementation
  const now = new Date();
  const formattedDate = now
    .toISOString()
    .replace(/T/, "-")
    .replace(/\..+/, "")
    .replace(/:/g, "-");

  return `${q}_${formattedDate}`;
}

/**
 * Check if a cache item is similar enough to the current request
 * @param {Object} requestParams - Current request parameters
 * @param {Object} cachedParams - Parameters from cached data
 * @returns {Boolean} - Whether the cache can be used
 */
function isCacheSimilarEnough(requestParams, cachedParams) {
  // For flights, match exact parameters
  if (cachedParams.departure_id && cachedParams.arrival_id) {
    return (
      cachedParams.departure_id === requestParams.departure_id &&
      cachedParams.arrival_id === requestParams.arrival_id &&
      cachedParams.outbound_date === requestParams.outbound_date &&
      cachedParams.return_date === requestParams.return_date
    );
  }

  // For forex, just match the currency pair
  if (cachedParams.q && requestParams.q) {
    return cachedParams.q === requestParams.q;
  }

  return false;
}

/**
 * Get cached flight data from MongoDB
 * @param {string} departureAirport - Departure airport code
 * @param {string} arrivalAirport - Arrival airport code
 * @param {string} outboundDate - Outbound date
 * @param {string} returnDate - Return date
 * @returns {Promise<Object|null>} - Cached flight data or null
 */
async function getCachedFlightData(
  departureAirport,
  arrivalAirport,
  outboundDate,
  returnDate
) {
  try {
    await ensureDbConnection();

    const cacheKey = generateFlightCacheKey({
      departure_id: departureAirport,
      arrival_id: arrivalAirport,
      outbound_date: outboundDate,
      return_date: returnDate,
    });

    logger.debug(`Looking for cached flight data with key: ${cacheKey}`);

    const cachedData = await FlightCache.findOne({ cacheKey });

    if (cachedData && new Date() < new Date(cachedData.expiresAt)) {
      logger.info(
        `Found valid cached flight data for ${departureAirport}-${arrivalAirport}`
      );
      return cachedData.data;
    }

    logger.debug(
      `No valid cache found for flight data: ${departureAirport}-${arrivalAirport}`
    );
    return null;
  } catch (error) {
    logger.error(`Error retrieving cached flight data: ${error.message}`);
    return null;
  }
}

/**
 * Cache flight data in MongoDB
 * @param {string} departureAirport - Departure airport code
 * @param {string} arrivalAirport - Arrival airport code
 * @param {string} outboundDate - Outbound date
 * @param {string} returnDate - Return date
 * @param {Object} data - Flight data to cache
 * @param {number} expiryHours - Cache expiry in hours
 * @returns {Promise<boolean>} - Success status
 */
async function cacheFlightData(
  departureAirport,
  arrivalAirport,
  outboundDate,
  returnDate,
  data,
  expiryHours = 24
) {
  try {
    await ensureDbConnection();

    // Create a data object with search parameters if they don't exist
    if (!data.search_parameters) {
      data.search_parameters = {
        departure_id: departureAirport,
        arrival_id: arrivalAirport,
        outbound_date: outboundDate,
        return_date: returnDate,
      };
    }

    // Generate a standardized cache key
    let cacheKey;
    try {
      cacheKey = await generateCacheKey(data, "flight");
    } catch (e) {
      // Fallback to simple key generation
      cacheKey = `${departureAirport}_${arrivalAirport}_${outboundDate}_${returnDate}`;
      logger.warn(`Using fallback cache key generation: ${e.message}`);
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Create or update the cache entry
    await FlightCache.findOneAndUpdate(
      { cacheKey },
      {
        cacheKey,
        searchParameters: {
          departure_id: departureAirport,
          arrival_id: arrivalAirport,
          outbound_date: outboundDate,
          return_date: returnDate,
        },
        data,
        expiresAt,
      },
      { upsert: true, new: true }
    );

    logger.info(
      `Cached flight data for ${departureAirport}-${arrivalAirport} with key: ${cacheKey}`
    );
    return true;
  } catch (error) {
    logger.error(`Error caching flight data: ${error.message}`);
    return false;
  }
}

/**
 * Get cached forex data from MongoDB
 * @param {string} currencyPair - Currency pair code (e.g., "USD-EUR")
 * @returns {Promise<Object|null>} - Cached forex data or null
 */
async function getCachedForexData(currencyPair) {
  try {
    await ensureDbConnection();

    // Find the most recent valid forex data for the currency pair
    const cachedData = await ForexCache.findOne({
      "searchParameters.q": currencyPair,
      expiresAt: { $gt: new Date() },
    }).sort({ "searchMetadata.created_at": -1 });

    if (cachedData) {
      logger.info(`Found valid cached forex data for ${currencyPair}`);
      return cachedData.data;
    }

    logger.debug(`No valid cache found for forex data: ${currencyPair}`);
    return null;
  } catch (error) {
    logger.error(`Error retrieving cached forex data: ${error.message}`);
    return null;
  }
}

/**
 * Cache forex data in MongoDB
 * @param {string} currencyPair - Currency pair code (e.g., "USD-EUR")
 * @param {Object} data - Forex data to cache
 * @param {number} expiryHours - Cache expiry in hours
 * @returns {Promise<boolean>} - Success status
 */
async function cacheForexData(currencyPair, data, expiryHours = 12) {
  try {
    await ensureDbConnection();

    const now = new Date();

    // Make sure search parameters and metadata exist
    if (!data.search_parameters) {
      data.search_parameters = { q: currencyPair };
    }
    if (!data.search_metadata) {
      data.search_metadata = { created_at: now };
    }

    // Generate a standardized cache key
    let cacheKey;
    try {
      cacheKey = await generateCacheKey(data, "forex");
    } catch (e) {
      // Fallback to simple key generation
      const formattedDate = now
        .toISOString()
        .replace(/T/, "-")
        .replace(/\..+/, "")
        .replace(/:/g, "-");
      cacheKey = `${currencyPair}_${formattedDate}`;
      logger.warn(`Using fallback cache key generation: ${e.message}`);
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Create or update cache entry (upsert to prevent duplicates)
    await ForexCache.findOneAndUpdate(
      { cacheKey },
      {
        cacheKey,
        searchParameters: {
          q: currencyPair,
        },
        searchMetadata: {
          created_at: data.search_metadata.created_at || now,
        },
        data,
        expiresAt,
      },
      { upsert: true, new: true }
    );

    logger.info(`Cached forex data for ${currencyPair} with key: ${cacheKey}`);
    return true;
  } catch (error) {
    logger.error(`Error caching forex data: ${error.message}`);
    return false;
  }
}

/**
 * Log API call to MongoDB for analytics
 * @param {Object} options - API call details
 * @param {string} options.endpoint - API endpoint
 * @param {Object} options.requestData - Request data
 * @param {number} options.responseStatus - Response status code
 * @param {string|null} [options.userId=null] - User ID if available
 * @returns {Promise<void>}
 */
async function logApiCall({
  endpoint,
  requestData,
  responseStatus,
  userId = null,
}) {
  try {
    await ensureDbConnection();

    // Generate a unique timestamp to avoid duplicate logs
    const timestamp = new Date();

    // Create a unique fingerprint for the log to avoid duplicates
    // This uses a combination of time (down to milliseconds) and a partial hash of the request data
    const requestHash = JSON.stringify(requestData).slice(0, 50);
    const fingerprint = `${endpoint}_${timestamp.getTime()}_${requestHash.replace(
      /\W/g,
      ""
    )}`;

    // Use updateOne with upsert to avoid duplicates
    await ApiCallLog.updateOne(
      {
        endpoint,
        timestamp,
        userId,
        // We use fingerprint as a unique field to prevent exact duplicates
        fingerprint,
      },
      {
        endpoint,
        requestData,
        responseStatus,
        userId,
        timestamp,
        fingerprint,
      },
      { upsert: true }
    );

    logger.debug(`Logged API call to ${endpoint}`);
  } catch (error) {
    logger.error(`Error logging API call: ${error.message}`);
  }
}

/**
 * Get flight data with the enhanced schema
 * @param {Object} params - Flight search parameters
 * @returns {Promise<Object>} - Flight data
 */
async function getEnhancedFlightData(params) {
  await ensureDbConnection();
  const { Flight } = require("./schemas");

  const { departure_id, arrival_id, outbound_date, return_date } = params;

  // Build query
  const query = {
    "route_info.departure_airport": departure_id,
    "route_info.arrival_airport": arrival_id,
  };

  // Add dates if provided
  if (outbound_date) {
    query["route_info.outbound_date"] = outbound_date;
  }

  if (return_date) {
    query["route_info.return_date"] = return_date;
  }

  const flightData = await Flight.findOne(query);
  return flightData;
}

/**
 * Find flights by price range
 * @param {Object} params - Search parameters
 * @param {number} params.minPrice - Minimum price
 * @param {number} params.maxPrice - Maximum price
 * @returns {Promise<Array>} - Flight data matching the price range
 */
async function findFlightsByPriceRange({ minPrice, maxPrice }) {
  await ensureDbConnection();
  const { Flight } = require("./schemas");

  const query = {};

  if (minPrice !== undefined) {
    query["price_range.min"] = { $gte: minPrice };
  }

  if (maxPrice !== undefined) {
    query["price_range.max"] = { $lte: maxPrice };
  }

  return Flight.find(query).select(
    "route route_info price_range best_flights_summary"
  );
}

/**
 * Find flights by route and filter for best carbon emissions
 * @param {Object} params - Search parameters
 * @param {string} params.departure_id - Departure airport IATA code
 * @param {string} params.arrival_id - Arrival airport IATA code
 * @param {boolean} [params.lowCarbon=true] - If true, sort by lowest carbon emissions
 * @returns {Promise<Array>} - Flight data matching the criteria
 */
async function findEcoFriendlyFlights({
  departure_id,
  arrival_id,
  lowCarbon = true,
}) {
  await ensureDbConnection();
  const { Flight } = require("./schemas");

  const query = {
    "route_info.departure_airport": departure_id,
    "route_info.arrival_airport": arrival_id,
  };

  // Find flights and sort by carbon emissions
  const sortDirection = lowCarbon ? 1 : -1; // 1 for ascending (low carbon), -1 for descending

  return Flight.find(query)
    .sort({ "best_flights_summary.carbon_emissions.amount": sortDirection })
    .select("route route_info best_flights_summary");
}

/**
 * Get flight stats for analytics
 * @returns {Promise<Object>} - Stats about flights in the database
 */
async function getFlightStats() {
  await ensureDbConnection();
  const { Flight } = require("./schemas");

  // Get total count
  const totalFlights = await Flight.countDocuments();

  // Get average price
  const priceAggregation = await Flight.aggregate([
    {
      $group: {
        _id: null,
        avgMinPrice: { $avg: "$price_range.min" },
        avgMaxPrice: { $avg: "$price_range.max" },
        lowestPrice: { $min: "$price_range.min" },
        highestPrice: { $max: "$price_range.max" },
      },
    },
  ]);

  // Get top airlines
  const airlinesAggregation = await Flight.aggregate([
    { $unwind: "$best_flights_summary" },
    { $group: { _id: "$best_flights_summary.airline", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  return {
    totalFlights,
    priceStats: priceAggregation[0] || {},
    topAirlines: airlinesAggregation.map((item) => ({
      airline: item._id,
      count: item.count,
    })),
  };
}

module.exports = {
  getCachedFlightData,
  cacheFlightData,
  getCachedForexData,
  cacheForexData,
  logApiCall,
  generateFlightCacheKey,
  generateForexCacheKey,
  isCacheSimilarEnough,
  getEnhancedFlightData,
  findFlightsByPriceRange,
  findEcoFriendlyFlights,
  getFlightStats,
};
