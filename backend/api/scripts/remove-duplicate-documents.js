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
import { connectToDatabase } from "../src/db/mongodb.js";
import { initLogger } from "../src/utils/logger.js";
import dotenv from "dotenv";

// Initialize environment variables
dotenv.config();

// Initialize logger
const logger = initLogger();

// Define unique fields for each collection
const COLLECTION_UNIQUE_FIELDS = {
  ForexCache: "cacheKey",
  FlightCache: "cacheKey",
  ApiCallLog: null, // No natural unique identifier, use composite key below
};

// For collections without a natural unique field, define composite keys
const COLLECTION_COMPOSITE_KEYS = {
  ApiCallLog: ["endpoint", "timestamp", "userId"],
};

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const collectionArg = args.find((arg) => arg.startsWith("--collection="));
const specificCollection = collectionArg ? collectionArg.split("=")[1] : null;

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
    const connection = await connectToDatabase();
    const db = mongoose.connection.db;

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
