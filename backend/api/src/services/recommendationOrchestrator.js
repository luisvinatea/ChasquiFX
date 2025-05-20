/**
 * Recommendation Orchestrator Service
 *
 * Coordinates the various components needed to generate travel recommendations:
 * - Database operations for cache and history
 * - Forex data retrieval and analysis
 * - Flight data integration
 * - Recommendation algorithm and scoring
 */

import { getLogger } from "../utils/logger.js";
import cacheService from "../services/cacheService.js";
const { getCachedForexData, cacheForexData } = cacheService;
import {
  calculateTrend,
  getExchangeRate,
  loadConsolidatedForexData,
} from "../services/forexService-v2.js";
import {
  getRoutesForAirport,
  getAirportCountryMap,
} from "../services/geoService-v2.js";
import {
  getMultipleFares,
  estimateFlightPrice,
} from "../services/flightService-v2.js";

// Initialize logger
const logger = getLogger("recommendation-orchestrator");

/**
 * Main function to orchestrate the recommendation process
 *
 * @param {Object} params - Recommendation parameters
 * @param {string} params.baseCurrency - Base currency code (e.g., 'USD')
 * @param {string} params.departureAirport - Departure airport code (IATA)
 * @param {string} [params.outboundDate] - Outbound date (YYYY-MM-DD)
 * @param {string} [params.returnDate] - Return date (YYYY-MM-DD)
 * @param {string} [params.apiKey] - Optional API key for external services
 * @returns {Promise<Object>} - Recommendations response
 */
export async function generateRecommendations(params) {
  const { baseCurrency, departureAirport, outboundDate, returnDate, apiKey } =
    params;

  logger.info(
    `Generating recommendations for ${baseCurrency} from ${departureAirport}`
  );

  try {
    // Step 1: Get forex data
    const forexData = await loadConsolidatedForexData(baseCurrency);

    if (!forexData) {
      throw new Error("Failed to load forex data");
    }

    // Step 2: Get available routes from departure airport
    const routes = await getRoutesForAirport(departureAirport);

    if (!routes || routes.length === 0) {
      throw new Error(
        `No routes found for departure airport: ${departureAirport}`
      );
    }

    // Step 3: Get airport-country mapping
    const airportCountryMap = await getAirportCountryMap();

    // Step 4: Prepare destination recommendations
    const recommendations = [];

    // Process each potential destination
    for (const destination of routes) {
      try {
        const destinationAirport = destination.destinationCode;
        const country = airportCountryMap[destinationAirport]?.country;
        const currencyCode = getCurrencyForCountry(country);

        if (!currencyCode) {
          logger.debug(
            `Skipping ${destinationAirport}: No currency code for ${country}`
          );
          continue;
        }

        // Create currency pair code
        const currencyPair = `${baseCurrency}${currencyCode}=X`;

        // Get exchange rate
        const exchangeRate = getExchangeRate(forexData, currencyPair);

        if (!exchangeRate) {
          logger.debug(
            `Skipping ${destinationAirport}: No exchange rate for ${currencyPair}`
          );
          continue;
        }

        // Calculate trend for this currency pair
        const trend = calculateTrend(forexData, currencyPair);

        // Get or estimate flight fare
        let flightFare;
        if (outboundDate && returnDate) {
          flightFare = await estimateFlightPrice(
            departureAirport,
            destinationAirport,
            {
              outboundDate,
              returnDate,
              apiKey,
            }
          );
        } else {
          // Use average fare if dates not provided
          flightFare = destination.averageFare || 500; // Default fallback
        }

        // Calculate recommendation score
        // Higher score = better recommendation (favorable exchange rate + recent positive trend)
        const exchangeRateFactor =
          exchangeRate > 1 ? exchangeRate : 1 / exchangeRate;
        const trendFactor = (trend + 1) / 2; // Normalize trend from [-1,1] to [0,1]
        const fareFactor = 1000 / (flightFare + 100); // Inverse relationship with fare

        const score =
          exchangeRateFactor * 0.4 + trendFactor * 0.4 + fareFactor * 0.2;

        // Build recommendation object
        const recommendation = {
          destination: {
            airportCode: destinationAirport,
            city:
              destination.city ||
              airportCountryMap[destinationAirport]?.city ||
              "",
            country: country || "",
          },
          exchangeRate: {
            rate: exchangeRate,
            baseCurrency: baseCurrency,
            targetCurrency: currencyCode,
            trend: trend,
          },
          flight: {
            departureAirport,
            destinationAirport,
            outboundDate: outboundDate || null,
            returnDate: returnDate || null,
            estimatedFare: flightFare,
          },
          score: score,
        };

        recommendations.push(recommendation);
      } catch (destError) {
        // Log error but continue processing other destinations
        logger.error(
          `Error processing destination ${destination.destinationCode}: ${destError.message}`
        );
      }
    }

    // Step 5: Sort recommendations by score (descending)
    const sortedRecommendations = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Limit to top 10

    return {
      status: "success",
      count: sortedRecommendations.length,
      baseCurrency,
      departureAirport,
      recommendations: sortedRecommendations,
    };
  } catch (error) {
    logger.error(`Recommendation generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Save a user's recommendation to history
 *
 * @param {string} userId - User ID
 * @param {Object} recommendation - Recommendation to save
 * @returns {Promise<Object>} - Saved recommendation
 */
export async function saveUserRecommendation(userId, recommendation) {
  // Implementation to save to database
  logger.info(`Saving recommendation for user ${userId}`);

  try {
    // Validate recommendation
    if (!recommendation || !recommendation.destination) {
      throw new Error("Invalid recommendation format");
    }

    // Add timestamp and user ID
    const savedRecommendation = {
      ...recommendation,
      userId,
      savedAt: new Date().toISOString(),
    };

    // Save to database - this will be implemented in the controller
    return savedRecommendation;
  } catch (error) {
    logger.error(`Failed to save recommendation: ${error.message}`);
    throw error;
  }
}

/**
 * Get currency code for a country
 *
 * @param {string} countryName - Country name
 * @returns {string|null} - Currency code or null if not found
 */
function getCurrencyForCountry(countryName) {
  if (!countryName) return null;

  // Map common countries to their currency codes
  // In a production app, this would come from a database or API
  const countryCurrencyMap = {
    "United States": "USD",
    Canada: "CAD",
    "United Kingdom": "GBP",
    Japan: "JPY",
    Australia: "AUD",
    "New Zealand": "NZD",
    Switzerland: "CHF",
    "European Union": "EUR",
    France: "EUR",
    Germany: "EUR",
    Italy: "EUR",
    Spain: "EUR",
    Mexico: "MXN",
    Brazil: "BRL",
    Argentina: "ARS",
    Colombia: "COP",
    Peru: "PEN",
    Chile: "CLP",
    "South Africa": "ZAR",
    China: "CNY",
    India: "INR",
    Singapore: "SGD",
    Thailand: "THB",
    // Add more as needed
  };

  return countryCurrencyMap[countryName] || null;
}

export default {
  generateRecommendations,
  saveUserRecommendation,
};
