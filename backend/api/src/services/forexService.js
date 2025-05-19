/**
 * Forex data service for ChasquiFX Node.js backend.
 * Manages fetching, processing, and analyzing forex data.
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const logger = require("../utils/logger");
const {
  getCachedForexData,
  cacheForexData,
  logApiCall,
} = require("../db/operations");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

// Configuration paths
const DEFAULT_FOREX_DATA_PATH = path.resolve(
  __dirname,
  "../../../assets/data/forex/forex_data.json"
);
const DEFAULT_FOREX_MAPPINGS_PATH = path.resolve(
  __dirname,
  "../../../assets/data/forex/forex_mappings.json"
);
const DEFAULT_CURRENCY_CODES_PATH = path.resolve(
  __dirname,
  "../../../assets/data/forex/currency_codes.json"
);

// Get API keys from environment variables
const SERPAPI_KEY = process.env.SERPAPI_API_KEY;
const SEARCHAPI_KEY = process.env.SEARCHAPI_API_KEY;

// Log API key status
if (!SERPAPI_KEY && !SEARCHAPI_KEY) {
  logger.warn(
    "No API keys found in environment variables. Forex data queries will use synthetic data."
  );
} else if (!SERPAPI_KEY) {
  logger.info("SEARCHAPI_API_KEY loaded successfully for forex data.");
} else if (!SEARCHAPI_KEY) {
  logger.info("SERPAPI_API_KEY loaded successfully for forex data.");
} else {
  logger.info("Both API keys loaded successfully for forex data.");
}

/**
 * Load forex data from JSON file
 * @param {string} filePath - Path to the forex data file
 * @returns {Object} - Forex data as an object
 */
function loadForexData(filePath = DEFAULT_FOREX_DATA_PATH) {
  if (!fs.existsSync(filePath)) {
    logger.warn(`Forex data file not found: ${filePath}`);
    return {};
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return data;
  } catch (e) {
    logger.error(`Error loading forex data: ${e.message}`);
    return {};
  }
}

/**
 * Load consolidated forex data
 * @returns {Object} - Consolidated forex data
 */
function loadConsolidatedForexData() {
  const filePath = path.resolve(
    path.dirname(DEFAULT_FOREX_DATA_PATH),
    "consolidated_forex_data.json"
  );

  if (!fs.existsSync(filePath)) {
    logger.warn(`Consolidated forex data file not found: ${filePath}`);
    return {};
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    logger.info(
      `Loaded consolidated forex data with ${
        Object.keys(data).length
      } currency pairs`
    );
    return data;
  } catch (e) {
    logger.error(`Error loading consolidated forex data: ${e.message}`);
    return {};
  }
}

/**
 * Load forex mappings from JSON file
 * @param {string} filePath - Path to the forex mappings file
 * @returns {Object} - Forex mappings
 */
function loadForexMappings(filePath = DEFAULT_FOREX_MAPPINGS_PATH) {
  if (!fs.existsSync(filePath)) {
    logger.warn(`Forex mappings file not found: ${filePath}`);
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    logger.error(`Error loading forex mappings: ${e.message}`);
    return {};
  }
}

/**
 * Load currency codes from JSON file
 * @param {string} filePath - Path to the currency codes file
 * @returns {Object} - Currency codes mapping
 */
function loadCurrencyCodes(filePath = DEFAULT_CURRENCY_CODES_PATH) {
  if (!fs.existsSync(filePath)) {
    logger.warn(`Currency codes file not found: ${filePath}`);
    return {};
  }

  try {
    const currencyData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    // Convert country-to-code mapping to code-to-code mapping
    const result = {};
    Object.entries(currencyData).forEach(([country, code]) => {
      result[code] = code;
    });
    return result;
  } catch (e) {
    logger.error(`Error loading currency codes: ${e.message}`);
    return {};
  }
}

/**
 * Get exchange rate between two currencies
 * @param {string} baseCurrency - Base currency code (e.g., 'USD')
 * @param {string} quoteCurrency - Quote currency code (e.g., 'EUR')
 * @returns {number|null} - Exchange rate or null if not available
 */
function getExchangeRate(baseCurrency, quoteCurrency) {
  const forexData = loadForexData();

  if (Object.keys(forexData).length === 0) {
    logger.warn("No forex data available");
    return null;
  }

  // Try direct pair
  const currencyPair = `${baseCurrency}${quoteCurrency}=X`;
  if (forexData[currencyPair]) {
    try {
      const value = forexData[currencyPair].Close;
      return parseFloat(value);
    } catch (e) {
      logger.warn(`Error getting rate for ${currencyPair}: ${e.message}`);
      return null;
    }
  }

  // Try inverse pair
  const inversePair = `${quoteCurrency}${baseCurrency}=X`;
  if (forexData[inversePair]) {
    try {
      const value = forexData[inversePair].Close;
      const inverseRate = parseFloat(value);

      if (inverseRate > 0) {
        return 1.0 / inverseRate;
      } else {
        logger.warn(`Zero or negative rate for ${inversePair}`);
        return null;
      }
    } catch (e) {
      logger.warn(
        `Error getting inverse rate for ${inversePair}: ${e.message}`
      );
      return null;
    }
  }

  logger.warn(`Exchange rate not found for ${baseCurrency}/${quoteCurrency}`);
  return null;
}

/**
 * Execute a SerpAPI request with retry mechanism and exponential backoff
 * @param {Object} params - Parameters for the GoogleSearch request
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in seconds between retries
 * @returns {Promise<Object>} - API results or error information
 */
async function executeSerpApiRequest(
  params,
  maxRetries = 3,
  initialDelay = 2
) {
  let delay = initialDelay * 1000; // Convert to milliseconds
  let quotaLimitReached = false;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Use axios to make the SerpAPI request
      const response = await axios.get("https://serpapi.com/search", {
        params,
      });
      const results = response.data;

      // Check for API rate limiting errors or quota limits
      if (results.error) {
        const errorMsg = results.error.toLowerCase();

        // Check for quota limit messages
        if (
          errorMsg.includes("quota") ||
          errorMsg.includes("limit exceeded") ||
          errorMsg.includes("credits")
        ) {
          logger.error(`SerpAPI quota limit reached: ${results.error}`);
          quotaLimitReached = true;
          // Return error with specific flag for quota limits
          return {
            error: results.error,
            quota_exceeded: true,
            message:
              "API quota limit has been reached. Please check your SerpAPI credits or try again later.",
          };
        }

        // If rate limited and not the last attempt, retry
        if (
          errorMsg.includes("rate") &&
          errorMsg.includes("limit") &&
          attempt < maxRetries - 1
        ) {
          // Log the rate limiting
          const retryMsg = `Rate limit exceeded. Retry ${
            attempt + 1
          }/${maxRetries} in ${delay / 1000}s`;
          logger.warn(retryMsg);

          // Wait with exponential backoff before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, 60000); // Cap at 60 seconds
          continue;
        }
      }

      // Success or non-rate-limit error
      return results;
    } catch (e) {
      if (
        (e.message && e.message.toLowerCase().includes("quota")) ||
        (e.message && e.message.toLowerCase().includes("limit exceeded"))
      ) {
        logger.error(`SerpAPI quota limit exception: ${e.message}`);
        return {
          error: e.message,
          quota_exceeded: true,
          message:
            "API quota limit has been reached. Please check your SerpAPI credits or try again later.",
        };
      }

      if (attempt < maxRetries - 1) {
        // Log the error and retry
        logger.warn(
          `API request error: ${e.message}. Retry ${
            attempt + 1
          }/${maxRetries} in ${delay / 1000}s`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, 60000); // Cap at 60 seconds
      } else {
        // Final failure
        logger.error(
          `API request failed after ${maxRetries} attempts: ${e.message}`
        );
        return { error: e.message };
      }
    }
  }

  // This should never happen but just in case
  return {
    error: "Maximum retries reached with no successful response",
    quota_exceeded: quotaLimitReached,
  };
}

/**
 * Execute a SearchAPI request with retry mechanism and exponential backoff
 * @param {Object} params - Parameters for the API request
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in seconds between retries
 * @returns {Promise<Object>} - API results or error information
 */
async function executeSearchApiRequest(
  params,
  maxRetries = 3,
  initialDelay = 2
) {
  let delay = initialDelay * 1000; // Convert to milliseconds
  let quotaLimitReached = false;

  // Create a base URL for SearchAPI
  const baseUrl = "https://www.searchapi.io/api/v1/search";

  // Make sure the API key is included in the parameters
  if (!params.api_key && SEARCHAPI_KEY) {
    params.api_key = SEARCHAPI_KEY;
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Make the request
      const response = await axios.get(baseUrl, { params });
      const results = response.data;

      // Check for API errors in the response
      if (results.error) {
        const errorMsg = String(results.error).toLowerCase();

        // Check for quota limit messages
        if (
          errorMsg.includes("quota") ||
          errorMsg.includes("limit exceeded") ||
          errorMsg.includes("credits")
        ) {
          logger.error(`SearchAPI quota limit reached: ${results.error}`);
          quotaLimitReached = true;
          return {
            error: results.error,
            quota_exceeded: true,
            message:
              "API quota limit has been reached. Please check your SearchAPI credits.",
          };
        }

        // Handle rate limiting
        if (
          errorMsg.includes("rate") &&
          errorMsg.includes("limit") &&
          attempt < maxRetries - 1
        ) {
          logger.warn(
            `Rate limit exceeded. Retry ${attempt + 1}/${maxRetries} in ${
              delay / 1000
            }s`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, 60000); // Cap at 60 seconds
          continue;
        }
      }

      // Success
      return results;
    } catch (e) {
      if (
        (e.message && e.message.toLowerCase().includes("quota")) ||
        (e.message && e.message.toLowerCase().includes("limit exceeded"))
      ) {
        logger.error(`SearchAPI quota limit exception: ${e.message}`);
        return {
          error: e.message,
          quota_exceeded: true,
          message: "API quota limit has been reached.",
        };
      }

      if (attempt < maxRetries - 1) {
        logger.warn(
          `API request error: ${e.message}. Retry ${
            attempt + 1
          }/${maxRetries} in ${delay / 1000}s`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, 60000); // Cap at 60 seconds
      } else {
        logger.error(
          `API request failed after ${maxRetries} attempts: ${e.message}`
        );
        return { error: e.message };
      }
    }
  }

  return {
    error: "Maximum retries reached with no successful response",
    quota_exceeded: quotaLimitReached,
  };
}

/**
 * Update forex data by fetching from Google Finance via API services
 * @param {Array<string>} [currencies=null] - List of currency codes to fetch
 * @param {number} [days=30] - Number of days of historical data to retrieve
 * @returns {Promise<boolean|Object>} - True if successful, false if failed, or error object if quota exceeded
 */
async function updateForexData(currencies = null, days = 30) {
  try {
    // Check if any API key is available
    if (!SERPAPI_KEY && !SEARCHAPI_KEY) {
      logger.warn("No API keys found. Cannot fetch forex data.");
      return false;
    }

    // Use a default list of major currencies if none provided
    if (!currencies) {
      currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF"];
    }

    logger.info("Fetching forex data using Google Finance via APIs...");

    // Generate all currency pairs in Google Finance format (currency1-currency2)
    const pairs = [];
    currencies.forEach((base) => {
      currencies.forEach((quote) => {
        if (base !== quote) {
          pairs.push(`${base}-${quote}`);
        }
      });
    });

    // Prepare data structure for results
    const processedData = {};

    // Split into smaller batches to avoid rate limiting
    const batchSize = 1; // API services have stricter limits, process one pair at a time

    for (let i = 0; i < pairs.length; i += batchSize) {
      const batchPairs = pairs.slice(i, i + batchSize);
      const currentPair = batchPairs[0];
      logger.info(
        `Processing forex pair ${i + 1}/${pairs.length}: ${currentPair}`
      );

      try {
        let results;

        // First try SerpAPI if available
        if (SERPAPI_KEY) {
          const params = {
            engine: "google_finance",
            q: currentPair,
            api_key: SERPAPI_KEY,
          };

          results = await executeSerpApiRequest(params);

          // Check if we got quota exceeded error
          if (results.error && results.quota_exceeded && SEARCHAPI_KEY) {
            logger.warning(
              `SerpAPI quota exceeded for ${currentPair}, trying SearchAPI as fallback`
            );

            // Try SearchAPI as fallback
            const searchParams = {
              engine: "google_finance",
              q: currentPair,
              api_key: SEARCHAPI_KEY,
            };

            results = await executeSearchApiRequest(searchParams);
            if (!results.error) {
              logger.info(
                `Successfully used SearchAPI as fallback for ${currentPair}`
              );
            }
          }
        }
        // If no SerpAPI key, use SearchAPI directly
        else if (SEARCHAPI_KEY) {
          const params = {
            engine: "google_finance",
            q: currentPair,
            api_key: SEARCHAPI_KEY,
          };

          results = await executeSearchApiRequest(params);
        }

        // Check if both APIs failed due to quota
        if (results.error && results.quota_exceeded) {
          logger.error(
            `All API quotas exceeded for ${currentPair}: ${results.error}`
          );
          // Return the quota error so it can be handled by the caller
          return results;
        }

        // Extract current exchange rate from summary
        let currentRate = null;
        if (results.summary && results.summary.extracted_price) {
          currentRate = parseFloat(results.summary.extracted_price);
        }

        // Create a data entry with today's rate
        if (currentRate !== null) {
          const today = new Date().toISOString().split("T")[0];
          // Format symbol like Yahoo Finance for compatibility
          const symbol = `${currentPair.replace("-", "")}=X`;

          processedData[symbol] = {
            Date: today,
            Open: currentRate,
            High: currentRate * 1.005, // Estimate
            Low: currentRate * 0.995, // Estimate
            Close: currentRate,
            Volume: 0, // Not available
            Symbol: symbol,
            ExchangeRate: currentRate,
          };

          logger.info(`Got exchange rate for ${symbol}: ${currentRate}`);
        }

        // Sleep to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (batchErr) {
        logger.warn(`Error processing ${currentPair}: ${batchErr.message}`);
        continue;
      }
    }

    // Save the data if we have any
    if (Object.keys(processedData).length > 0) {
      // Save to JSON file
      logger.info(`Saving forex data to ${DEFAULT_FOREX_DATA_PATH}`);

      // Make sure the directory exists
      const dir = path.dirname(DEFAULT_FOREX_DATA_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        DEFAULT_FOREX_DATA_PATH,
        JSON.stringify(processedData, null, 2)
      );

      // Create consolidated format
      const outputPath = path.resolve(
        path.dirname(DEFAULT_FOREX_DATA_PATH),
        "consolidated_forex_data.json"
      );
      fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2));

      logger.info(`Saved consolidated forex data to ${outputPath}`);
      return true;
    } else {
      logger.warn("No data to save after processing");
      return false;
    }
  } catch (e) {
    logger.error(`Error updating forex data: ${e.message}`);
    return false;
  }
}

/**
 * Ensures forex data is up-to-date by trying to update it from API services
 * @returns {Promise<boolean>} - True if data was successfully updated or is already fresh
 */
async function ensureFreshForexData() {
  try {
    // Check if we need to update forex data based on freshness
    let needUpdate = true;

    // See if we have existing data and check its timestamp
    const forexPath = path.resolve(
      path.dirname(DEFAULT_FOREX_DATA_PATH),
      "consolidated_forex_data.json"
    );

    if (fs.existsSync(forexPath)) {
      try {
        // Check file modification time
        const stats = fs.statSync(forexPath);
        const modTime = stats.mtime.getTime();
        const now = Date.now();
        const hoursOld = (now - modTime) / 3600000; // Convert milliseconds to hours

        // If data is less than 3 hours old, we don't need to update
        if (hoursOld < 3) {
          logger.info(
            `Forex data is ${hoursOld.toFixed(1)} hours old, still fresh`
          );
          needUpdate = false;
        } else {
          logger.info(
            `Forex data is ${hoursOld.toFixed(1)} hours old, needs refresh`
          );
        }
      } catch (e) {
        logger.warn(`Error checking forex data age: ${e.message}`);
      }
    }

    // Update forex data if API key is available and update is needed
    if ((SERPAPI_KEY || SEARCHAPI_KEY) && needUpdate) {
      logger.info("Attempting to update forex data with real-time data...");
      const success = await updateForexData();
      if (success === true) {
        logger.info("Successfully updated forex data with real-time rates");
        return true;
      } else {
        logger.warn("Failed to update forex data, using existing data");
        return false;
      }
    } else if ((SERPAPI_KEY || SEARCHAPI_KEY) && !needUpdate) {
      // We have fresh data and an API key
      return true;
    } else {
      logger.warn("No API keys available, using existing forex data");
      return false;
    }
  } catch (e) {
    logger.error(`Error ensuring fresh forex data: ${e.message}`);
    return false;
  }
}

/**
 * Fetch current exchange rates for common currency pairs using Google Finance
 * @returns {Promise<Object>} - Dictionary mapping currency pairs to rates
 */
async function fetchQuickForexData() {
  try {
    // Check if API key is available
    if (!SERPAPI_KEY && !SEARCHAPI_KEY) {
      logger.warn("No API keys found. Cannot fetch forex data.");
      return {};
    }

    // Use a list of major currencies
    const currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF"];

    // Generate all currency pairs in Google Finance format
    const pairs = [];
    currencies.forEach((base) => {
      currencies.forEach((quote) => {
        if (base !== quote) {
          pairs.push({
            googlePair: `${base}-${quote}`,
            yahooPair: `${base}${quote}`,
          });
        }
      });
    });

    // Fetch exchange rates
    const results = {};

    // Process each pair with cache awareness
    for (const { googlePair, yahooPair } of pairs) {
      try {
        // First check cache
        const cachedData = await getCachedForexData(yahooPair);
        if (cachedData) {
          // Use cached data
          const rate = parseFloat(cachedData.rate || 0);
          results[yahooPair] = rate;
          logger.info(`Using cached rate for ${yahooPair}: ${rate}`);
          continue;
        }

        let searchResults = null;

        // Try SerpAPI first if available
        if (SERPAPI_KEY) {
          const params = {
            engine: "google_finance",
            q: googlePair,
            api_key: SERPAPI_KEY,
          };

          // Log API call
          await logApiCall({
            endpoint: "serpapi/google_finance",
            requestData: { query: googlePair },
            responseStatus: 200,
          });

          // Use our helper function for robust API calls
          searchResults = await executeSerpApiRequest(params);

          // Check if quota exceeded and we have SearchAPI as fallback
          if (
            searchResults.error &&
            searchResults.quota_exceeded &&
            SEARCHAPI_KEY
          ) {
            logger.warn(
              `SerpAPI quota exceeded for ${googlePair}, trying SearchAPI`
            );

            // Log fallback API call
            await logApiCall({
              endpoint: "searchapi/google_finance",
              requestData: { query: googlePair },
              responseStatus: 200,
            });

            // Try SearchAPI as fallback
            const searchParams = {
              engine: "google_finance",
              q: googlePair,
              api_key: SEARCHAPI_KEY,
            };

            searchResults = await executeSearchApiRequest(searchParams);
          }
        }
        // If no SerpAPI key but we have SearchAPI
        else if (SEARCHAPI_KEY) {
          const params = {
            engine: "google_finance",
            q: googlePair,
            api_key: SEARCHAPI_KEY,
          };

          // Log API call
          await logApiCall({
            endpoint: "searchapi/google_finance",
            requestData: { query: googlePair },
            responseStatus: 200,
          });

          // Use SearchAPI directly
          searchResults = await executeSearchApiRequest(params);
        }

        // Check if we got valid results and extract rate
        if (
          searchResults &&
          searchResults.summary &&
          typeof searchResults.summary === "object" &&
          searchResults.summary.extracted_price
        ) {
          const rate = parseFloat(searchResults.summary.extracted_price);
          results[yahooPair] = rate;
          logger.info(`Got rate for ${yahooPair}: ${rate}`);

          // Cache the result
          await cacheForexData(
            yahooPair,
            {
              rate: rate,
              timestamp: new Date().toISOString(),
            },
            3 // Cache for 3 hours
          );
        }

        // Sleep to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (e) {
        logger.warn(`Could not get data for ${googlePair}: ${e.message}`);
        continue;
      }
    }

    return results;
  } catch (e) {
    logger.error(`Error fetching quick forex data: ${e.message}`);
    return {};
  }
}

/**
 * Calculate the best execution price based on trade direction
 * @param {string} tradeDirection - Direction of trade ('BUY' or 'SELL')
 * @param {Array<number>} execPrices - List of execution prices
 * @returns {number} - Best execution price
 */
function calculateBestExecutionPrice(tradeDirection, execPrices) {
  if (tradeDirection === "BUY") {
    return Math.min(...execPrices);
  } else {
    // 'SELL'
    return Math.max(...execPrices);
  }
}

/**
 * Get exchange rates for a specific currency pair
 * @param {string} fromCurrency - Base currency code
 * @param {string} toCurrency - Target currency code
 * @param {string} [apiKey=null] - Optional API key to use
 * @returns {Promise<Object>} - Exchange rate data
 */
async function getExchangeRates(fromCurrency, toCurrency, apiKey = null) {
  logger.info(`Getting exchange rates for ${fromCurrency} to ${toCurrency}`);

  try {
    // If no API key is provided, use the environment ones
    const serpApiKey = apiKey || SERPAPI_KEY;

    // If neither API key is available, use synthetic data
    if (!serpApiKey && !SEARCHAPI_KEY) {
      logger.warn("No API keys available, returning synthetic data");

      // Generate synthetic data
      return {
        from: fromCurrency,
        to: toCurrency,
        rate: parseFloat((Math.random() * 1.5 + 0.5).toFixed(4)),
        timestamp: new Date().toISOString(),
        source: "synthetic",
      };
    }

    let results = null;
    let apiUsed = "none";

    // Try SerpAPI first if available
    if (serpApiKey) {
      // Prepare SerpAPI request
      const params = {
        engine: "google_finance",
        q: `${fromCurrency}${toCurrency}=X`,
        api_key: serpApiKey,
      };

      // Log the API call
      await logApiCall({
        endpoint: "serpapi",
        requestData: { query: "forex_rate" },
        responseStatus: 200,
      });

      // Make the request
      try {
        results = await executeSerpApiRequest(params);
        apiUsed = "serpapi";

        // Check for quota exceeded error
        if (
          results.error &&
          String(results.error).toLowerCase().includes("quota") &&
          SEARCHAPI_KEY
        ) {
          logger.warn("SerpAPI quota exceeded, trying SearchAPI as fallback");
          throw new Error("SerpAPI quota exceeded");
        }
      } catch (serpError) {
        // If SerpAPI failed and we have SearchAPI, try that as fallback
        if (SEARCHAPI_KEY) {
          logger.warn(
            `SerpAPI failed: ${serpError.message}, trying SearchAPI`
          );

          // Prepare SearchAPI request
          const searchParams = {
            engine: "google_finance",
            q: `${fromCurrency}${toCurrency}=X`,
            api_key: SEARCHAPI_KEY,
          };

          // Log the API call
          await logApiCall({
            endpoint: "searchapi",
            requestData: { query: "forex_rate" },
            responseStatus: 200,
          });

          results = await executeSearchApiRequest(searchParams);
          apiUsed = "searchapi";
        }
      }
    }
    // If we don't have SerpAPI key but have SearchAPI, use that directly
    else if (SEARCHAPI_KEY) {
      // Prepare SearchAPI request
      const params = {
        engine: "google_finance",
        q: `${fromCurrency}${toCurrency}=X`,
        api_key: SEARCHAPI_KEY,
      };

      // Log the API call
      await logApiCall({
        endpoint: "searchapi",
        requestData: { query: "forex_rate" },
        responseStatus: 200,
      });

      results = await executeSearchApiRequest(params);
      apiUsed = "searchapi";
    }

    if (results && results.error) {
      logger.error(`API error: ${results.error}`);
      return { error: results.error, source: apiUsed };
    }

    // Extract the rate from results based on API used
    let rate = null;

    if (apiUsed === "serpapi" && results) {
      if (results.finance_results && results.finance_results.exchange_rate) {
        rate = parseFloat(results.finance_results.exchange_rate);
      }
    } else if (apiUsed === "searchapi" && results) {
      if (
        results.summary &&
        typeof results.summary === "object" &&
        results.summary.extracted_price
      ) {
        rate = parseFloat(results.summary.extracted_price);
      }
    }

    return {
      from: fromCurrency,
      to: toCurrency,
      rate: rate,
      timestamp: new Date().toISOString(),
      source: apiUsed,
    };
  } catch (e) {
    logger.error(`Error getting exchange rates: ${e.message}`);
    return {
      error: e.message,
      type: e.constructor.name,
    };
  }
}

/**
 * Get the status of the forex service including API quota status, cache status, and data freshness
 * @returns {Object} - Service status information
 */
function getServiceStatus() {
  try {
    // Check API keys availability
    const serpapiStatus = SERPAPI_KEY ? "available" : "missing";
    const searchapiStatus = SEARCHAPI_KEY ? "available" : "missing";

    // Get cache stats
    const cacheDir = path.dirname(DEFAULT_FOREX_DATA_PATH);

    let cacheFiles = [];
    if (fs.existsSync(cacheDir)) {
      cacheFiles = fs.readdirSync(cacheDir).filter((f) => f.endsWith(".json"));
    }

    // Get the most recent file modification time
    let cacheFreshness = null;
    if (cacheFiles.length > 0) {
      const mostRecent = Math.max(
        ...cacheFiles.map((f) =>
          fs.statSync(path.join(cacheDir, f)).mtime.getTime()
        )
      );
      cacheFreshness = new Date(mostRecent).toISOString();
    }

    return {
      status: "operational",
      serpapi_key: serpapiStatus,
      searchapi_key: searchapiStatus,
      cache_files: cacheFiles.length,
      cache_freshness: cacheFreshness,
      timestamp: new Date().toISOString(),
    };
  } catch (e) {
    logger.error(`Error getting service status: ${e.message}`);
    return {
      error: e.message,
      type: e.constructor.name,
    };
  }
}

module.exports = {
  getExchangeRate,
  updateForexData,
  ensureFreshForexData,
  fetchQuickForexData,
  calculateBestExecutionPrice,
  getExchangeRates,
  getServiceStatus,
  loadForexData,
  loadConsolidatedForexData,
};
