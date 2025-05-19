/**
 * MongoDB Database Initialization Script
 *
 * This script initializes the MongoDB database with proper indexes and validation.
 */

require("dotenv").config();
import { connection as _connection } from "mongoose";
import { connectToDatabase } from "../../src/db/mongodb";
import { ForexCache, FlightCache, ApiCallLog } from "../../src/db/schemas";

// Set up logger
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  debug: (msg) => console.debug(`[DEBUG] ${msg}`),
};

/**
 * Create indexes for collections
 */
async function createIndexes() {
  try {
    logger.info("Creating indexes...");

    // ForexCache indexes
    const forexIndexes = await ForexCache.collection
      .listIndexes()
      .toArray();
    const forexIndexNames = forexIndexes.map((index) => index.name);

    if (!forexIndexNames.includes("cacheKey_1")) {
      await ForexCache.collection.createIndex(
        { cacheKey: 1 },
        { unique: true }
      );
      logger.info("Created unique index on ForexCache.cacheKey");
    }

    if (!forexIndexNames.includes("search_parameters.q_1")) {
      await ForexCache.collection.createIndex({
        "searchParameters.q": 1,
      });
      logger.info("Created index on ForexCache.searchParameters.q");
    }

    if (!forexIndexNames.includes("expiresAt_1")) {
      await ForexCache.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      );
      logger.info("Created TTL index on ForexCache.expiresAt");
    }

    // FlightCache indexes
    const flightIndexes = await FlightCache.collection
      .listIndexes()
      .toArray();
    const flightIndexNames = flightIndexes.map((index) => index.name);

    if (!flightIndexNames.includes("cacheKey_1")) {
      await FlightCache.collection.createIndex(
        { cacheKey: 1 },
        { unique: true }
      );
      logger.info("Created unique index on FlightCache.cacheKey");
    }

    if (
      !flightIndexNames.includes(
        "searchParameters.departure_id_1_searchParameters.arrival_id_1"
      )
    ) {
      await FlightCache.collection.createIndex({
        "searchParameters.departure_id": 1,
        "searchParameters.arrival_id": 1,
      });
      logger.info(
        "Created compound index on FlightCache departure_id and arrival_id"
      );
    }

    if (!flightIndexNames.includes("expiresAt_1")) {
      await FlightCache.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      );
      logger.info("Created TTL index on FlightCache.expiresAt");
    }

    // ApiCallLog indexes
    const apiLogIndexes = await ApiCallLog.collection
      .listIndexes()
      .toArray();
    const apiLogIndexNames = apiLogIndexes.map((index) => index.name);

    if (!apiLogIndexNames.includes("timestamp_1")) {
      await ApiCallLog.collection.createIndex({ timestamp: 1 });
      logger.info("Created index on ApiCallLog.timestamp");
    }

    if (!apiLogIndexNames.includes("endpoint_1")) {
      await ApiCallLog.collection.createIndex({ endpoint: 1 });
      logger.info("Created index on ApiCallLog.endpoint");
    }

    logger.info("All indexes created successfully");
  } catch (error) {
    logger.error(`Error creating indexes: ${error.message}`);
    throw error;
  }
}

/**
 * Initialize the database
 */
async function initializeDatabase() {
  try {
    logger.info("Initializing MongoDB database...");

    // Connect to the database
    const connection = await connectToDatabase();
    logger.info(`Connected to MongoDB database: ${connection.name}`);

    // Create indexes
    await createIndexes();

    logger.info("Database initialization completed successfully");

    // Close the connection
    await _connection.close();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error(`Database initialization failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase().then(() => {
  process.exit(0);
});
