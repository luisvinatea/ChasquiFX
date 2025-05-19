/**
 * Test script for the enhanced flight schema
 * This script tests the migration of a single flight file using the enhanced schema
 */

require("dotenv").config();
import { promises as fs } from "fs";
import { resolve, join, basename } from "path";
import { connection } from "mongoose";
import { connectToDatabase } from "../../src/db/mongodb";
import { Flight } from "../../src/db/schemas";

// Configuration
const FLIGHTS_DATA_DIR = resolve(__dirname, "../../assets/data/flights");
const TEST_FILE = "JFK_AMM_2025-08-10_2025-08-17.json";

async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading or parsing ${filePath}:`, error.message);
    return null;
  }
}

async function testEnhancedSchema() {
  try {
    console.log("Starting test of enhanced schema migration...");

    // Connect to MongoDB
    await connectToDatabase();

    // Read test file
    const filePath = join(FLIGHTS_DATA_DIR, TEST_FILE);
    console.log(`Reading test file: ${filePath}`);
    const flightData = await readJsonFile(filePath);

    if (!flightData) {
      console.error("Failed to read or parse test file");
      process.exit(1);
    }

    // Extract route information from filename
    const fileNameParts = basename(TEST_FILE, ".json").split("_");
    if (fileNameParts.length !== 4) {
      console.error("Invalid filename format");
      process.exit(1);
    }

    const [departureAirport, arrivalAirport, outboundDate, returnDate] =
      fileNameParts;

    // Delete existing document if it exists (for testing purposes)
    await Flight.deleteOne({ _source: TEST_FILE });
    console.log("Deleted existing test document (if any)");

    // Create a comprehensive flight document
    const enhancedFlightDoc = {
      _source: TEST_FILE,
      route: TEST_FILE.split(".")[0],
      date_imported: new Date().toISOString(),
      raw_data_available: true,

      // Search metadata
      search_metadata: flightData.search_metadata || {},

      // Search parameters
      search_parameters: flightData.search_parameters || {
        departure_id: departureAirport,
        arrival_id: arrivalAirport,
        outbound_date: outboundDate,
        return_date: returnDate,
      },

      // Route details
      route_info: {
        departure_airport: departureAirport,
        arrival_airport: arrivalAirport,
        outbound_date: outboundDate,
        return_date: returnDate,
      },

      // Best flights summary
      best_flights_summary: flightData.best_flights
        ? flightData.best_flights.map((flight) => ({
            price: flight.price,
            type: flight.type,
            total_duration: flight.total_duration,
            airline:
              flight.flights && flight.flights[0]
                ? flight.flights[0].airline
                : null,
            carbon_emissions: flight.carbon_emissions
              ? {
                  amount: flight.carbon_emissions.this_flight,
                  compared_to_typical:
                    flight.carbon_emissions.difference_percent,
                }
              : null,
            layover_count: flight.layovers ? flight.layovers.length : 0,
            departure_time:
              flight.flights &&
              flight.flights[0] &&
              flight.flights[0].departure_airport
                ? flight.flights[0].departure_airport.time
                : null,
            arrival_time:
              flight.flights &&
              flight.flights[flight.flights.length - 1] &&
              flight.flights[flight.flights.length - 1].arrival_airport
                ? flight.flights[flight.flights.length - 1].arrival_airport
                    .time
                : null,
          }))
        : [],

      // Complete best flights data
      best_flights: flightData.best_flights || [],

      // Other flights count
      other_flights_count: flightData.other_flights
        ? flightData.other_flights.length
        : 0,

      // Price range
      price_range:
        flightData.best_flights && flightData.best_flights.length > 0
          ? {
              min: Math.min(
                ...flightData.best_flights.map((f) => f.price || Infinity)
              ),
              max: Math.max(
                ...flightData.best_flights.map((f) => f.price || 0)
              ),
            }
          : null,
    };

    // Insert the document with the enhanced schema
    const result = await Flight.create(enhancedFlightDoc);
    console.log("Inserted test document with ID:", result._id);

    // Retrieve the document to verify schema
    const retrievedDoc = await Flight.findById(result._id);

    // Check schema fields
    console.log("\nVerifying Schema Fields:");
    console.log("=======================");
    console.log("Route:", retrievedDoc.route);
    console.log(
      "Departure Airport:",
      retrievedDoc.route_info.departure_airport
    );
    console.log("Arrival Airport:", retrievedDoc.route_info.arrival_airport);
    console.log("Best Flights Count:", retrievedDoc.best_flights.length);
    console.log(
      "Best Flights Summary Count:",
      retrievedDoc.best_flights_summary.length
    );

    if (retrievedDoc.best_flights_summary.length > 0) {
      const firstSummary = retrievedDoc.best_flights_summary[0];
      console.log("\nSample Best Flight Summary:");
      console.log("Price:", firstSummary.price);
      console.log("Airline:", firstSummary.airline);
      console.log("Duration:", firstSummary.total_duration);
      console.log(
        "Carbon Emissions:",
        firstSummary.carbon_emissions?.amount || "N/A"
      );
    }

    if (retrievedDoc.best_flights.length > 0) {
      const firstBestFlight = retrievedDoc.best_flights[0];
      console.log("\nSample Best Flight Details:");
      console.log("Price:", firstBestFlight.price);
      console.log("Total Duration:", firstBestFlight.total_duration);
      console.log("Layovers:", firstBestFlight.layovers?.length || 0);

      if (firstBestFlight.flights?.length > 0) {
        const firstFlight = firstBestFlight.flights[0];
        console.log("\nFirst Flight Segment:");
        console.log("Airline:", firstFlight.airline);
        console.log("Flight Number:", firstFlight.flight_number);
        console.log(
          `From: ${firstFlight.departure_airport?.name} (${firstFlight.departure_airport?.id}) at ${firstFlight.departure_airport?.time}`
        );
        console.log(
          `To: ${firstFlight.arrival_airport?.name} (${firstFlight.arrival_airport?.id}) at ${firstFlight.arrival_airport?.time}`
        );
      }
    }

    console.log("\nTest completed successfully!");

    // Close database connection
    await connection.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testEnhancedSchema().then(() => {
  process.exit(0);
});
