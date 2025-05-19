/**
 * MongoDB Client Connection Module
 *
 * A shared module for establishing connections to MongoDB
 * with standardized error handling and connection options.
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ServerApiVersion } from "mongodb";
import { fileURLToPath } from "url";

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
 * Loads environment variables from the appropriate .env file
 * @param {string} customEnvPath - Optional path to a custom .env file
 * @returns {string} The path to the loaded .env file
 */
export function loadEnvironment(customEnvPath = null) {
  // Get current file's directory when called from an ES module
  let currentDir;
  try {
    const __filename = fileURLToPath(import.meta.url);
    currentDir = path.dirname(__filename);
  } catch (error) {
    // Fallback for CommonJS modules
    currentDir = __dirname;
  }

  let envPath;

  // Use custom path if provided
  if (customEnvPath && fs.existsSync(customEnvPath)) {
    envPath = customEnvPath;
  }
  // Use ENV_PATH environment variable if set
  else if (process.env.ENV_PATH && fs.existsSync(process.env.ENV_PATH)) {
    envPath = process.env.ENV_PATH;
  }
  // Default to backend/api/.env (going up from src/db to backend/api)
  else {
    envPath = path.resolve(currentDir, "../../.env");
    if (!fs.existsSync(envPath)) {
      logger.error(`Error: .env file not found at ${envPath}`);
      throw new Error(`Environment file not found at ${envPath}`);
    }
  }

  logger.debug(`Using environment file: ${envPath}`);
  dotenv.config({ path: envPath });

  return envPath;
}

/**
 * Creates a MongoDB connection URI from environment variables
 * @returns {string} MongoDB connection URI
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
    uri: `mongodb+srv://${encodedUsername}:${encodedPassword}@${host}/${dbName}?retryWrites=true&w=majority&appName=ChasquiFX`,
    maskedUri: `mongodb+srv://${encodedUsername}:****@${host}/${dbName}?retryWrites=true&w=majority&appName=ChasquiFX`,
    dbName,
  };
}

/**
 * Creates a MongoDB client with standardized options
 * @returns {MongoClient} MongoDB client instance
 */
export function createMongoClient() {
  const { uri, maskedUri } = getConnectionUri();
  logger.debug(`Connection URI: ${maskedUri}`);

  // Create a new MongoClient with MongoDB Atlas recommended options
  return new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
}

/**
 * Connects to MongoDB with error handling
 * @param {MongoClient} client - MongoDB client instance
 * @returns {Promise<object>} MongoDB database instance
 */
export async function connectToMongoDB(client = null) {
  // Create client if not provided
  const mongoClient = client || createMongoClient();
  const { dbName } = getConnectionUri();

  try {
    await mongoClient.connect();
    logger.info("Connected to MongoDB Atlas");

    // Send a ping to confirm a successful connection
    await mongoClient.db("admin").command({ ping: 1 });
    logger.info("Pinged your deployment. Successfully connected to MongoDB!");

    return {
      db: mongoClient.db(dbName),
      client: mongoClient,
    };
  } catch (error) {
    logger.error(`Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
}

/**
 * Creates required collections if they don't exist
 * @param {object} db - MongoDB database instance
 * @param {Array<string>} requiredCollections - List of collection names to create
 * @returns {Promise<void>}
 */
export async function setupCollections(
  db,
  requiredCollections = ["forex", "flights", "geo"]
) {
  try {
    // Get list of existing collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((col) => col.name);

    // Create collections if they don't exist
    for (const collection of requiredCollections) {
      if (!collectionNames.includes(collection)) {
        await db.createCollection(collection);
        logger.info(`Created collection: ${collection}`);
      } else {
        logger.info(`Collection ${collection} already exists`);
      }
    }
  } catch (error) {
    logger.error(`Error setting up collections: ${error.message}`);
    throw error;
  }
}

/**
 * Main function to initialize MongoDB connection
 * @param {string} customEnvPath - Optional path to custom .env file
 * @param {Array<string>} collections - Optional list of collections to create
 * @returns {Promise<object>} Object with db and client properties
 */
export async function initMongoDB(customEnvPath = null, collections = null) {
  try {
    // Load environment variables
    const envPath = loadEnvironment(customEnvPath);
    logger.info(`Using environment from: ${envPath}`);

    // Connect to MongoDB
    const { db, client } = await connectToMongoDB();

    // Setup collections if specified
    if (collections) {
      await setupCollections(db, collections);
    }

    return { db, client };
  } catch (error) {
    logger.error(`Failed to initialize MongoDB: ${error.message}`);
    throw error;
  }
}

export default {
  initMongoDB,
  connectToMongoDB,
  createMongoClient,
  getConnectionUri,
  loadEnvironment,
  createLogger,
  setupCollections,
};
