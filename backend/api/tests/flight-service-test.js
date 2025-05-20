/**
 * Flight Service Tests
 * Tests the functionality of the flightService-v2.js module
 */

import { strict as assert } from "assert";
import dotenv from "dotenv";
import {
  getFlightFare,
  estimateFlightPrice,
  getMultipleFares,
  getServiceStatus,
  generateSimulatedFare,
} from "../src/services/flightService-v2.js";
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

/**
 * Main test function
 */
async function runTests() {
  console.log("Starting Flight Service Tests...");
  let client;

  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    client = await initMongoDB();
    console.log("Connected to MongoDB successfully");

    // Run tests
    await testServiceStatus();
    await testSimulatedFareGeneration();
    await testFlightFareEstimation();
    await testGetMultipleFares();

    // Try to get a real fare but don't fail the test if API is down
    try {
      await testGetFlightFare();
    } catch (error) {
      console.warn(
        "Warning: Real API test failed, but this is acceptable:",
        error.message
      );
    }

    console.log("\n✅ All tests completed successfully");
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
 * Test service status checking
 */
async function testServiceStatus() {
  console.log("\nTesting getServiceStatus()...");

  const status = getServiceStatus();
  console.log("Service status:", status);

  assert(typeof status === "object", "Service status should be an object");
  assert(
    typeof status.available === "boolean",
    "Status should have available property"
  );
  assert(
    typeof status.message === "string",
    "Status should have message property"
  );
  assert(
    typeof status.quotaRemaining === "number",
    "Status should have quotaRemaining property"
  );

  console.log("✅ Service status test passed");
}

/**
 * Test simulated fare generation
 */
async function testSimulatedFareGeneration() {
  console.log("\nTesting generateSimulatedFare()...");

  const fare = generateSimulatedFare(
    TEST_DEPARTURE,
    TEST_ARRIVAL,
    TEST_DATE_OUTBOUND,
    TEST_DATE_RETURN
  );
  console.log("Generated simulated fare:", fare);

  assert(fare instanceof FlightFare, "Should return a FlightFare instance");
  assert(
    typeof fare.price === "number" && fare.price > 0,
    "Price should be a positive number"
  );
  assert(typeof fare.currency === "string", "Currency should be a string");
  assert(
    fare.departureAirport === TEST_DEPARTURE,
    "Departure airport should match"
  );
  assert(fare.arrivalAirport === TEST_ARRIVAL, "Arrival airport should match");
  assert(
    fare.outboundDate === TEST_DATE_OUTBOUND,
    "Outbound date should match"
  );
  assert(fare.returnDate === TEST_DATE_RETURN, "Return date should match");
  assert(
    typeof fare.emissions === "number" && fare.emissions > 0,
    "Emissions should be a positive number"
  );
  assert(fare.isSimulated === true, "Simulated flag should be true");

  console.log("✅ Simulated fare test passed");
}

/**
 * Test flight fare estimation
 */
async function testFlightFareEstimation() {
  console.log("\nTesting estimateFlightPrice()...");

  const estimate = await estimateFlightPrice(TEST_DEPARTURE, TEST_ARRIVAL);
  console.log("Flight price estimate:", estimate);

  assert(typeof estimate === "object", "Should return an object");
  assert(
    typeof estimate.price === "number" && estimate.price > 0,
    "Price should be a positive number"
  );
  assert(typeof estimate.currency === "string", "Currency should be a string");
  assert(
    typeof estimate.distance === "number" && estimate.distance > 0,
    "Distance should be a positive number"
  );
  assert(
    typeof estimate.emissions === "number",
    "Should include emissions data"
  );

  console.log("✅ Flight price estimation test passed");
}

/**
 * Test getting multiple fares
 */
async function testGetMultipleFares() {
  console.log("\nTesting getMultipleFares()...");

  const arrivalAirports = ["LAX", "SFO", "MIA"];
  const fares = await getMultipleFares(
    TEST_DEPARTURE,
    arrivalAirports,
    TEST_DATE_OUTBOUND,
    TEST_DATE_RETURN,
    TEST_CURRENCY
  );

  console.log(
    `Received ${fares.length} fares:`,
    fares.map((f) => ({
      to: f.arrivalAirport,
      price: f.price,
      emissions: Math.round(f.emissions),
    }))
  );

  assert(Array.isArray(fares), "Should return an array");
  assert(
    fares.length <= arrivalAirports.length,
    "Should return at most as many fares as requested airports"
  );

  for (const fare of fares) {
    assert(
      fare instanceof FlightFare,
      "Each item should be a FlightFare instance"
    );
    assert(
      fare.departureAirport === TEST_DEPARTURE,
      "Departure airport should match"
    );
    assert(
      arrivalAirports.includes(fare.arrivalAirport),
      "Arrival airport should be in requested list"
    );
    assert(
      typeof fare.price === "number" && fare.price > 0,
      "Price should be a positive number"
    );
  }

  console.log("✅ Multiple fares test passed");
}

/**
 * Test getting a flight fare
 * This test might fail if the API is down or quota is exhausted
 */
async function testGetFlightFare() {
  console.log("\nTesting getFlightFare() with real API...");

  const fare = await getFlightFare(
    TEST_DEPARTURE,
    TEST_ARRIVAL,
    TEST_DATE_OUTBOUND,
    TEST_DATE_RETURN,
    TEST_CURRENCY,
    { forceApi: true }
  );

  console.log("Received flight fare:", fare);

  assert(fare instanceof FlightFare, "Should return a FlightFare instance");
  assert(
    typeof fare.price === "number" && fare.price > 0,
    "Price should be a positive number"
  );
  assert(
    fare.currency === TEST_CURRENCY,
    "Currency should match requested currency"
  );
  assert(
    fare.departureAirport === TEST_DEPARTURE,
    "Departure airport should match"
  );
  assert(fare.arrivalAirport === TEST_ARRIVAL, "Arrival airport should match");

  console.log("✅ Get flight fare test passed");
}

// Run the tests
runTests().catch(console.error);
