/**
 * Tests for File Standardization Service
 *
 * Run with: node test-file-standardization.js
 */

import { extractJsonMetadata, standardizeFilename, standardizeFlightFilename, standardizeForexFilename, generateCacheKey } from "../src/services/fileStandardizationService";

// Mock logger to prevent console output during tests
jest.mock("../src/utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Test samples
const sampleFlightData = {
  search_parameters: {
    departure_id: "JFK",
    arrival_id: "LHR",
    outbound_date: "2025-08-14",
    return_date: "2025-08-21",
  },
};

const sampleForexData = {
  search_parameters: {
    q: "AUD-EUR",
  },
  search_metadata: {
    created_at: "2025-05-17 02:33:39 UTC",
  },
};

// Test functions
async function testExtractJsonMetadata() {
  console.log("\nTesting extractJsonMetadata...");

  // Test extracting from object
  const flightMetadata = await extractJsonMetadata(sampleFlightData, [
    "search_parameters.departure_id",
    "search_parameters.arrival_id",
    "search_parameters.outbound_date",
    "search_parameters.return_date",
  ]);

  console.log("Flight metadata extracted:", flightMetadata);
  if (
    flightMetadata["search_parameters.departure_id"] === "JFK" &&
    flightMetadata["search_parameters.arrival_id"] === "LHR"
  ) {
    console.log("✅ Flight metadata extraction successful");
  } else {
    console.error("❌ Flight metadata extraction failed");
    process.exit(1);
  }

  // Test extracting from object with missing data
  const incompleteData = { search_parameters: { departure_id: "JFK" } };
  const incompleteMetadata = await extractJsonMetadata(incompleteData, [
    "search_parameters.departure_id",
    "search_parameters.arrival_id",
  ]);

  if (
    incompleteMetadata["search_parameters.departure_id"] === "JFK" &&
    incompleteMetadata["search_parameters.arrival_id"] === null
  ) {
    console.log("✅ Incomplete metadata handling successful");
  } else {
    console.error("❌ Incomplete metadata handling failed");
    process.exit(1);
  }
}

async function testStandardizeFilename() {
  console.log("\nTesting standardizeFilename...");

  // Test flight filename standardization
  const flightFilename = await standardizeFilename(
    sampleFlightData,
    [
      "search_parameters.departure_id",
      "search_parameters.arrival_id",
      "search_parameters.outbound_date",
      "search_parameters.return_date",
    ],
    "{departure_id}_{arrival_id}_{outbound_date}_{return_date}"
  );

  const expectedFlightFilename = "JFK_LHR_2025-08-14_2025-08-21";
  console.log(`Flight filename: ${flightFilename}`);

  if (flightFilename === expectedFlightFilename) {
    console.log("✅ Flight filename standardization successful");
  } else {
    console.error(
      `❌ Flight filename standardization failed. Expected: ${expectedFlightFilename}, Got: ${flightFilename}`
    );
    process.exit(1);
  }

  // Test forex filename standardization
  const forexData = { ...sampleForexData };
  forexData.search_metadata.created_at = "2025-05-17 02:33:39 UTC";

  const forexFilename = await standardizeFilename(
    forexData,
    ["search_parameters.q", "search_metadata.created_at"],
    "{q}_{created_at}"
  );

  console.log(`Forex filename: ${forexFilename}`);
  if (forexFilename && forexFilename.startsWith("AUD-EUR_2025-05-17")) {
    console.log("✅ Forex filename standardization successful");
  } else {
    console.error("❌ Forex filename standardization failed");
    process.exit(1);
  }
}

async function testSpecificStandardizers() {
  console.log("\nTesting specific standardizers...");

  // Test standardizeFlightFilename
  const flightFilename = await standardizeFlightFilename(sampleFlightData);
  console.log(`Standardized flight filename: ${flightFilename}`);

  if (flightFilename === "JFK_LHR_2025-08-14_2025-08-21") {
    console.log("✅ standardizeFlightFilename successful");
  } else {
    console.error("❌ standardizeFlightFilename failed");
    process.exit(1);
  }

  // Test standardizeForexFilename
  const forexData = { ...sampleForexData };
  const forexFilename = await standardizeForexFilename(forexData);
  console.log(`Standardized forex filename: ${forexFilename}`);

  if (forexFilename && forexFilename.includes("AUD-EUR_")) {
    console.log("✅ standardizeForexFilename successful");
  } else {
    console.error("❌ standardizeForexFilename failed");
    process.exit(1);
  }
}

async function testGenerateCacheKey() {
  console.log("\nTesting generateCacheKey...");

  // Test flight cache key
  const flightCacheKey = await generateCacheKey(sampleFlightData, "flight");
  console.log(`Flight cache key: ${flightCacheKey}`);

  if (flightCacheKey === "JFK_LHR_2025-08-14_2025-08-21") {
    console.log("✅ Flight cache key generation successful");
  } else {
    console.error("❌ Flight cache key generation failed");
    process.exit(1);
  }

  // Test forex cache key
  const forexCacheKey = await generateCacheKey(sampleForexData, "forex");
  console.log(`Forex cache key: ${forexCacheKey}`);

  if (forexCacheKey && forexCacheKey.includes("AUD-EUR_")) {
    console.log("✅ Forex cache key generation successful");
  } else {
    console.error("❌ Forex cache key generation failed");
    process.exit(1);
  }
}

// Run all tests
async function runTests() {
  console.log("==== File Standardization Service Tests ====");

  try {
    await testExtractJsonMetadata();
    await testStandardizeFilename();
    await testSpecificStandardizers();
    await testGenerateCacheKey();

    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("\n❌ Tests failed:", error.message);
    process.exit(1);
  }
}

// Execute tests
runTests();
