/**
 * Simple MongoDB connection for migration scripts
 * Uses CommonJS syntax for compatibility with scripts
 */

const mongoose = require("mongoose");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

// Connection variables
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/chasquifx";
const DB_NAME = process.env.MONGODB_DBNAME || "chasquifx";

// Logger for MongoDB operations
const logger = {
  info: (msg) => console.log(`[DB_INFO] ${msg}`),
  error: (msg) => console.error(`[DB_ERROR] ${msg}`),
  warn: (msg) => console.warn(`[DB_WARN] ${msg}`),
  debug: (msg) => console.debug(`[DB_DEBUG] ${msg}`),
};

/**
 * Connect to MongoDB database
 * @returns {Promise<mongoose.Connection>}
 */
async function connectToDatabase() {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      logger.info("MongoDB already connected");
      return mongoose.connection;
    }

    logger.info("Connecting to MongoDB...");

    // Set mongoose options
    const mongooseOptions = {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    };

    // Create the connection
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    logger.info(`MongoDB connected to ${DB_NAME}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });

    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed via app termination");
      process.exit(0);
    });

    return mongoose.connection;
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
}

module.exports = {
  mongoose,
  connectToDatabase,
  MongoClient,
  ServerApiVersion,
};
