/**
 * MongoDB duplicate document finder and remover
 *
 * This script identifies and removes duplicate documents in MongoDB collections
 * based on specified unique fields for each collection.
 *
 * Usage:
 *   node remove-duplicate-documents.js
 *   node remove-duplicate-documents.js --dry-run
 *   node remove-duplicate-documents.js --collection=ForexCache
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { MongoClient, ServerApiVersion } from "mongodb";
import { fileURLToPath } from "url";

// Setup environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize environment variables from ENV_PATH if provided, otherwise use default location
let envPath;
if (process.env.ENV_PATH && fs.existsSync(process.env.ENV_PATH)) {
  envPath = process.env.ENV_PATH;
} else {
  // Default to the standard backend/api/.env location
  envPath = path.resolve(__dirname, "../../.env");
  if (!fs.existsSync(envPath)) {
    console.error(`Error: .env file not found at ${envPath}`);
    process.exit(1);
  }
}

console.log(`Using environment file: ${envPath}`);
dotenv.config({ path: envPath });

// Initialize logger
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const logLevel = logLevels[process.env.LOG_LEVEL || "info"];

const logger = {
  error: (...args) => {
    const date = new Date().toISOString().replace("T", " ").substr(0, 19);
    console.error(`${date} error :`, ...args);
  },
  warn: (...args) => {
    if (logLevel >= logLevels.warn) {
      const date = new Date().toISOString().replace("T", " ").substr(0, 19);
      console.warn(`${date} warn  :`, ...args);
    }
  },
  info: (...args) => {
    if (logLevel >= logLevels.info) {
      const date = new Date().toISOString().replace("T", " ").substr(0, 19);
      console.info(`${date} info  :`, ...args);
    }
  },
  debug: (...args) => {
    if (logLevel >= logLevels.debug) {
      const date = new Date().toISOString().replace("T", " ").substr(0, 19);
      console.debug(`${date} debug :`, ...args);
    }
  },
};

// Get credentials from env
const username = encodeURIComponent(process.env.MONGODB_USER);
const password = encodeURIComponent(process.env.MONGODB_PASSWORD);

// Check for credentials
// Check for required credentials
if (!username || !password) {
  logger.error("MongoDB credentials missing in environment variables");
  process.exit(1);
}

// Use host and dbName from environment variables or provide defaults
const host = process.env.MONGODB_HOST || "chasquifx.ymxb5bs.mongodb.net";
const dbName = process.env.MONGODB_DBNAME || "chasquifx";

logger.debug(`Using MongoDB host: ${host}`);
logger.debug(`Using database name: ${dbName}`);

// Build the URI
const uri = `mongodb+srv://${username}:${password}@${host}/${dbName}?retryWrites=true&w=majority&appName=ChasquiFX`;

// Create a new MongoClient with MongoDB Atlas recommended options
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Define unique fields for each collection
const COLLECTION_UNIQUE_FIELDS = {
  // Original cache collections
  ForexCache: "cacheKey",
  FlightCache: "cacheKey",
  ApiCallLog: "fingerprint", // Use fingerprint field if available
  
  // Actual collections from MongoDB Atlas connection test
  forex: "_source",  // Using the source filename as unique identifier
  flights: "_source", // Using the source filename as unique identifier - most reliable
  geo: "_id", // Using the MongoDB _id field
};

// For collections without a natural unique field, define composite keys
const COLLECTION_COMPOSITE_KEYS = {
  // Fallback for older logs without fingerprint field
  ApiCallLog: ["endpoint", "timestamp", "userId"],
  
  // Alternative composite keys for imported data
  forex: ["currency_pair", "date_imported"],
  flights: ["route_info.departure_airport", "route_info.arrival_airport", 
            "route_info.outbound_date", "route_info.return_date"], // Enhanced route info
  geo: ["name", "country", "iata_code"], // For airports with multiple identifiers
};

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const collectionArg = args.find((arg) => arg.startsWith("--collection="));
const specificCollection = collectionArg ? collectionArg.split("=")[1] : null;

// Connect to MongoDB Atlas
async function connectToDatabase() {
  try {
    await client.connect();
    logger.info("Connected to MongoDB Atlas");
    return client.db(dbName);
  } catch (error) {
    logger.error(`Failed to connect to MongoDB Atlas: ${error.message}`);
    throw error;
  }
}

/**
 * Find duplicates in a collection based on a unique field
 *
 * @param {mongoose.Collection} collection - MongoDB collection
 * @param {string} uniqueField - Field that should be unique
 * @returns {Promise<Array>} - Array of duplicate documents grouped by the unique field
 */
async function findDuplicatesByField(collection, uniqueField) {
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
 * @param {mongoose.Collection} collection - MongoDB collection
 * @param {Array<string>} compositeFields - Fields that together form a unique key
 * @returns {Promise<Array>} - Array of duplicate documents grouped by the composite key
 */
async function findDuplicatesByCompositeKey(collection, compositeFields) {
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
 * Find duplicates in all collections or a specified one
 */
async function findDuplicates() {
  try {
    // Connect to the database
    logger.info("Connecting to MongoDB...");
    logger.info(`Using environment from: ${envPath}`);
    const db = await connectToDatabase();

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
      // Skip system collections
      if (collectionName.startsWith("system.")) continue;

      const collection = db.collection(collectionName);

      // Check if this collection has a defined unique field
      const uniqueField = COLLECTION_UNIQUE_FIELDS[collectionName];
      const compositeFields = COLLECTION_COMPOSITE_KEYS[collectionName];

      // Skip collections with no defined unique constraints
      if (!uniqueField && !compositeFields) {
        logger.info(`Skipping ${collectionName} - no unique field defined`);
        continue;
      }

      let duplicates;
      let duplicateCount = 0;

      if (uniqueField) {
        logger.info(
          `Checking ${collectionName} for duplicates on field: ${uniqueField}`
        );
        duplicates = await findDuplicatesByField(collection, uniqueField);
      } else {
        logger.info(
          `Checking ${collectionName} for duplicates on composite key: ${compositeFields.join(
            ", "
          )}`
        );
        duplicates = await findDuplicatesByCompositeKey(
          collection,
          compositeFields
        );
      }

      duplicateCount = duplicates.reduce(
        (sum, group) => sum + group.count - 1,
        0
      );
      totalDuplicates += duplicateCount;

      duplicatesFound[collectionName] = {
        uniqueField: uniqueField || `composite(${compositeFields.join(", ")})`,
        groups: duplicates.length,
        count: duplicateCount,
      };

      logger.info(
        `${collectionName}: Found ${duplicates.length} groups with ${duplicateCount} duplicate documents`
      );

      // Remove duplicates if not a dry run
      if (!dryRun && duplicateCount > 0) {
        await removeDuplicates(
          collection,
          duplicates,
          uniqueField,
          compositeFields
        );
      }
    }

    // Print summary
    logger.info("");
    logger.info("===== DUPLICATE DOCUMENT SUMMARY =====");
    for (const [collection, info] of Object.entries(duplicatesFound)) {
      logger.info(
        `${collection} (${info.uniqueField}): ${info.count} duplicates in ${info.groups} groups`
      );
    }
    logger.info(`Total duplicate documents found: ${totalDuplicates}`);

    if (dryRun && totalDuplicates > 0) {
      logger.info("");
      logger.info("This was a dry run. No documents were removed.");
      logger.info(
        "To remove duplicates, run the script without the --dry-run flag"
      );
    }

    // Close the database connection
    await client.close();
    logger.info("MongoDB connection closed");
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    logger.error(error.stack);

    // Close the database connection
    try {
      await client.close();
    } catch (err) {
      // Ignore errors during connection closing
    }
    process.exit(1);
  }
}

/**
 * Remove duplicate documents from a collection
 *
 * @param {mongoose.Collection} collection - MongoDB collection
 * @param {Array} duplicateGroups - Array of duplicate groups
 * @param {string} uniqueField - Field used for uniqueness
 * @param {Array<string>} compositeFields - Fields used for composite uniqueness
 * @returns {Promise<void>}
 */
async function removeDuplicates(
  collection,
  duplicateGroups,
  uniqueField,
  compositeFields
) {
  let removedCount = 0;

  for (const group of duplicateGroups) {
    // Sort docs by createdAt/importedAt/timestamp to keep the newest one
    const docs = group.docs.sort((a, b) => {
      const aDate = a.importedAt || a.createdAt || a.timestamp || new Date(0);
      const bDate = b.importedAt || b.createdAt || b.timestamp || new Date(0);
      return new Date(bDate) - new Date(aDate); // DESC order to keep newest
    });

    // Keep the first document (newest) and delete the rest
    const docsToRemove = docs.slice(1);

    for (const doc of docsToRemove) {
      await collection.deleteOne({ _id: doc._id });
      removedCount++;
    }
  }

  logger.info(
    `Removed ${removedCount} duplicate documents from ${collection.collectionName}`
  );
}

// Run the script
findDuplicates();
