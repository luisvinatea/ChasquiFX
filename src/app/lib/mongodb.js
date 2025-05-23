/**
 * MongoDB Client Connection Module for Next.js API Routes
 *
 * A shared module for establishing connections to MongoDB
 * with optimizations for serverless functions.
 */

import { MongoClient, ServerApiVersion } from "mongodb";

// Global connection promise to reuse connections across invocations
let cachedClient = null;
let cachedDb = null;

// Define log levels for consistent logging
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Creates a standardized logger with configurable log level
 * @returns {Object} Logger object with error, warn, info, debug methods
 */
export function createLogger() {
  const logLevel = LOG_LEVELS[process.env.LOG_LEVEL || "info"];

  return {
    error: (...args) => {
      const date = new Date().toISOString().replace("T", " ").substr(0, 19);
      console.error(`${date} error :`, ...args);
    },
    warn: (...args) => {
      if (logLevel >= LOG_LEVELS.warn) {
        const date = new Date().toISOString().replace("T", " ").substr(0, 19);
        console.warn(`${date} warn  :`, ...args);
      }
    },
    info: (...args) => {
      if (logLevel >= LOG_LEVELS.info) {
        const date = new Date().toISOString().replace("T", " ").substr(0, 19);
        console.info(`${date} info  :`, ...args);
      }
    },
    debug: (...args) => {
      if (logLevel >= LOG_LEVELS.debug) {
        const date = new Date().toISOString().replace("T", " ").substr(0, 19);
        console.debug(`${date} debug :`, ...args);
      }
    },
  };
}

// Instantiate the logger
const logger = createLogger();

/**
 * Connect to MongoDB using connection pooling and caching
 * Optimized for serverless environment to reuse connections
 */
export async function connectToDatabase() {
  try {
    // Check for existing cached connection
    if (cachedClient && cachedDb) {
      logger.debug("Using cached database connection");
      return { client: cachedClient, db: cachedDb };
    }

    // Validate MongoDB URI exists in environment
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MongoDB connection string not found in environment variables"
      );
    }

    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || "chasquifx";

    // Configure MongoDB client options
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverApi: ServerApiVersion.v1,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    logger.debug("Connecting to MongoDB...");

    // Create a new MongoClient
    const client = new MongoClient(uri, options);
    await client.connect();
    const db = client.db(dbName);

    // Cache the client and db connection
    cachedClient = client;
    cachedDb = db;

    logger.info(`Connected to MongoDB: ${dbName}`);
    return { client, db };
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    throw error;
  }
}
