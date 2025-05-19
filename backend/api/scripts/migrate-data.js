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
const { connectToDatabase } = require("../src/db/mongodb");
const { ForexCache, FlightCache } = require("../src/db/schemas");
const {
  standardizeFlightFilename,
  standardizeForexFilename,
} = require("../src/services/fileStandardizationService");

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
    logger.info(`Starting data migration ${dryRun ? "(DRY RUN)" : ""}`);

    // Connect to MongoDB
    await connectToDatabase();

    // Migrate flight data if requested
    if (migrateFlight) {
      await migrateFlightData(dryRun);
    }

    // Migrate forex data if requested
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
