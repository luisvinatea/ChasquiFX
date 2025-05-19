/**
 * Recommendation service for ChasquiFX.
 * Combines forex and flight data to provide destination recommendations.
 */

import { warning, error, info } from "../utils/logger";
import { DestinationRecommendation, RecommendationsResponse } from "../models/schemas";
import { getExchangeRate, ensureFreshForexData, loadConsolidatedForexData } from "./forexService";
import { getRoutesForAirport, getAirportCountryMap } from "./geoService";
import { fetchMultipleFares } from "./flightService";

/**
 * Calculate the trend of a currency pair over a specified number of days.
 *
 * @param {Object} forexData - Object containing forex data
 * @param {string} currencyPair - Currency pair code (e.g., 'USDEUR=X')
 * @param {number} [days=30] - Number of days to calculate trend for
 * @returns {number} - Trend value between -1 and 1 (-1 being downward, 1 being upward)
 */
function calculateTrend(forexData, currencyPair, days = 30) {
  if (!forexData || Object.keys(forexData).length === 0) {
    return 0.0;
  }

  try {
    // Check if the currency pair exists in the data
    if (!forexData[currencyPair]) {
      warning(`Currency pair ${currencyPair} not found in forex data`);
      return 0.0;
    }

    // Get the data for this pair
    const pairData = forexData[currencyPair];

    // Handle edge cases
    if (!pairData || typeof pairData !== "object") {
      return 0.0;
    }

    // Sort data by date in ascending order if it's an array
    let dailyData = [];
    if (Array.isArray(pairData)) {
      dailyData = [...pairData].sort(
        (a, b) => new Date(a.Date) - new Date(b.Date)
      );
    } else {
      // If it's a single data point, we can't calculate trend
      dailyData = [pairData];
    }

    // Limit to the specified number of days
    dailyData = dailyData.slice(-days);

    if (dailyData.length < 2) {
      return 0.0;
    }

    // Extract exchange rates
    const yValues = dailyData.map((d) =>
      d.ExchangeRate !== undefined ? d.ExchangeRate : d.Close
    );

    if (yValues.some((v) => v === undefined)) {
      warning(
        "Neither ExchangeRate nor Close found in some data points"
      );
      return 0.0;
    }

    // Generate x values (sequential indices)
    const xValues = Array.from({ length: yValues.length }, (_, i) => i);
    const n = yValues.length;

    // Calculate linear regression slope
    // Formula: m = (n*Σ(xy) - Σx*Σy) / (n*Σ(x²) - (Σx)²)
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXSquared = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXSquared - sumX * sumX);

    // Normalize to range [-1, 1]
    const avgPrice = sumY / n;
    const normalizedSlope = (slope * days) / avgPrice;

    // Clamp to range [-1, 1]
    return Math.max(Math.min(normalizedSlope, 1.0), -1.0);
  } catch (e) {
    error(`Error calculating trend for ${currencyPair}: ${e.message}`);
    return 0.0;
  }
}

/**
 * Get exchange rate and trend for a currency pair.
 *
 * @param {Object} forexData - Object containing forex data
 * @param {string} baseCurrency - Base currency code (e.g., 'USD')
 * @param {string} quoteCurrency - Quote currency code (e.g., 'EUR')
 * @returns {Array} - Array of [exchangeRate, trend]
 */
function getExchangeRateWithTrend(forexData, baseCurrency, quoteCurrency) {
  const currencyPair = `${baseCurrency}${quoteCurrency}=X`;
  const inversePair = `${quoteCurrency}${baseCurrency}=X`;

  if (!forexData || Object.keys(forexData).length === 0) {
    warning("No forex data available");
    return [1.0, 0.0];
  }

  try {
    // Check if direct pair exists in the data
    const pairExists = !!forexData[currencyPair];
    const inverseExists = !!forexData[inversePair];

    // Direct pair found
    if (pairExists) {
      const pairData = forexData[currencyPair];

      // Determine which field contains the exchange rate
      let rate;
      if (Array.isArray(pairData)) {
        // Sort by date (descending) and take the most recent
        const sortedData = [...pairData].sort(
          (a, b) => new Date(b.Date) - new Date(a.Date)
        );
        rate =
          sortedData[0].ExchangeRate !== undefined
            ? sortedData[0].ExchangeRate
            : sortedData[0].Close;
      } else {
        // Single data point
        rate =
          pairData.ExchangeRate !== undefined
            ? pairData.ExchangeRate
            : pairData.Close;
      }

      if (rate === undefined) {
        warning(`No rate column found for ${currencyPair}`);
        return [1.0, 0.0];
      }

      // Ensure rate is a number
      const rateFloat = parseFloat(rate);

      // Calculate trend using our trend function
      const trend = calculateTrend(forexData, currencyPair);

      return [rateFloat, trend];
    }
    // Check if inverse pair exists
    else if (inverseExists) {
      const pairData = forexData[inversePair];

      // Determine which field contains the exchange rate
      let inverseValue;
      if (Array.isArray(pairData)) {
        // Sort by date (descending) and take the most recent
        const sortedData = [...pairData].sort(
          (a, b) => new Date(b.Date) - new Date(a.Date)
        );
        inverseValue =
          sortedData[0].ExchangeRate !== undefined
            ? sortedData[0].ExchangeRate
            : sortedData[0].Close;
      } else {
        // Single data point
        inverseValue =
          pairData.ExchangeRate !== undefined
            ? pairData.ExchangeRate
            : pairData.Close;
      }

      if (inverseValue === undefined) {
        warning(`No rate column found for ${inversePair}`);
        return [1.0, 0.0];
      }

      // Convert to float
      const inverseFloat = parseFloat(inverseValue);

      // Invert the rate
      let rateFloat = 1.0;
      if (inverseFloat !== 0) {
        rateFloat = 1.0 / inverseFloat;
      } else {
        warning(`Zero exchange rate found for ${inversePair}`);
      }

      // Calculate trend of inverse pair and negate it for our pair
      const inverseTrend = calculateTrend(forexData, inversePair);
      const trend = -inverseTrend; // Invert the trend

      return [rateFloat, trend];
    }
    // Try to calculate using USD as intermediate
    else {
      const baseUsdPair = `${baseCurrency}USD=X`;
      const usdQuotePair = `USD${quoteCurrency}=X`;

      let baseUsd = null;
      let usdQuote = null;

      // Try to get base/USD pair data
      if (forexData[baseUsdPair]) {
        const baseUsdData = forexData[baseUsdPair];
        if (Array.isArray(baseUsdData)) {
          // Sort by date (descending) and take the most recent
          const sortedData = [...baseUsdData].sort(
            (a, b) => new Date(b.Date) - new Date(a.Date)
          );
          baseUsd =
            sortedData[0].ExchangeRate !== undefined
              ? sortedData[0].ExchangeRate
              : sortedData[0].Close;
        } else {
          baseUsd =
            baseUsdData.ExchangeRate !== undefined
              ? baseUsdData.ExchangeRate
              : baseUsdData.Close;
        }
        baseUsd = parseFloat(baseUsd);
      }

      // Try to get USD/quote pair data
      if (forexData[usdQuotePair]) {
        const usdQuoteData = forexData[usdQuotePair];
        if (Array.isArray(usdQuoteData)) {
          // Sort by date (descending) and take the most recent
          const sortedData = [...usdQuoteData].sort(
            (a, b) => new Date(b.Date) - new Date(a.Date)
          );
          usdQuote =
            sortedData[0].ExchangeRate !== undefined
              ? sortedData[0].ExchangeRate
              : sortedData[0].Close;
        } else {
          usdQuote =
            usdQuoteData.ExchangeRate !== undefined
              ? usdQuoteData.ExchangeRate
              : usdQuoteData.Close;
        }
        usdQuote = parseFloat(usdQuote);
      }

      // If direct pairs not found, try the API
      if (baseUsd === null) {
        baseUsd = getExchangeRate(baseCurrency, "USD");
      }

      if (usdQuote === null) {
        usdQuote = getExchangeRate("USD", quoteCurrency);
      }

      if (baseUsd && usdQuote) {
        const rate = baseUsd * usdQuote;
        // We can't calculate accurate trend in this case
        return [rate, 0.0];
      }

      warning(
        `Exchange rate not found for ${baseCurrency}/${quoteCurrency}`
      );
      return [1.0, 0.0];
    }
  } catch (e) {
    error(
      `Error getting exchange rate for ${baseCurrency}/${quoteCurrency}: ${e.message}`
    );
    return [1.0, 0.0];
  }
}

/**
 * Get destination recommendations based on forex trends and available routes.
 *
 * @param {string} departureAirport - IATA code of departure airport
 * @param {string} baseCurrency - Base currency code (e.g., 'USD')
 * @param {Object} options - Options object
 * @param {number} [options.limit=10] - Maximum number of recommendations to return
 * @param {number} [options.minTrend=-1.0] - Minimum trend value to include (-1 to 1)
 * @param {boolean} [options.includeFares=false] - Whether to include flight fares
 * @param {string} [options.outboundDate=null] - Departure date in YYYY-MM-DD format
 * @param {string} [options.returnDate=null] - Return date in YYYY-MM-DD format
 * @returns {Promise<RecommendationsResponse>} - RecommendationsResponse object
 */
async function getRecommendations(
  departureAirport,
  baseCurrency,
  options = {}
) {
  info(
    `Generating recommendations for ${departureAirport} in ${baseCurrency}`
  );

  // Set defaults for options
  const {
    limit = 10,
    minTrend = -1.0,
    includeFares = false,
    outboundDate = null,
    returnDate = null,
  } = options;

  // Get available routes
  const routes = await getRoutesForAirport(departureAirport);

  if (!routes || routes.length === 0) {
    warning(`No routes found for ${departureAirport}`);
    return new RecommendationsResponse({
      recommendations: [],
      baseCurrency,
    });
  }

  // Get airport-country mapping
  const airportCountryMap = await getAirportCountryMap();

  // Ensure we have fresh forex data before generating recommendations
  const updated = await ensureFreshForexData();
  if (updated) {
    info(
      "Using freshly updated real-time forex data from Google Finance"
    );
  } else {
    warning("Using existing forex data from filesystem");
  }

  // Get forex data (either updated or existing)
  const forexData = loadConsolidatedForexData();

  const recommendations = [];
  // Limit initial processing to 100 routes for performance
  const processableRoutes = routes.slice(0, 100);

  for (const route of processableRoutes) {
    const arrivalAirport =
      route.DestinationAirport || route["Destination airport"];
    if (!arrivalAirport || !airportCountryMap[arrivalAirport]) {
      continue;
    }

    const country = airportCountryMap[arrivalAirport];
    if (!country) {
      continue;
    }

    // Generate destination recommendation
    try {
      // Get local currency for destination country
      // This would be a lookup from country to currency code
      // For demo, we're using a simple mapping
      let destinationCurrency = "USD";
      if (["FR", "DE", "IT", "ES"].includes(country)) {
        destinationCurrency = "EUR";
      } else if (country === "GB") {
        destinationCurrency = "GBP";
      }

      // Skip if same currency
      if (destinationCurrency === baseCurrency) {
        continue;
      }

      // Get exchange rate and trend
      const [rate, trend] = getExchangeRateWithTrend(
        forexData,
        baseCurrency,
        destinationCurrency
      );

      // Skip if trend is below minimum
      if (trend < minTrend) {
        continue;
      }

      // Calculate score (higher is better)
      // Score is based on trend and exchange rate movement
      const score =
        trend * 5 + (trend > 0 ? 1 : -1) * (Math.abs(rate - 1) / 10);

      // Create recommendation object
      const recommendation = new DestinationRecommendation({
        departureAirport,
        arrivalAirport,
        city: route.DestinationCity || route["Destination city"] || "",
        country,
        exchangeRate: rate,
        exchangeRateTrend: trend,
        flightRoute: route,
        score,
        fare: null, // Will be filled later if includeFares is true
      });

      recommendations.push(recommendation);
    } catch (e) {
      error(`Error processing recommendation: ${e.message}`);
      continue;
    }
  }

  // Sort by score (descending) and limit results
  recommendations.sort((a, b) => b.score - a.score);
  const limitedRecommendations = recommendations.slice(0, limit);

  // Fetch flight fares if requested
  if (
    includeFares &&
    limitedRecommendations.length > 0 &&
    outboundDate &&
    returnDate
  ) {
    const arrivalAirports = limitedRecommendations.map(
      (rec) => rec.arrivalAirport
    );

    const fares = await fetchMultipleFares(
      departureAirport,
      arrivalAirports,
      outboundDate,
      returnDate,
      baseCurrency
    );

    // Add fares to recommendations
    for (const rec of limitedRecommendations) {
      rec.fare = fares[rec.arrivalAirport] || null;
    }
  }

  return new RecommendationsResponse({
    recommendations: limitedRecommendations,
    baseCurrency,
  });
}

export default {
  calculateTrend,
  getExchangeRateWithTrend,
  getRecommendations,
};
