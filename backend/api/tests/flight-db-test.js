/**
 * Flight Database Operations Tests
 * Tests the functionality of the flight-db.js module
 */

import { strict as assert } from "assert";
import dotenv from "dotenv";
import {
  getCachedFlightFare,
  cacheFlightFare,
  saveFlightRoute,
  getFlightRoutes,
  saveFlightEmissions,
  getRouteEmissionsData,
  logApiCall,
  getApiCallStats,
  clearCachedFares,
} from "../src/db/flight-db.js";
import { FlightFare } from "../src/models/FlightFare.js";
import { initMongoDB } from "../src/db/mongodb-client.js";

// Load environment variables
dotenv.config();

// Test configuration
const TEST_DEPARTURE = "JFK"; // New York
const TEST_ARRIVAL = "LAX"; // Los Angeles
const TEST_DATE_OUTBOUND = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0]; // 30 days from now
const TEST_DATE_RETURN = new Date(Date.now() + 37 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0]; // 37 days from now
const TEST_CURRENCY = "USD";
const TEST_PRICE = 299.99;
const TEST_EMISSIONS = 1250; // in kg CO2

/**
 * Main test function
 */
async function runTests() {
  console.log("Starting Flight Database Tests...");
  let client;

  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    client = await initMongoDB();
    console.log("Connected to MongoDB successfully");

    // Clear any existing test data
    await clearCachedFares(TEST_DEPARTURE, TEST_ARRIVAL);

    // Run tests
    await testCacheFlightFare();
    await testGetCachedFlightFare();
    await testSaveAndGetFlightRoute();
    await testSaveAndGetEmissionsData();
    await testApiCallLogging();

    console.log("\n✅ All flight database tests completed successfully");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  } finally {
    // Clean up test data
    await clearCachedFares(TEST_DEPARTURE, TEST_ARRIVAL);

    // Close MongoDB connection
    if (client) {
      await client.close();
      console.log("MongoDB connection closed");
    }
  }
}

/**
 * Test caching a flight fare
 */
async function testCacheFlightFare() {
  console.log("\nTesting cacheFlightFare()...");

  const testFare = new FlightFare({
    departureAirport: TEST_DEPARTURE,
    arrivalAirport: TEST_ARRIVAL,
    outboundDate: TEST_DATE_OUTBOUND,
    returnDate: TEST_DATE_RETURN,
    price: TEST_PRICE,
    currency: TEST_CURRENCY,
    emissions: TEST_EMISSIONS,
    timestamp: new Date(),
    isSimulated: false,
  });

  const result = await cacheFlightFare(
    TEST_DEPARTURE,
    TEST_ARRIVAL,
    TEST_DATE_OUTBOUND,
    TEST_DATE_RETURN,
    testFare,
    TEST_CURRENCY
  );

  console.log("Cache result:", result);
  assert(result, "Should return a truthy value");

  console.log("✅ Cache flight fare test passed");
}

/**
 * Test retrieving a cached flight fare
 */
async function testGetCachedFlightFare() {
  console.log("\nTesting getCachedFlightFare()...");

  const cachedFare = await getCachedFlightFare(
    TEST_DEPARTURE,
    TEST_ARRIVAL,
    TEST_DATE_OUTBOUND,
    TEST_DATE_RETURN,
    TEST_CURRENCY
  );

  console.log("Retrieved cached fare:", cachedFare);

  assert(
    cachedFare instanceof FlightFare,
    "Should return a FlightFare instance"
  );
  assert(
    cachedFare.departureAirport === TEST_DEPARTURE,
    "Departure airport should match"
  );
  assert(
    cachedFare.arrivalAirport === TEST_ARRIVAL,
    "Arrival airport should match"
  );
  assert(
    cachedFare.outboundDate === TEST_DATE_OUTBOUND,
    "Outbound date should match"
  );
  assert(
    cachedFare.returnDate === TEST_DATE_RETURN,
    "Return date should match"
  );
  assert(cachedFare.price === TEST_PRICE, "Price should match");
  assert(cachedFare.currency === TEST_CURRENCY, "Currency should match");

  console.log("✅ Get cached flight fare test passed");
}

/**
 * Test saving and retrieving flight routes
 */
async function testSaveAndGetFlightRoute() {
  console.log("\nTesting saveFlightRoute() and getFlightRoutes()...");

  // Create a test route
  const testRoute = {
    departureAirport: TEST_DEPARTURE,
    arrivalAirport: TEST_ARRIVAL,
    distance: 3939,
    popularity: 10,
    timestamp: new Date(),
  };

  // Save the route
  const saveResult = await saveFlightRoute(testRoute);
  console.log("Save route result:", saveResult);
  assert(saveResult, "Should return a truthy value");

  // Get routes for the departure airport
  const routes = await getFlightRoutes(TEST_DEPARTURE);
  console.log(`Retrieved ${routes.length} routes for ${TEST_DEPARTURE}`);

  assert(Array.isArray(routes), "Should return an array");
  assert(routes.length > 0, "Should find at least one route");

  const foundRoute = routes.find((r) => r.arrivalAirport === TEST_ARRIVAL);
  assert(
    foundRoute,
    `Should find route from ${TEST_DEPARTURE} to ${TEST_ARRIVAL}`
  );
  assert(
    foundRoute.distance === testRoute.distance,
    "Route distance should match"
  );

  console.log("✅ Save and get flight routes test passed");
}

/**
 * Test saving and retrieving emissions data
 */
async function testSaveAndGetEmissionsData() {
  console.log(
    "\nTesting saveFlightEmissions() and getRouteEmissionsData()..."
  );

  const distance = 3939;

  // Save emissions data
  const saveResult = await saveFlightEmissions(
    TEST_DEPARTURE,
    TEST_ARRIVAL,
    TEST_EMISSIONS,
    distance
  );

  console.log("Save emissions result:", saveResult);
  assert(saveResult, "Should return a truthy value");

  // Get emissions data
  const emissionsData = await getRouteEmissionsData(
    TEST_DEPARTURE,
    TEST_ARRIVAL
  );
  console.log("Retrieved emissions data:", emissionsData);

  assert(emissionsData, "Should return emissions data");
  assert(
    emissionsData.departureAirport === TEST_DEPARTURE,
    "Departure airport should match"
  );
  assert(
    emissionsData.arrivalAirport === TEST_ARRIVAL,
    "Arrival airport should match"
  );
  assert(
    Math.abs(emissionsData.emissions - TEST_EMISSIONS) < 0.1,
    "Emissions should match"
  );
  assert(
    Math.abs(emissionsData.distance - distance) < 0.1,
    "Distance should match"
  );

  console.log("✅ Save and get emissions data test passed");
}

/**
 * Test API call logging
 */
async function testApiCallLogging() {
  console.log("\nTesting logApiCall() and getApiCallStats()...");

  // Log a test API call
  await logApiCall("flight", "test", true);

  // Get API call stats
  const stats = await getApiCallStats("flight");
  console.log("API call stats:", stats);

  assert(typeof stats === "object", "Should return an object");
  assert(
    typeof stats.totalCalls === "number",
    "Should include total calls count"
  );
  assert(
    typeof stats.successCount === "number",
    "Should include success count"
  );
  assert(typeof stats.errorCount === "number", "Should include error count");

  console.log("✅ API call logging test passed");
}

// Run the tests
runTests().catch(console.error);
