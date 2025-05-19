/**
 * Flight data service for ChasquiFX.
 * Handles flight fare fetching and processing using API services.
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { get } from "axios";
import { warn, info, error as _error } from "../utils/logger";
import { getCachedFlightData, logApiCall } from "../db/operations";
import { FlightFare } from "../models/schemas";
require("dotenv").config({ path: resolve(__dirname, "../../../.env") });

// Get API keys from environment variables
const SERPAPI_KEY = process.env.SERPAPI_API_KEY;
const SEARCHAPI_KEY = process.env.SEARCHAPI_API_KEY;

// Log API key status
if (!SERPAPI_KEY && !SEARCHAPI_KEY) {
  warn(
    "No API keys found in environment variables. Flight fare queries will use simulated data."
  );
} else if (!SERPAPI_KEY) {
  info("SEARCHAPI_API_KEY loaded successfully for flight data.");
} else if (!SEARCHAPI_KEY) {
  info("SERPAPI_API_KEY loaded successfully for flight data.");
} else {
  info("Both API keys loaded successfully for flight data.");
}

/**
 * Check if API quotas have been exceeded based on status file
 * @returns {Object} Dictionary with quota status for each API
 */
function checkQuotaStatus() {
  try {
    // Try to read quota status from temporary file created by forex service
    const quotaFile = resolve(
      __dirname,
      "../../../assets/data/forex/api_quota_status.json"
    );

    if (existsSync(quotaFile)) {
      const quotaData = JSON.parse(readFileSync(quotaFile, "utf8"));

      // Check if the quota exceeded status is recent (within 1 hour)
      if (quotaData.timestamp) {
        try {
          const quotaTime = new Date(quotaData.timestamp);
          const currentTime = new Date();
          const timeDiff = (currentTime - quotaTime) / 1000; // in seconds

          // If quota exceeded in the last hour, consider it still active
          if (timeDiff < 3600) {
            // 1 hour
            return {
              serpapi: quotaData.serpapi_exceeded || false,
              searchapi: quotaData.searchapi_exceeded || false,
            };
          }
        } catch (e) {
          warn(`Error parsing quota timestamp: ${e.message}`);
        }
      }

      // No timestamp or parsing failed, just return the status
      return {
        serpapi: quotaData.serpapi_exceeded || false,
        searchapi: quotaData.searchapi_exceeded || false,
      };
    }
  } catch (e) {
    warn(`Error checking quota status: ${e.message}`);
  }

  return {
    serpapi: false,
    searchapi: false,
  }; // Default: assume quotas are not exceeded
}

/**
 * Execute a SearchAPI request with error handling
 * @param {string} baseUrl - Base URL for the API
 * @param {Object} params - Parameters for the API request
 * @returns {Promise<Object>} Dict with response data or error information
 */
async function executeSearchapiRequest(baseUrl, params) {
  try {
    // Make sure the API key is included in the parameters
    if (!params.api_key && SEARCHAPI_KEY) {
      params.api_key = SEARCHAPI_KEY;
    }

    // Make the request
    const response = await get(baseUrl, { params });
    return response.data;
  } catch (e) {
    if (
      (e.message && e.message.toLowerCase().includes("quota")) ||
      (e.message && e.message.toLowerCase().includes("limit exceeded"))
    ) {
      _error(`SearchAPI quota limit exception: ${e.message}`);
      return {
        error: e.message,
        quota_exceeded: true,
        message: "API quota limit has been reached.",
      };
    } else {
      _error(`SearchAPI request error: ${e.message}`);
      return { error: e.message };
    }
  }
}

/**
 * Fetch flight fare data using API services with fallback mechanism.
 * First checks the database cache before making API calls.
 * Logs API usage for analytics.
 *
 * @param {string} departureAirport - IATA code of departure airport
 * @param {string} arrivalAirport - IATA code of arrival airport
 * @param {string} outboundDate - Departure date in YYYY-MM-DD format
 * @param {string} returnDate - Return date in YYYY-MM-DD format
 * @param {string} [currency='USD'] - Currency code for fare prices
 * @param {string} [userId=null] - Optional user ID for logging
 * @returns {Promise<Object|null>} FlightFare object or null if not available
 */
async function fetchFlightFare(
  departureAirport,
  arrivalAirport,
  outboundDate,
  returnDate,
  currency = "USD",
  userId = null
) {
  info(
    `Fetching fare for ${departureAirport}-${arrivalAirport} (${outboundDate} to ${returnDate})`
  );

  // Check cache first
  const cachedData = await getCachedFlightData(
    departureAirport,
    arrivalAirport
  );
  if (cachedData) {
    info(
      `Using cached flight data for ${departureAirport}-${arrivalAirport}`
    );

    try {
      // Convert possibly single airline string to list for consistency
      let airlines = cachedData.airlines || [];
      if (typeof airlines === "string") {
        airlines = [airlines];
      } else if (!airlines.length && cachedData.airline) {
        airlines = [cachedData.airline || "Unknown"];
      }

      return new FlightFare({
        price: cachedData.price || 0.0,
        currency: cachedData.currency || "USD",
        airlines,
        duration: cachedData.duration || "",
        outboundDate,
        returnDate,
        carbonEmissions: cachedData.carbon_emissions,
      });
    } catch (e) {
      _error(`Error parsing cached flight data: ${e.message}`);
    }
  }

  // Check quota status for both APIs
  const quotaStatus = checkQuotaStatus();

  // Try SerpAPI first if available and quota not exceeded
  let flightData = null;
  if (SERPAPI_KEY && !quotaStatus.serpapi) {
    try {
      info("Using SerpAPI to fetch flight data");

      // Build the SerpAPI request URL
      const baseUrl = "https://serpapi.com/search";
      const params = {
        engine: "google_flights",
        departure_id: departureAirport,
        arrival_id: arrivalAirport,
        outbound_date: outboundDate,
        return_date: returnDate,
        currency,
        hl: "en",
        api_key: SERPAPI_KEY,
      };

      // Log API call (without exposing API key)
      const requestLog = {
        endpoint: "google_flights",
        origin: departureAirport,
        destination: arrivalAirport,
        dates: `${outboundDate} to ${returnDate}`,
      };

      // Log the API call to database
      await logApiCall({
        endpoint: "serpapi/google_flights",
        requestData: requestLog,
        responseStatus: 200,
        userId,
      });

      const response = await get(baseUrl, { params });

      if (response.status === 200) {
        flightData = response.data;
      } else {
        let errorMessage = `SerpAPI request failed with status code ${response.status}`;

        try {
          const errorData = response.data;
          if (errorData.error) {
            errorMessage += `: ${errorData.error}`;

            // Check for quota errors to try SearchAPI
            if (
              errorData.error.toLowerCase().includes("quota") &&
              SEARCHAPI_KEY
            ) {
              warn(
                "SerpAPI quota exceeded, trying SearchAPI as fallback"
              );
              throw new Error("SerpAPI quota exceeded");
            }
          }
        } catch (e) {
          // Continue to SearchAPI fallback
        }

        warn(errorMessage);
      }
    } catch (e) {
      warn(`Error with SerpAPI request: ${e.message}`);
      // Will continue to SearchAPI fallback if available
    }
  }

  // Try SearchAPI as fallback or primary if SerpAPI not available
  if (
    (!flightData || flightData.error) &&
    SEARCHAPI_KEY &&
    !quotaStatus.searchapi
  ) {
    try {
      info("Using SearchAPI to fetch flight data");

      // Build the SearchAPI request URL
      const baseUrl = "https://www.searchapi.io/api/v1/search";
      const params = {
        engine: "google_flights",
        departure_id: departureAirport,
        arrival_id: arrivalAirport,
        outbound_date: outboundDate,
        return_date: returnDate,
        currency,
        hl: "en",
        api_key: SEARCHAPI_KEY,
      };

      // Log the API call
      await logApiCall({
        endpoint: "searchapi/google_flights",
        requestData: {
          endpoint: "google_flights",
          origin: departureAirport,
          destination: arrivalAirport,
          dates: `${outboundDate} to ${returnDate}`,
        },
        responseStatus: 200,
        userId,
      });

      // Execute the request
      flightData = await executeSearchapiRequest(baseUrl, params);

      if (flightData.error) {
        warn(`SearchAPI request failed: ${flightData.error}`);
        // Will fall back to simulated data
      }
    } catch (e) {
      _error(`Error with SearchAPI request: ${e.message}`);
      // Will fall back to simulated data
    }
  }

  // Process API response if we have valid data
  if (flightData && !flightData.error) {
    try {
      // Process the API response
      let flightInfo = null;

      // First check best_flights section
      if (flightData.best_flights && flightData.best_flights.length) {
        flightInfo = flightData.best_flights[0];
      }
      // If no best_flights, check other_flights section
      else if (flightData.other_flights && flightData.other_flights.length) {
        flightInfo = flightData.other_flights[0];
      }

      if (flightInfo) {
        // Extract price
        let priceValue = 0;

        if (typeof flightInfo === "object" && flightInfo !== null) {
          priceValue = flightInfo.price || 0;
        } else {
          warn(`flightInfo is not an object: ${typeof flightInfo}`);
        }

        if (typeof priceValue === "string") {
          try {
            // Handle string price format
            const priceStr = priceValue
              .replace(currency, "")
              .replace(/\$/g, "")
              .replace(/,/g, "")
              .trim();
            priceValue = parseFloat(priceStr);
          } catch (e) {
            warn(
              `Could not parse price string: ${priceValue}, using default`
            );
            priceValue = 100.0;
          }
        }

        // Extract airline information
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

        // Extract any additional useful information
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

        info(
          `Successfully fetched flight data: ${priceValue} ${currency}, duration: ${duration}`
        );

        // Ensure airlines is always an array of strings
        if (!Array.isArray(airlines)) {
          airlines = airlines ? [String(airlines)] : [];
        } else {
          airlines = airlines.filter((a) => a).map((a) => String(a));
        }

        return new FlightFare({
          price: priceValue,
          currency,
          airlines,
          duration,
          outboundDate,
          returnDate,
          carbonEmissions,
        });
      }
    } catch (e) {
      _error(`Error processing flight data: ${e.message}`);
    }
  }

  // For demo purposes or if API calls fail, generate simulated fare data
  info("Generating simulated flight fare data");
  try {
    // Simulated fare data generation based on airport codes
    const basePrice =
      (departureAirport.charCodeAt(0) + arrivalAirport.charCodeAt(0)) * 2.5;

    // Using a deterministic "hash" function for JS
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
      ["Air Sample", "ConnectFly"],
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

    return new FlightFare({
      price,
      currency,
      airlines,
      duration,
      outboundDate,
      returnDate,
    });
  } catch (e) {
    _error(`Error generating simulated flight fare: ${e.message}`);
    return null;
  }
}

/**
 * Fetch multiple flight fares in parallel.
 *
 * @param {string} departureAirport - IATA code of departure airport
 * @param {Array<string>} arrivalAirports - List of IATA codes for arrival airports
 * @param {string} outboundDate - Departure date in YYYY-MM-DD format
 * @param {string} returnDate - Return date in YYYY-MM-DD format
 * @param {string} [currency='USD'] - Currency code for fare prices
 * @returns {Promise<Object>} - Dictionary mapping airport codes to FlightFare objects
 */
async function fetchMultipleFares(
  departureAirport,
  arrivalAirports,
  outboundDate,
  returnDate,
  currency = "USD"
) {
  info(`Fetching fares for ${arrivalAirports.length} destinations`);

  const results = {};

  // Use Promise.all to fetch all fares in parallel
  const farePromises = arrivalAirports.map(async (airport) => {
    const fare = await fetchFlightFare(
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
}

export default {
  fetchFlightFare,
  fetchMultipleFares,
  checkQuotaStatus,
};
