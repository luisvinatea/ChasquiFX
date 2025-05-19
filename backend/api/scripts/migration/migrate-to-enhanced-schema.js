/**
 * Migration script to convert existing MongoDB flight documents to the enhanced schema
 * This script reads existing flight documents and converts them to use the enhanced schema
 */

require("dotenv").config();
import { promises as fs } from "fs";
import { resolve, join } from "path";
import { mongoose, connectToDatabase } from "../utils/mongodb-connection";
import { Flight } from "../../src/db/schemas";

// Configuration
const FLIGHTS_DATA_DIR = resolve(
  __dirname,
  "../../../assets/data/flights"
);

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

// Set up logger
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  debug: (msg) => console.debug(`[DEBUG] ${msg}`),
};

/**
 * Read a JSON file and parse it
 * @param {string} filePath - Path to the JSON file
 * @returns {Promise<Object>} - Parsed JSON object
 */
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Error reading or parsing ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Migrate existing flight documents to use the enhanced schema
 * @returns {Promise<void>}
 */
async function migrateToEnhancedSchema() {
  try {
    logger.info(
      `Starting migration to enhanced schema ${dryRun ? "(DRY RUN)" : ""}`
    );

    // Connect to MongoDB
    await connectToDatabase();

    // Get all existing flight documents in MongoDB (using native driver for flexibility)
    const db = mongoose.connection.db;
    const existingDocuments = await db
      .collection("flights")
      .find({})
      .toArray();

    logger.info(
      `Found ${existingDocuments.length} existing flight documents to migrate`
    );

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const doc of existingDocuments) {
      try {
        const fileName = doc._source;
        logger.info(`Processing document for ${fileName}`);

        // Check if file exists in the flights data directory
        const filePath = join(FLIGHTS_DATA_DIR, fileName);

        let flightData;
        try {
          // Try to read the flight data from the file
          flightData = await readJsonFile(filePath);
        } catch (error) {
          logger.warn(
            `Could not read flight data file for ${fileName}: ${error.message}`
          );
          // Continue with empty flight data
          flightData = { search_parameters: {} };
        }

        // Extract route information from filename
        const fileNameParts = doc.route.split("_");
        if (fileNameParts.length !== 4) {
          logger.warn(`Skipping ${fileName}: Invalid route format`);
          skipCount++;
          continue;
        }

        const [departureAirport, arrivalAirport, outboundDate, returnDate] =
          fileNameParts;

        // Check if search parameters is a string and parse it if needed
        let searchParams = doc.search_parameters;
        if (typeof searchParams === "string") {
          try {
            searchParams = JSON.parse(searchParams);
          } catch (error) {
            logger.warn(
              `Could not parse search parameters for ${fileName}: ${error.message}`
            );
            // Create basic search parameters from route
            searchParams = {
              departure_id: departureAirport,
              arrival_id: arrivalAirport,
              outbound_date: outboundDate,
              return_date: returnDate,
            };
          }
        }

        // Create enhanced flight document
        const enhancedFlightDoc = {
          _source: fileName,
          route: doc.route,
          date_imported: doc.date_imported || new Date().toISOString(),
          raw_data_available: doc.raw_data_available || true,

          // Search metadata
          search_metadata:
            flightData && flightData.search_metadata
              ? flightData.search_metadata
              : {},

          // Search parameters - use what we have from the document or file
          search_parameters: searchParams || {},

          // Route details
          route_info: {
            departure_airport: departureAirport,
            arrival_airport: arrivalAirport,
            outbound_date: outboundDate,
            return_date: returnDate,
          },

          // Best flights summary
          best_flights_summary:
            flightData && flightData.best_flights
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
                      ? flight.flights[flight.flights.length - 1]
                          .arrival_airport.time
                      : null,
                }))
              : [],

          // Complete best flights data
          best_flights:
            flightData && flightData.best_flights
              ? flightData.best_flights
              : [],

          // Other flights count
          other_flights_count:
            flightData && flightData.other_flights
              ? flightData.other_flights.length
              : 0,

          // Price range
          price_range:
            flightData &&
            flightData.best_flights &&
            flightData.best_flights.length > 0
              ? {
                  min: Math.min(
                    ...flightData.best_flights.map((f) => f.price || Infinity)
                  ),
                  max: Math.max(
                    ...flightData.best_flights.map((f) => f.price || 0)
                  ),
                }
              : null,

          // Preserve any additional fields from the original document
          has_flights: doc.has_flights,
        };

        // If not a dry run, update or insert the document
        if (!dryRun) {
          // Check if document already exists in the Flight collection
          const existingEnhancedDoc = await Flight.findOne({
            _source: fileName,
          });

          if (existingEnhancedDoc) {
            // Update the existing document
            await Flight.updateOne({ _source: fileName }, enhancedFlightDoc);
            logger.info(`Updated enhanced schema for ${fileName}`);
          } else {
            // Insert new document with enhanced schema
            await Flight.create(enhancedFlightDoc);
            logger.info(`Created enhanced schema for ${fileName}`);
          }
        } else {
          logger.info(`Would migrate ${fileName} (dry run)`);
        }

        successCount++;
      } catch (error) {
        logger.error(
          `Error processing document ${doc._source}: ${error.message}`
        );
        errorCount++;
      }
    }

    logger.info(
      `Enhanced schema migration completed: ${successCount} migrated, ${skipCount} skipped, ${errorCount} errors`
    );

    // Close database connection
    await mongoose.connection.close();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the migration
migrateToEnhancedSchema().then(() => {
  process.exit(0);
});
