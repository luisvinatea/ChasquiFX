/**
 * MongoDB Atlas Connection Test
 *
 * Tests connection to MongoDB Atlas and optionally imports sample data
 * Uses modular database operations from db-operations.js
 */

// Import required modules
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  initDatabaseConnection,
  importAllData,
  createIndexes,
} from "../db-operations.js";
import { createLogger } from "../../src/db/mongodb-client.js";

// Initialize logger
const logger = createLogger();

// Get directory name for data directory path calculation
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for data files - going up one more directory to reach backend/assets/data
const dataDir = path.join(__dirname, "../../../assets/data");
logger.info(`Data directory: ${dataDir}`);

// Configure options for database connection
const connectionOptions = {
  envPath: process.env.ENV_PATH, // Will use ENV_PATH if provided
  collections: ["forex", "flights", "geo"], // Ensure these collections exist
};

/**
 * Import data from all collections
 * @param {Object} db - MongoDB database instance
 */
async function importAllDataFromDirs(db) {
  // Import data from the dataDir using the imported function
  try {
    const stats = await importAllData(db, dataDir);

    // Log import statistics
    logger.info("===== DATA IMPORT SUMMARY =====");
    logger.info(
      `Geo data: ${stats.geo.success}/${stats.geo.total} files imported successfully`
    );
    logger.info(
      `Forex data: ${stats.forex.success}/${stats.forex.total} files imported successfully`
    );
    logger.info(
      `Flight data: ${stats.flights.success}/${stats.flights.total} files imported successfully`
    );

    // Create indexes for better query performance
    await createIndexes(db);
  } catch (error) {
    logger.error(`Error importing data: ${error.message}`);
  }
}

/**
 * Main function that runs the MongoDB Atlas connection test
 */
async function main() {
  try {
    // Connect to MongoDB and setup collections
    logger.info("Initializing MongoDB connection...");
    const { db, client } = await initDatabaseConnection(connectionOptions);

    // If we got here, connection is successful
    logger.info("Successfully connected to MongoDB Atlas!");

    // Check if data import is needed by looking at data directory
    if (fs.existsSync(dataDir)) {
      const geoDir = path.join(dataDir, "geo");
      const forexDir = path.join(dataDir, "forex");
      const flightsDir = path.join(dataDir, "flights");

      const hasDataFiles =
        (fs.existsSync(geoDir) && fs.readdirSync(geoDir).length > 0) ||
        (fs.existsSync(forexDir) && fs.readdirSync(forexDir).length > 0) ||
        (fs.existsSync(flightsDir) && fs.readdirSync(flightsDir).length > 0);

      if (hasDataFiles) {
        logger.info("Found data files to import. Beginning import process...");
        await importAllDataFromDirs(db);
      } else {
        logger.info("No data files found to import.");
      }
    } else {
      logger.info(
        `Data directory ${dataDir} does not exist. Skipping import.`
      );
    }

    // Close the connection
    await client.close();
    logger.info("MongoDB connection closed.");
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the test
main();
