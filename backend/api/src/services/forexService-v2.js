/**
 * Enhanced Forex Service for ChasquiFX
 *
 * Provides currency exchange data and operations
 */

import { getLogger } from "../utils/logger.js";
import { getCachedForexData, cacheForexData } from "./cacheService.js";
import axios from "axios";

// Initialize logger
const logger = getLogger("forex-service");

// Cache for forex data
const forexCache = {
  consolidated: {},
  lastUpdated: null,
  validityPeriodMs: 3600000, // 1 hour
};

/**
 * Load consolidated forex data for a base currency
 * @param {string} baseCurrency - Base currency code (e.g., 'USD')
 * @returns {Promise<Object>} Consolidated forex data
 */
export async function loadConsolidatedForexData(baseCurrency) {
  try {
    // Check if we have valid cached data
    const cacheKey = `forex_consolidated_${baseCurrency}`;

    // First check memory cache
    if (
      forexCache.consolidated[baseCurrency] &&
      forexCache.lastUpdated &&
      Date.now() - forexCache.lastUpdated < forexCache.validityPeriodMs
    ) {
      logger.info(`Using in-memory forex cache for ${baseCurrency}`);
      return forexCache.consolidated[baseCurrency];
    }

    // Then check database cache
    const cachedData = await getCachedForexData(cacheKey);

    if (cachedData) {
      // Update memory cache and return cached data
      forexCache.consolidated[baseCurrency] = cachedData;
      forexCache.lastUpdated = Date.now();
      logger.info(`Using database forex cache for ${baseCurrency}`);
      return cachedData;
    }

    // No cache hit, generate new data
    logger.info(
      `No forex cache found for ${baseCurrency}, generating fresh data`
    );

    // Get fresh data
    const freshData = await fetchForexData(baseCurrency);

    // Cache the results
    forexCache.consolidated[baseCurrency] = freshData;
    forexCache.lastUpdated = Date.now();

    // Save to database cache
    await cacheForexData(cacheKey, freshData);

    return freshData;
  } catch (error) {
    logger.error(`Error loading forex data: ${error.message}`);

    // Return empty data if everything fails
    return {};
  }
}

/**
 * Fetch forex data from external API
 * @param {string} baseCurrency - Base currency code (e.g., 'USD')
 * @returns {Promise<Object>} Forex data
 */
async function fetchForexData(baseCurrency) {
  try {
    // This would normally call an external API
    // For now, we'll generate sample data

    const currencies = [
      "USD",
      "EUR",
      "GBP",
      "JPY",
      "AUD",
      "CAD",
      "CHF",
      "CNY",
      "NZD",
    ];
    const forexData = {};

    // Generate data for each currency pair
    for (const currency of currencies) {
      // Skip if same as base currency
      if (currency === baseCurrency) continue;

      // Create pair code like USDEUR=X
      const pairCode = `${baseCurrency}${currency}=X`;

      // Generate mock data
      const mockRate = generateMockExchangeRate(baseCurrency, currency);
      const mockHistory = generateMockHistoricalRates(mockRate);

      forexData[pairCode] = {
        currentRate: mockRate,
        history: mockHistory,
      };
    }

    logger.info(
      `Generated forex data for ${baseCurrency} against ${
        Object.keys(forexData).length
      } currencies`
    );
    return forexData;
  } catch (error) {
    logger.error(`Error fetching forex data: ${error.message}`);
    throw error;
  }
}

/**
 * Generate a realistic exchange rate between two currencies
 * @param {string} base - Base currency code
 * @param {string} target - Target currency code
 * @returns {number} Exchange rate
 */
function generateMockExchangeRate(base, target) {
  // Realistic base rates as of 2025
  const baseRates = {
    USD: {
      EUR: 0.92,
      GBP: 0.78,
      JPY: 148.5,
      AUD: 1.49,
      CAD: 1.35,
      CHF: 0.88,
      CNY: 7.18,
      NZD: 1.62,
    },
    EUR: {
      USD: 1.09,
      GBP: 0.85,
      JPY: 162.3,
      AUD: 1.63,
      CAD: 1.47,
      CHF: 0.96,
      CNY: 7.87,
      NZD: 1.77,
    },
    GBP: {
      USD: 1.28,
      EUR: 1.17,
      JPY: 190.2,
      AUD: 1.91,
      CAD: 1.73,
      CHF: 1.13,
      CNY: 9.21,
      NZD: 2.07,
    },
    JPY: {
      USD: 0.0067,
      EUR: 0.0062,
      GBP: 0.0053,
      AUD: 0.01,
      CAD: 0.0091,
      CHF: 0.0059,
      CNY: 0.048,
      NZD: 0.011,
    },
    AUD: {
      USD: 0.67,
      EUR: 0.61,
      GBP: 0.52,
      JPY: 99.6,
      CAD: 0.91,
      CHF: 0.59,
      CNY: 4.82,
      NZD: 1.09,
    },
    CAD: {
      USD: 0.74,
      EUR: 0.68,
      GBP: 0.58,
      JPY: 110.1,
      AUD: 1.1,
      CHF: 0.65,
      CNY: 5.32,
      NZD: 1.2,
    },
    CHF: {
      USD: 1.13,
      EUR: 1.04,
      GBP: 0.88,
      JPY: 168.4,
      AUD: 1.69,
      CAD: 1.53,
      CNY: 8.15,
      NZD: 1.84,
    },
    CNY: {
      USD: 0.14,
      EUR: 0.13,
      GBP: 0.11,
      JPY: 20.7,
      AUD: 0.21,
      CAD: 0.19,
      CHF: 0.12,
      NZD: 0.23,
    },
    NZD: {
      USD: 0.62,
      EUR: 0.57,
      GBP: 0.48,
      JPY: 91.9,
      AUD: 0.92,
      CAD: 0.84,
      CHF: 0.54,
      CNY: 4.43,
    },
  };

  // Return a realistic rate with small random variation
  if (baseRates[base] && baseRates[base][target]) {
    const baseRate = baseRates[base][target];
    const variation = Math.random() * 0.1 - 0.05; // +/- 5%
    return baseRate * (1 + variation);
  }

  // Fallback to inverse rate if available
  if (baseRates[target] && baseRates[target][base]) {
    const inverseRate = baseRates[target][base];
    const variation = Math.random() * 0.1 - 0.05; // +/- 5%
    return 1 / (inverseRate * (1 + variation));
  }

  // Default random rate (should not get here with our currency set)
  return 1 + Math.random() * 2;
}

/**
 * Generate historical rates for a currency pair
 * @param {number} currentRate - Current exchange rate
 * @returns {Array<Object>} Historical rates
 */
function generateMockHistoricalRates(currentRate) {
  // Generate 30 days of data
  const history = [];
  let rate = currentRate;

  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Add some random variation day to day (+/- 1%)
    const dailyChange = (Math.random() * 0.02 - 0.01) * rate;
    rate = rate + dailyChange;

    history.push({
      date: date.toISOString().split("T")[0],
      rate: rate,
    });
  }

  return history;
}

/**
 * Calculate the trend of a currency pair over a specified number of days
 *
 * @param {Object} forexData - Object containing forex data
 * @param {string} currencyPair - Currency pair code (e.g., 'USDEUR=X')
 * @param {number} [days=30] - Number of days to calculate trend for
 * @returns {number} - Trend value between -1 and 1 (-1 being downward, 1 being upward)
 */
export function calculateTrend(forexData, currencyPair, days = 30) {
  if (!forexData || Object.keys(forexData).length === 0) {
    return 0.0;
  }

  try {
    // Check if the currency pair exists in the data
    if (!forexData[currencyPair]) {
      logger.warn(`Currency pair ${currencyPair} not found in forex data`);
      return 0.0;
    }

    // Get the data for this pair
    const pairData = forexData[currencyPair];

    // Handle edge cases
    if (!pairData || typeof pairData !== "object") {
      return 0.0;
    }

    // If we have history data, use it
    if (pairData.history && Array.isArray(pairData.history)) {
      // Limit to the specified number of days
      const relevantHistory = pairData.history.slice(-days);

      if (relevantHistory.length < 2) return 0.0;

      // Calculate change from first to last day
      const firstRate = relevantHistory[0].rate;
      const lastRate = relevantHistory[relevantHistory.length - 1].rate;

      // Calculate percentage change
      const percentChange = (lastRate - firstRate) / firstRate;

      // Normalize to a value between -1 and 1
      // A change of +/-10% or more will max out the scale
      return Math.max(-1, Math.min(1, percentChange * 10));
    }

    // If no history data, return neutral trend
    return 0.0;
  } catch (error) {
    logger.error(`Error calculating trend: ${error.message}`);
    return 0.0;
  }
}

/**
 * Get the current exchange rate for a currency pair
 *
 * @param {Object} forexData - Object containing forex data
 * @param {string} currencyPair - Currency pair code (e.g., 'USDEUR=X')
 * @returns {number|null} - Exchange rate or null if not found
 */
export function getExchangeRate(forexData, currencyPair) {
  if (!forexData || !currencyPair) return null;

  try {
    // Check if the currency pair exists
    if (!forexData[currencyPair]) {
      logger.debug(`Currency pair ${currencyPair} not found in forex data`);
      return null;
    }

    // Get the current rate
    if (forexData[currencyPair].currentRate) {
      return forexData[currencyPair].currentRate;
    }

    // If no current rate but we have history, use latest
    if (
      forexData[currencyPair].history &&
      Array.isArray(forexData[currencyPair].history)
    ) {
      const history = forexData[currencyPair].history;
      if (history.length > 0) {
        return history[history.length - 1].rate;
      }
    }

    // If no usable rate data
    return null;
  } catch (error) {
    logger.error(`Error getting exchange rate: ${error.message}`);
    return null;
  }
}

/**
 * Check if forex data is available for a given currency
 * @param {string} currency - Currency code
 * @returns {Promise<boolean>} Whether data is available
 */
export async function isForexDataAvailable(currency) {
  try {
    const data = await loadConsolidatedForexData(currency);
    return data && Object.keys(data).length > 0;
  } catch (error) {
    logger.error(`Error checking forex data availability: ${error.message}`);
    return false;
  }
}

export default {
  loadConsolidatedForexData,
  calculateTrend,
  getExchangeRate,
  isForexDataAvailable,
};
