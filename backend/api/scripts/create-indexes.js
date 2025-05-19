/**
 * Create MongoDB indexes to prevent duplicates
 *
 * This script ensures all collections have the proper indexes to prevent duplicate documents
 * based on the unique fields for each collection.
 */

import mongoose from "mongoose";
import { connectToDatabase } from "../src/db/mongodb.js";
import { initLogger } from "../src/utils/logger.js";
import dotenv from "dotenv";

// Initialize environment variables
dotenv.config();

// Initialize logger
const logger = initLogger();

// Define collections and their unique indexes
const COLLECTION_INDEXES = [
  {
    collection: "forexcaches",
    indexes: [
      // Ensure cacheKey is unique
      {
        fields: { cacheKey: 1 },
        options: { unique: true, name: "unique_cache_key" },
      },
      // Create compound index on search parameters for faster lookups
      {
        fields: { "searchParameters.q": 1, "searchMetadata.created_at": 1 },
        options: { name: "search_params_index" },
      },
    ],
  },
  {
    collection: "flightcaches",
    indexes: [
      // Ensure cacheKey is unique
      {
        fields: { cacheKey: 1 },
        options: { unique: true, name: "unique_cache_key" },
      },
      // Create compound index on search parameters for faster lookups
      {
        fields: {
          "searchParameters.departure_id": 1,
          "searchParameters.arrival_id": 1,
          "searchParameters.outbound_date": 1,
          "searchParameters.return_date": 1,
        },
        options: { name: "flight_search_params_index" },
      },
    ],
  },
  {
    collection: "apicalllogs",
    indexes: [
      // Create compound index on compound key fields for API logs
      {
        fields: { endpoint: 1, timestamp: 1, userId: 1 },
        options: { name: "api_call_composite_index" },
      },
    ],
  },
];

/**
 * Ensure all necessary indexes exist in the database
 */
async function createIndexes() {
  try {
    // Connect to the database
    logger.info("Connecting to MongoDB...");
    const connection = await connectToDatabase();
    const db = mongoose.connection.db;

    // Process each collection's indexes
    for (const collectionConfig of COLLECTION_INDEXES) {
      const { collection, indexes } = collectionConfig;
      logger.info(`Processing indexes for collection: ${collection}`);

      // Get collection object
      const collectionObj = db.collection(collection);

      // Create each index
      for (const index of indexes) {
        try {
          logger.info(
            `Creating index ${
              index.options.name || "unnamed"
            } on ${JSON.stringify(index.fields)}`
          );
          await collectionObj.createIndex(index.fields, index.options);
          logger.info(`Index created successfully`);
        } catch (error) {
          // If index already exists with different options, drop and recreate
          if (error.code === 85 || error.codeName === "IndexOptionsConflict") {
            logger.warn(
              `Index options conflict, dropping and recreating: ${error.message}`
            );
            const indexName = index.options.name;
            await collectionObj.dropIndex(indexName);
            await collectionObj.createIndex(index.fields, index.options);
            logger.info(`Index recreated successfully`);
          } else if (
            error.code === 11000 ||
            error.codeName === "DuplicateKey"
          ) {
            logger.warn(
              `Duplicate key error, this suggests duplicates in the collection: ${error.message}`
            );
          } else {
            throw error;
          }
        }
      }
    }

    logger.info("All indexes created successfully");

    // Close the database connection
    await mongoose.connection.close();
    logger.info("MongoDB connection closed");
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    logger.error(error.stack);

    // Close the database connection
    try {
      await mongoose.connection.close();
    } catch (err) {
      // Ignore errors during connection closing
    }
    process.exit(1);
  }
}

// Run the script
createIndexes();
