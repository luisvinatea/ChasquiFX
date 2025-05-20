/**
 * MongoDB Client Connection Module for Vercel Serverless Environment
 *
 * A shared module for establishing connections to MongoDB
 * with optimizations for serverless functions.
 */

import dotenv from "dotenv";
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

// Initialize logger
const logger = createLogger();

/**
 * Creates a MongoDB connection URI from environment variables
 * @returns {object} MongoDB connection URI and database name
 */
export function getConnectionUri() {
  // Get credentials from env
  const username = process.env.MONGODB_USER;
  const password = process.env.MONGODB_PASSWORD;

  // Check if credentials are available
  if (!username || !password) {
    logger.error("MongoDB credentials missing from environment variables");
    logger.error(`MONGODB_USER: ${username ? "Set" : "Missing"}`);
    logger.error(`MONGODB_PASSWORD: ${password ? "Set" : "Missing"}`);
    throw new Error("MongoDB credentials missing");
  }

  // Encode credentials for URL
  const encodedUsername = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);

  // Get host and database name from environment variables with defaults
  const host = process.env.MONGODB_HOST || "chasquifx.ymxb5bs.mongodb.net";
  const dbName = process.env.MONGODB_DBNAME || "chasquifx";

  logger.debug(`Using MongoDB host: ${host}`);
  logger.debug(`Using database name: ${dbName}`);

  // Build the URI
  return {
    uri: `mongodb+srv://${encodedUsername}:${encodedPassword}@${host}/${dbName}?retryWrites=true&w=majority&appName=ChasquiFXVercel`,
    maskedUri: `mongodb+srv://${encodedUsername}:****@${host}/${dbName}?retryWrites=true&w=majority&appName=ChasquiFXVercel`,
    dbName,
  };
}

/**
 * Creates a MongoDB client with optimization for serverless environments
 * @returns {Promise<object>} Object with db and client properties
 */
export async function connectToDatabase() {
  // Use cached connection if available
  if (cachedClient && cachedDb) {
    logger.debug("Using cached database connection");
    return {
      client: cachedClient,
      db: cachedDb,
    };
  }

  // Load environment variables if not already loaded
  if (!process.env.MONGODB_USER) {
    logger.debug("Loading environment variables");
    dotenv.config();
  }

  // Get connection details
  const { uri, maskedUri, dbName } = getConnectionUri();
  logger.debug(`Connection URI: ${maskedUri}`);

  logger.info("Creating new database connection");
  // Create a new MongoClient with MongoDB Atlas recommended options
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    // Vercel serverless function specific options
    maxPoolSize: 10, // Adjust based on expected concurrency
    minPoolSize: 0, // Start with no connections and scale as needed
    maxIdleTimeMS: 120000, // Close idle connections after 2 minutes
  });

  try {
    // Connect to the MongoDB database
    await client.connect();
    logger.info("Connected to MongoDB Atlas");

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    logger.info("Pinged your deployment. Successfully connected to MongoDB!");

    // Cache the client and db connection
    cachedClient = client;
    cachedDb = client.db(dbName);

    return {
      client: cachedClient,
      db: cachedDb,
    };
  } catch (error) {
    logger.error(`Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
}

export default {
  connectToDatabase,
  getConnectionUri,
  createLogger,
};
