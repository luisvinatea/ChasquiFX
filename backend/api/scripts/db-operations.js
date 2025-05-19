/**
 * Database Operations Module for Scripts
 *
 * Provides standardized database operations for script usage
 * Combines mongodb-client and data-utils modules
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  loadEnvironment,
  initMongoDB,
  createLogger,
} from "../src/db/mongodb-client.js";
import {
  importAllData,
  importFlightData,
  importForexData,
  importGeoData,
} from "../src/db/data-utils.js";

// Initialize logger
const logger = createLogger();

// Collection configuration for duplicate checking
export const COLLECTION_UNIQUE_FIELDS = {
  // Original cache collections
  ForexCache: "cacheKey",
  FlightCache: "cacheKey",
  ApiCallLog: "fingerprint", // Use fingerprint field if available

  // Actual collections from MongoDB Atlas connection test
  forex: "_source", // Using the source filename as unique identifier
  flights: "_source", // Using the source filename as unique identifier - most reliable
  geo: "_id", // Using the MongoDB _id field
};

// For collections without a natural unique field, define composite keys
export const COLLECTION_COMPOSITE_KEYS = {
  // Fallback for older logs without fingerprint field
  ApiCallLog: ["endpoint", "timestamp", "userId"],

  // Alternative composite keys for imported data
  forex: ["currency_pair", "date_imported"],
  flights: [
    "route_info.departure_airport",
    "route_info.arrival_airport",
    "route_info.outbound_date",
    "route_info.return_date",
  ], // Enhanced route info
  geo: ["name", "country", "iata_code"], // For airports with multiple identifiers
};

/**
 * Initialize a MongoDB connection with proper environment setup
 * @param {Object} options - Connection options
 * @param {string} options.envPath - Optional custom path to .env file
 * @param {Array<string>} options.collections - Optional collections to initialize
 * @returns {Promise<Object>} Object with db and client properties
 */
export async function initDatabaseConnection(options = {}) {
  try {
    const { envPath, collections } = options;

    // Determine the directory path of the calling script
    let scriptDir;
    try {
      // For ESM modules
      const filename = fileURLToPath(import.meta.url);
      scriptDir = path.dirname(filename);
    } catch (error) {
      // For CommonJS modules
      scriptDir = __dirname;
    }

    // Default to two directories up from the current script (assumes scripts are in backend/api/scripts)
    const defaultEnvPath = path.resolve(scriptDir, "../../.env");

    // Load environment variables
    const loadedEnvPath = loadEnvironment(envPath || defaultEnvPath);
    logger.info(`Using environment from: ${loadedEnvPath}`);

    // Initialize MongoDB connection
    return await initMongoDB(loadedEnvPath, collections);
  } catch (error) {
    logger.error(`Failed to initialize database connection: ${error.message}`);
    throw error;
  }
}

/**
 * Find duplicates in a collection based on a unique field
 *
 * @param {Object} collection - MongoDB collection
 * @param {string} uniqueField - Field that should be unique
 * @returns {Promise<Array>} - Array of duplicate documents grouped by the unique field
 */
export async function findDuplicatesByField(collection, uniqueField) {
  const pipeline = [
    {
      $group: {
        _id: `$${uniqueField}`,
        count: { $sum: 1 },
        docs: { $push: "$$ROOT" },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ];

  return await collection.aggregate(pipeline).toArray();
}

/**
 * Find duplicates in a collection based on a composite key (multiple fields)
 *
 * @param {Object} collection - MongoDB collection
 * @param {Array<string>} compositeFields - Fields that together form a unique key
 * @returns {Promise<Array>} - Array of duplicate documents grouped by the composite key
 */
export async function findDuplicatesByCompositeKey(
  collection,
  compositeFields
) {
  const groupId = {};
  compositeFields.forEach((field) => {
    groupId[field] = `$${field}`;
  });

  const pipeline = [
    {
      $group: {
        _id: groupId,
        count: { $sum: 1 },
        docs: { $push: "$$ROOT" },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ];

  return await collection.aggregate(pipeline).toArray();
}

/**
 * Remove duplicate documents from a collection
 *
 * @param {Object} collection - MongoDB collection
 * @param {Array} duplicateGroups - Array of duplicate groups
 * @param {string} uniqueField - Field used for uniqueness
 * @param {Array<string>} compositeFields - Fields used for composite uniqueness
 * @param {boolean} dryRun - If true, don't actually delete, just report
 * @returns {Promise<number>} - Number of documents removed
 */
export async function removeDuplicates(
  collection,
  duplicateGroups,
  uniqueField,
  compositeFields,
  dryRun = false
) {
  let removedCount = 0;

  for (const group of duplicateGroups) {
    const docs = group.docs;

    // Sort to ensure consistent removal (keep the newest document based on _id)
    docs.sort((a, b) => {
      // MongoDB ObjectId encodes creation time in the first 4 bytes
      if (a._id && b._id) {
        return a._id.toString() > b._id.toString() ? -1 : 1;
      }
      return 0;
    });

    // Keep the first document, remove the rest
    const [docToKeep, ...docsToRemove] = docs;
    const docIds = docsToRemove.map((doc) => doc._id);

    if (docIds.length > 0) {
      logger.info(
        `${dryRun ? "Would remove" : "Removing"} ${
          docIds.length
        } duplicate(s) from ${collection.collectionName}`
      );

      // Only delete if not in dry run mode
      if (!dryRun) {
        const result = await collection.deleteMany({ _id: { $in: docIds } });
        removedCount += result.deletedCount;
      } else {
        removedCount += docIds.length;
      }
    }
  }

  logger.info(
    `${
      dryRun ? "Would remove" : "Removed"
    } ${removedCount} duplicate document(s) from ${collection.collectionName}`
  );

  return removedCount;
}

/**
 * Creates indexes for frequently queried fields to optimize performance
 * @param {Object} db - MongoDB database instance
 * @returns {Promise<void>}
 */
export async function createIndexes(db) {
  try {
    // Create indexes for the flights collection
    await db.collection("flights").createIndexes([
      { key: { _source: 1 }, name: "source_index", unique: true },
      { key: { "route_info.departure_airport": 1 }, name: "departure_index" },
      { key: { "route_info.arrival_airport": 1 }, name: "arrival_index" },
      {
        key: {
          "route_info.departure_airport": 1,
          "route_info.arrival_airport": 1,
        },
        name: "route_index",
      },
      { key: { imported_at: 1 }, name: "imported_at_index" },
    ]);

    // Create indexes for the forex collection
    await db.collection("forex").createIndexes([
      { key: { _source: 1 }, name: "source_index", unique: true },
      { key: { currency_pair: 1 }, name: "currency_pair_index" },
      { key: { date_imported: 1 }, name: "date_imported_index" },
    ]);

    // Create indexes for the geo collection
    await db.collection("geo").createIndexes([
      { key: { iata_code: 1 }, name: "iata_code_index", sparse: true },
      { key: { name: 1 }, name: "name_index" },
      { key: { country: 1 }, name: "country_index" },
    ]);

    logger.info("Created indexes on all collections");
  } catch (error) {
    logger.error(`Error creating indexes: ${error.message}`);
    throw error;
  }
}

/**
 * Find duplicates in all collections or a specified one
 *
 * @param {Object} db - MongoDB database instance
 * @param {Object} options - Options object
 * @param {string} options.specificCollection - Process only this collection if specified
 * @param {boolean} options.dryRun - If true, don't actually delete, just report
 * @returns {Promise<Object>} - Summary of duplicate documents by collection
 */
export async function findAndManageDuplicates(db, options = {}) {
  const { specificCollection = null, dryRun = true } = options;

  try {
    // Get all collections or the specified one
    const collections = specificCollection
      ? [specificCollection]
      : await db
          .listCollections()
          .toArray()
          .then((cols) => cols.map((col) => col.name));

    logger.info(`Checking collections: ${collections.join(", ")}`);

    let totalDuplicates = 0;
    let duplicatesFound = {};

    // Check each collection for duplicates
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);

      // Get the unique field for this collection
      const uniqueField = COLLECTION_UNIQUE_FIELDS[collectionName];
      const compositeFields = COLLECTION_COMPOSITE_KEYS[collectionName];

      if (!uniqueField && !compositeFields) {
        logger.info(
          `Skipping ${collectionName} - no unique field or composite key defined`
        );
        continue;
      }

      logger.info(`Checking ${collectionName} for duplicates...`);

      let duplicates = [];

      if (uniqueField) {
        logger.debug(`Using unique field: ${uniqueField}`);
        duplicates = await findDuplicatesByField(collection, uniqueField);
      } else if (compositeFields) {
        logger.debug(`Using composite key: ${compositeFields.join(", ")}`);
        duplicates = await findDuplicatesByCompositeKey(
          collection,
          compositeFields
        );
      }

      // Process duplicates if found
      if (duplicates.length > 0) {
        const totalDocs = duplicates.reduce(
          (sum, group) => sum + group.docs.length,
          0
        );
        const removableDocs = duplicates.reduce(
          (sum, group) => sum + group.docs.length - 1,
          0
        );

        duplicatesFound[collectionName] = {
          groups: duplicates.length,
          totalDocs,
          removableDocs,
        };

        totalDuplicates += removableDocs;

        logger.info(
          `Found ${duplicates.length} duplicate groups in ${collectionName} with ${removableDocs} removable documents`
        );

        // Remove duplicates if not in dry run mode
        if (!dryRun) {
          const removedCount = await removeDuplicates(
            collection,
            duplicates,
            uniqueField,
            compositeFields,
            false // not dry run here since we already checked above
          );

          duplicatesFound[collectionName].removedCount = removedCount;
        }
      } else {
        logger.info(`No duplicates found in ${collectionName}`);
      }
    }

    // Print summary
    logger.info("");
    logger.info("===== DUPLICATE DOCUMENT SUMMARY =====");

    for (const [collection, info] of Object.entries(duplicatesFound)) {
      logger.info(
        `${collection}: ${info.groups} duplicate groups, ${info.removableDocs} removable documents`
      );

      if (!dryRun && info.removedCount !== undefined) {
        logger.info(`  -> Removed ${info.removedCount} documents`);
      }
    }

    logger.info(`Total duplicate documents found: ${totalDuplicates}`);

    if (dryRun && totalDuplicates > 0) {
      logger.info("");
      logger.info("This was a dry run. No documents were actually removed.");
      logger.info("To remove duplicates, run without the --dry-run flag");
    }

    return duplicatesFound;
  } catch (error) {
    logger.error(`Error finding duplicates: ${error.message}`);
    throw error;
  }
}

// Re-export functions from other modules for convenience
export { importAllData, importFlightData, importForexData, importGeoData };

export default {
  initDatabaseConnection,
  findDuplicatesByField,
  findDuplicatesByCompositeKey,
  removeDuplicates,
  createIndexes,
  findAndManageDuplicates,
  importAllData,
  importFlightData,
  importForexData,
  importGeoData,
  COLLECTION_UNIQUE_FIELDS,
  COLLECTION_COMPOSITE_KEYS,
};
