/**
 * Cache utility service for ChasquiFX
 * Manages cache operations and MongoDB interactions
 */

const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const {
  getCachedFlightData,
  cacheFlightData,
  getCachedForexData,
  cacheForexData,
  generateFlightCacheKey,
  generateForexCacheKey,
  isCacheSimilarEnough,
} = require("../db/operations");
const {
  standardizeFlightFilename,
  standardizeForexFilename,
  writeStandardizedFile,
  generateCacheKey,
} = require("./fileStandardizationService");

/**
 * Format date to YYYY-MM-DD format
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date
 */
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

/**
 * Clean and standardize search parameters to ensure consistent cache keys
 * @param {Object} params - Search parameters
 * @returns {Object} - Cleaned search parameters
 */
function standardizeSearchParams(params) {
  const result = { ...params };

  // Clean strings and convert to uppercase for airport codes
  if (result.departure_id)
    result.departure_id = result.departure_id.trim().toUpperCase();
  if (result.arrival_id)
    result.arrival_id = result.arrival_id.trim().toUpperCase();

  // Format dates consistently
  if (result.outbound_date)
    result.outbound_date = formatDate(result.outbound_date);
  if (result.return_date) result.return_date = formatDate(result.return_date);

  // Standardize currency pair format (e.g., "USD-EUR")
  if (result.q) {
    result.q = result.q.trim().toUpperCase();
    if (!result.q.includes("-")) {
      // If the currency pair doesn't use hyphens, standardize it
      if (result.q.length === 6) {
        result.q = `${result.q.substring(0, 3)}-${result.q.substring(3, 6)}`;
      }
    }
  }

  return result;
}

/**
 * Get flight data from cache or API
 * @param {Object} params - Search parameters
 * @param {Function} fetchCallback - Function to call if cache misses
 * @returns {Promise<Object>} - Flight data
 */
async function getFlightData(params, fetchCallback) {
  try {
    // Standardize search parameters
    const stdParams = standardizeSearchParams(params);
    const { departure_id, arrival_id, outbound_date, return_date } = stdParams;

    // Try to get data from cache
    const cachedData = await getCachedFlightData(
      departure_id,
      arrival_id,
      outbound_date,
      return_date
    );

    if (cachedData) {
      logger.info(`Using cached flight data for ${departure_id}-${arrival_id}`);
      return { data: cachedData, source: "cache" };
    }

    // Cache miss - fetch new data
    logger.info(`Cache miss for flight data ${departure_id}-${arrival_id}`);
    const apiData = await fetchCallback(stdParams);

    // Cache the new data
    if (apiData) {
      // Add necessary parameters to apiData for standardization
      if (!apiData.search_parameters) {
        apiData.search_parameters = {
          departure_id,
          arrival_id,
          outbound_date,
          return_date,
        };
      }

      // Cache in MongoDB
      await cacheFlightData(
        departure_id,
        arrival_id,
        outbound_date,
        return_date,
        apiData
      );

      // Write to filesystem with standardized filename
      await writeStandardizedFile(apiData, "flight");

      return { data: apiData, source: "api" };
    }

    return { data: null, source: null };
  } catch (error) {
    logger.error(`Error in getFlightData: ${error.message}`);
    throw error;
  }
}

/**
 * Get forex data from cache or API
 * @param {Object} params - Search parameters
 * @param {Function} fetchCallback - Function to call if cache misses
 * @returns {Promise<Object>} - Forex data
 */
async function getForexData(params, fetchCallback) {
  try {
    // Standardize search parameters
    const stdParams = standardizeSearchParams(params);
    const { q } = stdParams;

    // Try to get data from cache
    const cachedData = await getCachedForexData(q);

    if (cachedData) {
      logger.info(`Using cached forex data for ${q}`);
      return { data: cachedData, source: "cache" };
    }

    // Cache miss - fetch new data
    logger.info(`Cache miss for forex data ${q}`);
    const apiData = await fetchCallback(stdParams);

    // Cache the new data
    if (apiData) {
      // Add necessary parameters to apiData for standardization
      if (!apiData.search_parameters) {
        apiData.search_parameters = { q };
      }
      if (!apiData.search_metadata) {
        apiData.search_metadata = {
          created_at: new Date().toISOString(),
        };
      }

      // Cache in MongoDB
      await cacheForexData(q, apiData);

      // Write to filesystem with standardized filename
      await writeStandardizedFile(apiData, "forex");

      return { data: apiData, source: "api" };
    }

    return { data: null, source: null };
  } catch (error) {
    logger.error(`Error in getForexData: ${error.message}`);
    throw error;
  }
}

/**
 * Check if similar enough data already exists in cache
 * @param {string} type - Type of data ('flight' or 'forex')
 * @param {Object} params - Search parameters
 * @returns {Promise<boolean>} - Whether similar data exists
 */
async function hasSimilarCache(type, params) {
  // This function could be expanded to find similar but not exact matches
  // For now, we only return exact matches

  const stdParams = standardizeSearchParams(params);

  if (type === "flight") {
    const { departure_id, arrival_id, outbound_date, return_date } = stdParams;
    const cachedData = await getCachedFlightData(
      departure_id,
      arrival_id,
      outbound_date,
      return_date
    );
    return cachedData !== null;
  }

  if (type === "forex") {
    const { q } = stdParams;
    const cachedData = await getCachedForexData(q);
    return cachedData !== null;
  }

  return false;
}

module.exports = {
  getFlightData,
  getForexData,
  hasSimilarCache,
  standardizeSearchParams,
};
