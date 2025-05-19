/**
 * Geo service for ChasquiFX.
 * Provides geographical and route data.
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { warn, error } from "../utils/logger";

// Path to geo data files
const ROUTES_PATH = resolve(
  __dirname,
  "../../../assets/data/geo/routes.json"
);
const AIRPORTS_PATH = resolve(
  __dirname,
  "../../../assets/data/geo/airports.json"
);

/**
 * Get routes for a specific airport
 * @param {string} airportCode - IATA airport code
 * @returns {Promise<Array>} - Array of route objects
 */
async function getRoutesForAirport(airportCode) {
  try {
    if (!existsSync(ROUTES_PATH)) {
      warn(`Routes file not found: ${ROUTES_PATH}`);
      return [];
    }

    const routesData = JSON.parse(readFileSync(ROUTES_PATH, "utf8"));

    // Filter routes for departure airport
    return routesData.filter(
      (route) =>
        route.OriginAirport === airportCode ||
        route["Origin airport"] === airportCode
    );
  } catch (e) {
    error(`Error getting routes for ${airportCode}: ${e.message}`);
    return [];
  }
}

/**
 * Get mapping of airport codes to country codes
 * @returns {Promise<Object>} - Object mapping airport codes to country codes
 */
async function getAirportCountryMap() {
  try {
    if (!existsSync(AIRPORTS_PATH)) {
      warn(`Airports file not found: ${AIRPORTS_PATH}`);
      return {};
    }

    const airportsData = JSON.parse(readFileSync(AIRPORTS_PATH, "utf8"));

    // Create mapping of airport code to country code
    const airportMap = {};
    airportsData.forEach((airport) => {
      if (airport.IATA && airport.Country) {
        airportMap[airport.IATA] = airport.Country;
      }
    });

    return airportMap;
  } catch (e) {
    error(`Error getting airport country map: ${e.message}`);
    return {};
  }
}

export default {
  getRoutesForAirport,
  getAirportCountryMap,
};
