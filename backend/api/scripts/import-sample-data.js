/**
 * MongoDB Data Import Tool
 *
 * This script imports sample data into MongoDB for testing purposes.
 * Run with: node import-sample-data.js [--file path/to/file.json] [--directory path/to/dir]
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

// Parse command line arguments
const args = process.argv.slice(2);
let filePath = null;
let directoryPath = null;
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--file" && i + 1 < args.length) {
    filePath = args[i + 1];
    i++;
  } else if (args[i] === "--directory" && i + 1 < args.length) {
    directoryPath = args[i + 1];
    i++;
  } else if (args[i] === "--dry-run") {
    dryRun = true;
  } else if (args[i] === "--help") {
    console.log("MongoDB Data Import Tool");
    console.log("Usage: node import-sample-data.js [options]");
    console.log("Options:");
    console.log("  --file PATH         Import a single file");
    console.log("  --directory PATH    Import all JSON files in directory");
    console.log(
      "  --dry-run           Show what would be imported without doing it"
    );
    console.log("  --help              Show this help message");
    process.exit(0);
  }
}

// Logger
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  debug: (msg) => (dryRun ? console.debug(`[DEBUG] ${msg}`) : null),
};

/**
 * Read and parse a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {Promise<Object>} - Parsed JSON object
 */
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Failed to read JSON file ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Identify the type of data (forex or flight) from filename or content
 * @param {string} filePath - Path to the file
 * @param {Object} data - File data
 * @returns {string} - 'forex' or 'flight' or null if can't determine
 */
function identifyDataType(filePath, data) {
  const fileName = path.basename(filePath);

  // Check for common patterns in filename
  if (fileName.match(/[A-Z]{3}-[A-Z]{3}_\d{4}-\d{2}-\d{2}/)) {
    return "forex";
  }

  if (
    fileName.match(/[A-Z]{3}_[A-Z]{3}_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}/)
  ) {
    return "flight";
  }

  // Check based on data content
  if (data && data.search_parameters) {
    if (data.search_parameters.q) {
      return "forex";
    }

    if (
      data.search_parameters.departure_id &&
      data.search_parameters.arrival_id
    ) {
      return "flight";
    }
  }

  // Check for distinctive sections in the data
  if (
    data &&
    data.summary &&
    data.summary.stock &&
    data.summary.stock.includes("/")
  ) {
    return "forex";
  }

  if (data && data.itineraries) {
    return "flight";
  }

  return null;
}

/**
 * Import a single file into MongoDB
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} - Success status
 */
async function importFile(filePath) {
  try {
    logger.info(`Processing file: ${filePath}`);

    // Read and parse the file
    const data = await readJsonFile(filePath);
    if (!data) {
      return false;
    }

    // Identify data type
    const dataType = identifyDataType(filePath, data);
    if (!dataType) {
      logger.warn(`Could not identify data type for ${filePath}, skipping`);
      return false;
    }

    logger.info(`Identified as: ${dataType} data`);

    // Generate appropriate cache key
    let cacheKey;
    let searchParams = {};
    let expiryHours;

    if (dataType === "forex") {
      // Extract currency pair from filename or data
      const currencyPair =
        data.search_parameters?.q || path.basename(filePath).split("_")[0];

      // Ensure search parameters exist
      if (!data.search_parameters) {
        data.search_parameters = { q: currencyPair };
      }

      // Ensure search metadata exists
      if (!data.search_metadata) {
        data.search_metadata = {
          created_at: new Date().toISOString(),
        };
      }

      cacheKey = await standardizeForexFilename(data);
      searchParams = { q: currencyPair };
      expiryHours = 12;
    } else if (dataType === "flight") {
      // Extract flight details from filename or data
      const fileName = path.basename(filePath, ".json");
      const parts = fileName.split("_");

      let departure_id, arrival_id, outbound_date, return_date;

      if (parts.length === 4) {
        [departure_id, arrival_id, outbound_date, return_date] = parts;
      } else {
        departure_id = data.search_parameters?.departure_id;
        arrival_id = data.search_parameters?.arrival_id;
        outbound_date = data.search_parameters?.outbound_date;
        return_date = data.search_parameters?.return_date;
      }

      // Ensure search parameters exist
      if (!data.search_parameters) {
        data.search_parameters = {
          departure_id,
          arrival_id,
          outbound_date,
          return_date,
        };
      }

      cacheKey = await standardizeFlightFilename(data);
      searchParams = {
        departure_id,
        arrival_id,
        outbound_date,
        return_date,
      };
      expiryHours = 24;
    }

    if (!cacheKey) {
      logger.error(`Failed to generate cache key for ${filePath}`);
      return false;
    }

    logger.info(`Generated cache key: ${cacheKey}`);

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Create the MongoDB document
    if (!dryRun) {
      if (dataType === "forex") {
        // Check if the document already exists
        const existing = await ForexCache.findOne({ cacheKey });
        if (existing) {
          logger.warn(
            `Document with key ${cacheKey} already exists, skipping`
          );
          return true;
        }

        await ForexCache.create({
          cacheKey,
          searchParameters: searchParams,
          searchMetadata: data.search_metadata,
          data,
          expiresAt,
        });
      } else {
        // Check if the document already exists
        const existing = await FlightCache.findOne({ cacheKey });
        if (existing) {
          logger.warn(
            `Document with key ${cacheKey} already exists, skipping`
          );
          return true;
        }

        await FlightCache.create({
          cacheKey,
          searchParameters: searchParams,
          data,
          expiresAt,
        });
      }

      logger.info(`Imported ${filePath} into MongoDB with key: ${cacheKey}`);
    } else {
      logger.info(`[DRY RUN] Would import ${filePath} with key: ${cacheKey}`);
    }

    return true;
  } catch (error) {
    logger.error(`Failed to import ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Import all JSON files in a directory
 * @param {string} directoryPath - Path to the directory
 * @returns {Promise<{success: number, failure: number}>} - Success and failure counts
 */
async function importDirectory(directoryPath) {
  try {
    logger.info(`Processing directory: ${directoryPath}`);

    // Read directory contents
    const files = await fs.readdir(directoryPath);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    logger.info(`Found ${jsonFiles.length} JSON files to process`);

    let successCount = 0;
    let failureCount = 0;

    // Process each file
    for (const file of jsonFiles) {
      const filePath = path.join(directoryPath, file);
      const success = await importFile(filePath);

      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return { success: successCount, failure: failureCount };
  } catch (error) {
    logger.error(
      `Failed to process directory ${directoryPath}: ${error.message}`
    );
    return { success: 0, failure: 0 };
  }
}

/**
 * Main function
 */
async function main() {
  try {
    logger.info(`Starting data import ${dryRun ? "(DRY RUN)" : ""}`);

    // Connect to MongoDB
    await connectToDatabase();
    logger.info("Connected to MongoDB");

    // Import data
    if (filePath) {
      const success = await importFile(filePath);
      logger.info(`File import ${success ? "successful" : "failed"}`);
    } else if (directoryPath) {
      const result = await importDirectory(directoryPath);
      logger.info(
        `Directory import completed: ${result.success} successful, ${result.failure} failed`
      );
    } else {
      logger.error(
        "No file or directory specified. Use --file or --directory option."
      );
      process.exit(1);
    }

    // Close connection
    await mongoose.connection.close();
    logger.info("MongoDB connection closed");

    process.exit(0);
  } catch (error) {
    logger.error(`Import failed: ${error.message}`);
    try {
      await mongoose.connection.close();
    } catch (e) {
      // Ignore error on close
    }
    process.exit(1);
  }
}

// Run the import
main();
