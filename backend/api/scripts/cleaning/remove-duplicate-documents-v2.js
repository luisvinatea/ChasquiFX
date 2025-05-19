/**
 * MongoDB duplicate document finder and remover (v2)
 *
 * This script identifies and removes duplicate documents in MongoDB collections
 * based on specified unique fields for each collection.
 * Uses modular database operations from db-operations.js
 *
 * Usage:
 *   node remove-duplicate-documents-v2.js
 *   node remove-duplicate-documents-v2.js --dry-run
 *   node remove-duplicate-documents-v2.js --collection=ForexCache
 */

import {
  initDatabaseConnection,
  findAndManageDuplicates,
  createLogger,
} from "../db-operations.js";

// Initialize logger
const logger = createLogger();

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const collectionArg = args.find((arg) => arg.startsWith("--collection="));
const specificCollection = collectionArg ? collectionArg.split("=")[1] : null;

// Main function
async function main() {
  try {
    // Initialize database connection
    logger.info("Connecting to MongoDB...");
    const { db, client } = await initDatabaseConnection();

    // Find and manage duplicates
    const options = {
      specificCollection,
      dryRun,
    };

    // Log what we're doing
    if (specificCollection) {
      logger.info(
        `Checking for duplicates in collection: ${specificCollection}`
      );
    } else {
      logger.info("Checking for duplicates in all collections");
    }

    if (dryRun) {
      logger.info("Running in dry-run mode (will not remove any documents)");
    }

    // Process duplicates
    const result = await findAndManageDuplicates(db, options);

    // Close the MongoDB connection
    await client.close();
    logger.info("MongoDB connection closed");
  } catch (error) {
    logger.error(`Error processing duplicates: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main();
