/**
 * Enhanced Geo Service for ChasquiFX
 *
 * Provides geographical data and operations for airports, routes, and countries
 */

import { getLogger } from "../utils/logger.js";
import {
  Airport,
  FlightRoute,
  CountryCurrency,
  COUNTRY_NAME_TO_CURRENCY,
} from "../models/geo.js";
import { MongoClient } from "mongodb";

// Initialize logger
const logger = getLogger("geo-service");

// In-memory cache for commonly accessed data
const cache = {
  airports: {},
  airportsByCountry: {},
  countryToAirportMap: {},
  routes: {},
  popularRoutes: [],
};

/**
 * Initialize the geo service with data from the database
 * @returns {Promise<boolean>} - Success status
 */
export async function initGeoService() {
  try {
    logger.info("Initializing geo service");

    // Load data from database
    await loadAirports();
    await loadRoutes();

    logger.info(
      `Geo service initialized with ${
        Object.keys(cache.airports).length
      } airports and ${cache.popularRoutes.length} routes`
    );
    return true;
  } catch (error) {
    logger.error(`Failed to initialize geo service: ${error.message}`);
    return false;
  }
}

/**
 * Load airports from the database
 * @returns {Promise<void>}
 */
async function loadAirports() {
  try {
    // This would normally load from the database
    // For now, we'll use a small sample dataset
    const sampleAirports = [
      new Airport({
        iataCode: "JFK",
        name: "John F. Kennedy International Airport",
        city: "New York",
        country: "United States",
        latitude: 40.6413,
        longitude: -73.7781,
      }),
      new Airport({
        iataCode: "LHR",
        name: "London Heathrow Airport",
        city: "London",
        country: "United Kingdom",
        latitude: 51.4694,
        longitude: -0.4503,
      }),
      new Airport({
        iataCode: "CDG",
        name: "Charles de Gaulle Airport",
        city: "Paris",
        country: "France",
        latitude: 49.0097,
        longitude: 2.5479,
      }),
      new Airport({
        iataCode: "NRT",
        name: "Narita International Airport",
        city: "Tokyo",
        country: "Japan",
        latitude: 35.7647,
        longitude: 140.3864,
      }),
      new Airport({
        iataCode: "SYD",
        name: "Sydney Airport",
        city: "Sydney",
        country: "Australia",
        latitude: -33.9399,
        longitude: 151.1753,
      }),
    ];

    // Add airports to cache
    sampleAirports.forEach((airport) => {
      cache.airports[airport.iataCode] = airport;

      // Group by country
      if (!cache.airportsByCountry[airport.country]) {
        cache.airportsByCountry[airport.country] = [];
      }
      cache.airportsByCountry[airport.country].push(airport);

      // Index country to airport codes
      if (!cache.countryToAirportMap[airport.country]) {
        cache.countryToAirportMap[airport.country] = [];
      }
      cache.countryToAirportMap[airport.country].push(airport.iataCode);
    });

    logger.info(`Loaded ${sampleAirports.length} airports`);
  } catch (error) {
    logger.error(`Error loading airports: ${error.message}`);
    throw error;
  }
}

/**
 * Load routes from the database
 * @returns {Promise<void>}
 */
async function loadRoutes() {
  try {
    // This would normally load from the database
    // For now, we'll generate routes between our sample airports
    const airports = Object.values(cache.airports);
    const sampleRoutes = [];

    for (let i = 0; i < airports.length; i++) {
      for (let j = 0; j < airports.length; j++) {
        if (i !== j) {
          const origin = airports[i];
          const destination = airports[j];

          // Calculate distance
          const distance = origin.distanceTo(destination);

          // Generate average fare based on distance
          const averageFare = Math.round(100 + distance * 0.15);

          // Create route
          const route = new FlightRoute({
            origin: origin.iataCode,
            destination: destination.iataCode,
            departureAirport: origin.iataCode,
            destinationAirport: destination.iataCode,
            distance,
            averageFare,
            // Some routes are more popular in summer
            seasonality: {
              winter: 0.8 + Math.random() * 0.4,
              spring: 0.9 + Math.random() * 0.2,
              summer: 1.1 + Math.random() * 0.3,
              autumn: 0.9 + Math.random() * 0.2,
            },
          });

          // Add to routes
          const routeKey = `${origin.iataCode}-${destination.iataCode}`;
          cache.routes[routeKey] = route;
          sampleRoutes.push(route);
        }
      }
    }

    // Sort routes by estimated popularity (distance-based for now)
    cache.popularRoutes = sampleRoutes.sort((a, b) => {
      // Shorter routes are typically more popular
      return a.distance - b.distance;
    });

    logger.info(`Generated ${sampleRoutes.length} routes`);
  } catch (error) {
    logger.error(`Error loading routes: ${error.message}`);
    throw error;
  }
}

/**
 * Get airport information by IATA code
 * @param {string} iataCode - IATA airport code
 * @returns {Airport|null} Airport data or null if not found
 */
export function getAirport(iataCode) {
  if (!iataCode) return null;

  const code = iataCode.trim().toUpperCase();
  return cache.airports[code] || null;
}

/**
 * Get airports by country
 * @param {string} country - Country name
 * @returns {Airport[]} List of airports in the country
 */
export function getAirportsByCountry(country) {
  if (!country) return [];

  return cache.airportsByCountry[country] || [];
}

/**
 * Get flight route between two airports
 * @param {string} originCode - Origin airport IATA code
 * @param {string} destinationCode - Destination airport IATA code
 * @returns {FlightRoute|null} Route data or null if not found
 */
export function getRoute(originCode, destinationCode) {
  if (!originCode || !destinationCode) return null;

  const routeKey = `${originCode.trim().toUpperCase()}-${destinationCode
    .trim()
    .toUpperCase()}`;
  return cache.routes[routeKey] || null;
}

/**
 * Get all available routes from a departure airport
 * @param {string} departureCode - Departure airport IATA code
 * @returns {FlightRoute[]} List of available routes
 */
export function getRoutesForAirport(departureCode) {
  if (!departureCode) return [];

  const code = departureCode.trim().toUpperCase();

  return cache.popularRoutes.filter((route) => route.origin === code);
}

/**
 * Get a mapping of airport codes to countries
 * @returns {Object} Object mapping airport codes to country names
 */
export function getAirportCountryMap() {
  const map = {};

  Object.values(cache.airports).forEach((airport) => {
    map[airport.iataCode] = {
      country: airport.country,
      city: airport.city,
    };
  });

  return map;
}

/**
 * Get currency code for a country
 * @param {string} countryName - Country name
 * @returns {string|null} Currency code or null if not found
 */
export function getCurrencyForCountry(countryName) {
  if (!countryName) return null;

  return COUNTRY_NAME_TO_CURRENCY[countryName] || null;
}

/**
 * Get airport information from the database
 * @param {string} iataCode - IATA airport code
 * @returns {Promise<Object|null>} Airport data or null if not found
 */
export async function getAirportFromDatabase(iataCode) {
  try {
    // This would be implemented with an actual database connection
    // For now, return the cached airport
    return getAirport(iataCode);
  } catch (error) {
    logger.error(`Error fetching airport data: ${error.message}`);
    return null;
  }
}

export default {
  initGeoService,
  getAirport,
  getAirportsByCountry,
  getRoute,
  getRoutesForAirport,
  getAirportCountryMap,
  getCurrencyForCountry,
  getAirportFromDatabase,
};
