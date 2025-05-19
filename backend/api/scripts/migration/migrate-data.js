/**
 * Data Migration Script
 *
 * This script migrates existing JSON files from the filesystem to MongoDB
 * using the standardized naming conventions from file_renamer.py.
 *
 * Usage: node migrate-data.js [options]
 * Options:
 *   --dry-run   Don't actually migrate, just show what would be migrated
 *   --forex     Migrate only forex data
 *   --flight    Migrate only flight data
 */

require("dotenv").config();
const fs = require("fs").promises;
const path = require("path");
const mongoose = require("mongoose");
const { connectToDatabase } = require("../../src/db/mongodb");
const { ForexCache, FlightCache, Flight } = require("../../src/db/schemas");
const {
  standardizeFlightFilename,
  standardizeForexFilename,
} = require("../../src/services/fileStandardizationService");

// Configuration
const FLIGHTS_DATA_DIR = path.resolve(__dirname, "../../assets/data/flights");
const FOREX_DATA_DIR = path.resolve(__dirname, "../../assets/data/forex");
const DEFAULT_EXPIRY_HOURS = {
  flight: 24,
  forex: 12,
};

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const migrateForex = args.includes("--forex") || !args.includes("--flight");
const migrateFlight = args.includes("--flight") || !args.includes("--forex");

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
    logger.error(`Error reading JSON file ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Migrate flight data files to MongoDB
 * @param {boolean} dryRun - If true, don't actually migrate
 * @returns {Promise<number>} - Number of migrated files
 */
async function migrateFlightData(dryRun) {
  try {
    logger.info("Starting flight data migration...");
    const files = await fs.readdir(FLIGHTS_DATA_DIR);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    logger.info(`Found ${jsonFiles.length} flight data files to process`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const fileName of jsonFiles) {
      try {
        const filePath = path.join(FLIGHTS_DATA_DIR, fileName);
        const data = await readJsonFile(filePath);

        if (!data) {
          errorCount++;
          continue;
        }

        // Extract search parameters from filename
        const fileNameParts = path.basename(fileName, ".json").split("_");
        if (fileNameParts.length !== 4) {
          logger.warn(`Skipping ${fileName}: Invalid naming format`);
          skipCount++;
          continue;
        }

        const [departure_id, arrival_id, outbound_date, return_date] =
          fileNameParts;

        // Add search parameters to data if they don't exist
        if (!data.search_parameters) {
          data.search_parameters = {
            departure_id,
            arrival_id,
            outbound_date,
            return_date,
          };
        }

        // Generate standardized cache key
        const cacheKey = await standardizeFlightFilename(data);

        // Check if document already exists
        const existingDocument = await FlightCache.findOne({ cacheKey });
        if (existingDocument) {
          logger.debug(`Skipping ${fileName}: Already exists in database`);
          skipCount++;
          continue;
        }

        // Calculate expiry date (default: 24 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + DEFAULT_EXPIRY_HOURS.flight);

        // Create the cache entry
        if (!dryRun) {
          await FlightCache.create({
            cacheKey,
            searchParameters: {
              departure_id,
              arrival_id,
              outbound_date,
              return_date,
            },
            data,
            expiresAt,
          });
        }

        logger.info(
          `${
            dryRun ? "Would migrate" : "Migrated"
          } flight data: ${fileName} -> ${cacheKey}`
        );
        successCount++;
      } catch (error) {
        logger.error(
          `Error processing flight file ${fileName}: ${error.message}`
        );
        errorCount++;
      }
    }

    logger.info(
      `Flight data migration completed: ${successCount} migrated, ${skipCount} skipped, ${errorCount} errors`
    );
    return successCount;
  } catch (error) {
    logger.error(`Error in flight data migration: ${error.message}`);
    return 0;
  }
}

/**
 * Migrate flight data files to MongoDB using enhanced schema
 * @param {boolean} dryRun - If true, don't actually migrate
 * @returns {Promise<number>} - Number of migrated files
 */
async function migrateFlightDataEnhanced(dryRun) {
  try {
    logger.info("Starting enhanced flight data migration...");
    const files = await fs.readdir(FLIGHTS_DATA_DIR);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    logger.info(`Found ${jsonFiles.length} flight data files to process`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const fileName of jsonFiles) {
      try {
        const filePath = path.join(FLIGHTS_DATA_DIR, fileName);
        const flightData = await readJsonFile(filePath);

        if (!flightData) {
          errorCount++;
          continue;
        }

        // Extract route information from filename
        const fileNameParts = path.basename(fileName, ".json").split("_");
        if (fileNameParts.length !== 4) {
          logger.warn(`Skipping ${fileName}: Invalid naming format`);
          skipCount++;
          continue;
        }

        const [departureAirport, arrivalAirport, outboundDate, returnDate] =
          fileNameParts;

        // Check if document already exists
        const existingDocument = await Flight.findOne({ _source: fileName });
        if (existingDocument) {
          logger.debug(`Skipping ${fileName}: Already exists in database`);
          skipCount++;
          continue;
        }

        // Create a comprehensive flight document
        const enhancedFlightDoc = {
          _source: fileName,
          route: fileName.split(".")[0],
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

          // Best flights summary (for quick access)
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
        if (!dryRun) {
          await Flight.create(enhancedFlightDoc);
        }

        logger.info(
          `${
            dryRun ? "Would migrate" : "Migrated"
          } flight data with enhanced schema: ${fileName}`
        );
        successCount++;
      } catch (error) {
        logger.error(
          `Error processing flight file with enhanced schema ${fileName}: ${error.message}`
        );
        errorCount++;
      }
    }

    logger.info(
      `Enhanced flight data migration completed: ${successCount} migrated, ${skipCount} skipped, ${errorCount} errors`
    );
    return successCount;
  } catch (error) {
    logger.error(`Error in enhanced flight data migration: ${error.message}`);
    return 0;
  }
}

/**
 * Migrate forex data files to MongoDB
 * @param {boolean} dryRun - If true, don't actually migrate
 * @returns {Promise<number>} - Number of migrated files
 */
async function migrateForexData(dryRun) {
  try {
    logger.info("Starting forex data migration...");
    const files = await fs.readdir(FOREX_DATA_DIR);
    const jsonFiles = files.filter(
      (file) => file.endsWith(".json") && file !== "api_quota_status.json"
    );

    logger.info(`Found ${jsonFiles.length} forex data files to process`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const fileName of jsonFiles) {
      try {
        const filePath = path.join(FOREX_DATA_DIR, fileName);
        const data = await readJsonFile(filePath);

        if (!data) {
          errorCount++;
          continue;
        }

        // Extract currency pair from filename
        const fileNameMatch = path
          .basename(fileName, ".json")
          .match(/^([A-Z]{3}-[A-Z]{3})_(.+)$/);
        if (!fileNameMatch) {
          logger.warn(`Skipping ${fileName}: Invalid naming format`);
          skipCount++;
          continue;
        }

        const currencyPair = fileNameMatch[1];
        let createdAt = fileNameMatch[2].replace(/-/g, ":");
        createdAt = createdAt.slice(0, 10) + " " + createdAt.slice(11);

        // Add search parameters to data if they don't exist
        if (!data.search_parameters) {
          data.search_parameters = { q: currencyPair };
        }
        if (!data.search_metadata) {
          data.search_metadata = { created_at: createdAt };
        }

        // Generate standardized cache key
        const cacheKey = await standardizeForexFilename(data);

        // Check if document already exists
        const existingDocument = await ForexCache.findOne({ cacheKey });
        if (existingDocument) {
          logger.debug(`Skipping ${fileName}: Already exists in database`);
          skipCount++;
          continue;
        }

        // Calculate expiry date (default: 12 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + DEFAULT_EXPIRY_HOURS.forex);

        // Create the cache entry
        if (!dryRun) {
          await ForexCache.create({
            cacheKey,
            searchParameters: {
              q: currencyPair,
            },
            searchMetadata: {
              created_at: data.search_metadata.created_at || createdAt,
            },
            data,
            expiresAt,
          });
        }

        logger.info(
          `${
            dryRun ? "Would migrate" : "Migrated"
          } forex data: ${fileName} -> ${cacheKey}`
        );
        successCount++;
      } catch (error) {
        logger.error(
          `Error processing forex file ${fileName}: ${error.message}`
        );
        errorCount++;
      }
    }

    logger.info(
      `Forex data migration completed: ${successCount} migrated, ${skipCount} skipped, ${errorCount} errors`
    );
    return successCount;
  } catch (error) {
    logger.error(`Error in forex data migration: ${error.message}`);
    return 0;
  }
}

/**
 * Main migration function
 */
async function migrateData() {
  try {
    // Parse additional command line arguments
    const useEnhancedSchema = args.includes("--enhanced-schema");

    logger.info(
      `Starting data migration ${dryRun ? "(DRY RUN)" : ""} for ${
        migrateForex ? "forex" : ""
      }${migrateForex && migrateFlight ? " and " : ""}${
        migrateFlight ? "flight" : ""
      } data${useEnhancedSchema ? " with enhanced schema" : ""}`
    );

    // Connect to MongoDB
    await connectToDatabase();

    // Migrate flight data
    if (migrateFlight) {
      if (useEnhancedSchema) {
        await migrateFlightDataEnhanced(dryRun);
      } else {
        await migrateFlightData(dryRun);
      }
    }

    // Migrate forex data
    if (migrateForex) {
      await migrateForexData(dryRun);
    }

    logger.info("Data migration completed");

    // Close database connection
    await mongoose.connection.close();
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the migration
migrateData().then(() => {
  process.exit(0);
});
