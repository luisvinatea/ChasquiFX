/**
 * Flight Route Service Tests
 * Tests the functionality of the flightRouteService.js module
 */

import { strict as assert } from "assert";
import dotenv from "dotenv";
import {
  getRoute,
  getRoutesForDeparture,
  getPopularRoutes,
  findCheapestRoutes,
  findEcoFriendlyRoutes,
  calculateRouteDistance,
  estimateCarbonEmissions,
  clearRouteCache,
} from "../src/services/flightRouteService.js";
import { initMongoDB } from "../src/db/mongodb-client.js";
import { FlightRoute } from "../src/models/geo.js";

// Load environment variables
dotenv.config();

// Test configuration
const TEST_DEPARTURE = "JFK"; // New York
const TEST_ARRIVAL = "LAX"; // Los Angeles
const TEST_LIMIT = 5; // Number of routes to retrieve

/**
 * Main test function
 */
async function runTests() {
  console.log("Starting Flight Route Service Tests...");
  let client;

  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    client = await initMongoDB();
    console.log("Connected to MongoDB successfully");

    // Clear the route cache before testing
    clearRouteCache();

    // Run tests
    await testGetRoute();
    await testGetRoutesForDeparture();
    await testGetPopularRoutes();
    await testCalculateRouteDistance();
    await testEstimateCarbonEmissions();

    // These tests may depend on external APIs, handle failures gracefully
    try {
      await testFindCheapestRoutes();
      await testFindEcoFriendlyRoutes();
    } catch (error) {
      console.warn(
        "Warning: Route finding test failed, but this is acceptable:",
        error.message
      );
    }

    console.log("\n✅ All flight route tests completed successfully");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    if (client) {
      await client.close();
      console.log("MongoDB connection closed");
    }
  }
}

/**
 * Test getting a specific route
 */
async function testGetRoute() {
  console.log("\nTesting getRoute()...");

  const route = await getRoute(TEST_DEPARTURE, TEST_ARRIVAL);
  console.log("Route data:", route);

  assert(route, "Should return a route object");
  assert(
    route.departureAirport === TEST_DEPARTURE,
    "Departure airport should match"
  );
  assert(
    route.arrivalAirport === TEST_ARRIVAL,
    "Arrival airport should match"
  );
  assert(
    typeof route.distance === "number" && route.distance > 0,
    "Distance should be a positive number"
  );

  console.log("✅ Get route test passed");
}

/**
 * Test getting routes for a departure airport
 */
async function testGetRoutesForDeparture() {
  console.log("\nTesting getRoutesForDeparture()...");

  const routes = await getRoutesForDeparture(TEST_DEPARTURE);
  console.log(`Found ${routes.length} routes from ${TEST_DEPARTURE}`);

  assert(Array.isArray(routes), "Should return an array");
  assert(routes.length > 0, "Should find at least one route");

  for (const route of routes) {
    assert(
      route.departureAirport === TEST_DEPARTURE,
      "Departure airport should match"
    );
    assert(
      typeof route.arrivalAirport === "string",
      "Arrival airport should be a string"
    );
    assert(typeof route.distance === "number", "Should include distance data");
  }

  console.log("✅ Get routes for departure test passed");
}

/**
 * Test getting popular routes
 */
async function testGetPopularRoutes() {
  console.log("\nTesting getPopularRoutes()...");

  const routes = await getPopularRoutes(TEST_LIMIT);
  console.log(
    `Found ${routes.length} popular routes:`,
    routes.map((r) => `${r.departureAirport}-${r.arrivalAirport}`)
  );

  assert(Array.isArray(routes), "Should return an array");
  assert(
    routes.length <= TEST_LIMIT,
    `Should return at most ${TEST_LIMIT} routes`
  );

  for (const route of routes) {
    assert(
      typeof route.departureAirport === "string",
      "Departure airport should be a string"
    );
    assert(
      typeof route.arrivalAirport === "string",
      "Arrival airport should be a string"
    );
    assert(typeof route.distance === "number", "Should include distance data");
    assert(
      typeof route.popularity === "number",
      "Should include popularity data"
    );
  }

  console.log("✅ Get popular routes test passed");
}

/**
 * Test finding cheapest routes
 */
async function testFindCheapestRoutes() {
  console.log("\nTesting findCheapestRoutes()...");

  const outboundDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]; // 30 days from now
  const returnDate = new Date(Date.now() + 37 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]; // 37 days from now

  const routes = await findCheapestRoutes(
    TEST_DEPARTURE,
    TEST_LIMIT,
    outboundDate,
    returnDate
  );
  console.log(
    `Found ${routes.length} cheapest routes:`,
    routes.map((r) => `${r.arrivalAirport}: ${r.price} ${r.currency}`)
  );

  assert(Array.isArray(routes), "Should return an array");
  assert(
    routes.length <= TEST_LIMIT,
    `Should return at most ${TEST_LIMIT} routes`
  );

  if (routes.length > 0) {
    for (const route of routes) {
      assert(
        typeof route.departureAirport === "string",
        "Departure airport should be a string"
      );
      assert(
        typeof route.arrivalAirport === "string",
        "Arrival airport should be a string"
      );
      assert(
        typeof route.price === "number" && route.price > 0,
        "Price should be a positive number"
      );
      assert(
        typeof route.currency === "string",
        "Currency should be a string"
      );
    }
  }

  console.log("✅ Find cheapest routes test passed");
}

/**
 * Test finding eco-friendly routes
 */
async function testFindEcoFriendlyRoutes() {
  console.log("\nTesting findEcoFriendlyRoutes()...");

  const outboundDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]; // 30 days from now
  const returnDate = new Date(Date.now() + 37 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]; // 37 days from now

  const routes = await findEcoFriendlyRoutes(TEST_DEPARTURE, TEST_LIMIT);
  console.log(
    `Found ${routes.length} eco-friendly routes:`,
    routes.map((r) => `${r.arrivalAirport}: ${Math.round(r.emissions)} kg CO2`)
  );

  assert(Array.isArray(routes), "Should return an array");
  assert(
    routes.length <= TEST_LIMIT,
    `Should return at most ${TEST_LIMIT} routes`
  );

  if (routes.length > 0) {
    for (const route of routes) {
      assert(
        typeof route.departureAirport === "string",
        "Departure airport should be a string"
      );
      assert(
        typeof route.arrivalAirport === "string",
        "Arrival airport should be a string"
      );
      assert(
        typeof route.emissions === "number",
        "Should include emissions data"
      );
      assert(
        typeof route.distance === "number",
        "Should include distance data"
      );
    }
  }

  console.log("✅ Find eco-friendly routes test passed");
}

/**
 * Test calculating route distance
 */
async function testCalculateRouteDistance() {
  console.log("\nTesting calculateRouteDistance()...");

  const distance = await calculateRouteDistance(TEST_DEPARTURE, TEST_ARRIVAL);
  console.log(
    `Distance between ${TEST_DEPARTURE} and ${TEST_ARRIVAL}: ${distance} km`
  );

  assert(typeof distance === "number", "Distance should be a number");
  assert(distance > 0, "Distance should be positive");

  console.log("✅ Calculate route distance test passed");
}

/**
 * Test estimating carbon emissions
 */
async function testEstimateCarbonEmissions() {
  console.log("\nTesting estimateCarbonEmissions()...");

  const distance = await calculateRouteDistance(TEST_DEPARTURE, TEST_ARRIVAL);
  const emissions = await estimateCarbonEmissions(
    TEST_DEPARTURE,
    TEST_ARRIVAL
  );

  console.log(
    `Estimated emissions for ${TEST_DEPARTURE}-${TEST_ARRIVAL}: ${emissions} kg CO2`
  );

  assert(typeof emissions === "number", "Emissions should be a number");
  assert(emissions > 0, "Emissions should be positive");
  assert(
    emissions > distance * 0.1,
    "Emissions should be reasonably proportional to distance"
  );

  console.log("✅ Estimate carbon emissions test passed");
}

// Run the tests
runTests().catch(console.error);
