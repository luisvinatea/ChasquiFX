/**
 * MongoDB connection module for ChasquiFX
 * Manages database connection and provides MongoDB client
 */

import mongoose from "mongoose";
import { ServerApiVersion } from "mongodb";
import { initLogger } from "../utils/logger.js";
import dotenv from "dotenv";

// Initialize environment variables
dotenv.config();

// Initialize logger
const logger = initLogger();

// MongoDB Atlas connection URI with credentials from environment variables
const username = encodeURIComponent(process.env.MONGODB_USER);
const password = encodeURIComponent(process.env.MONGODB_PASSWORD);

// Check for missing credentials
if (!process.env.MONGODB_USER || !process.env.MONGODB_PASSWORD) {
  logger.error("MongoDB credentials missing in environment variables");
}

// Log credential info without exposing actual credentials
logger.debug(`Username: ${username}`);
logger.debug(
  `Password length: ${password.length > 0 ? "provided" : "missing"}`
);

// Construct the MongoDB URI directly
let MONGODB_URI;

// Get MongoDB host and DB name from environment variables, or use defaults
const host = process.env.MONGODB_HOST || "chasquifx.ymxb5bs.mongodb.net";
const dbName = process.env.MONGODB_DBNAME || "chasquifx";

// Check if MONGODB_URI is provided directly in env variables
if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes("@")) {
  // Use MONGODB_URI from environment but replace variables
  MONGODB_URI = process.env.MONGODB_URI.replace(
    "${MONGODB_USER}",
    username
  ).replace("${MONGODB_PASSWORD}", password);

  logger.debug("Using MONGODB_URI from environment variables");
} else {
  // Construct URI from components
  MONGODB_URI = `mongodb+srv://${username}:${password}@${host}/${dbName}?retryWrites=true&w=majority&appName=ChasquiFX`;

  logger.debug("Using constructed MongoDB connection URI");
}

// Log connection info (without password)
const logUri = MONGODB_URI.replace(password, "****");
logger.debug(`MongoDB connection URI: ${logUri}`);

/**
 * Connect to MongoDB database
 * @returns {Promise<mongoose.Connection>} - MongoDB connection
 */
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    // Ping the database to confirm connection
    await mongoose.connection.db.admin().command({ ping: 1 });
    logger.info("Connected to MongoDB Atlas successfully");

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });

    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed due to app termination");
      process.exit(0);
    });

    return mongoose.connection;
  } catch (error) {
    logger.error(`Failed to connect to MongoDB Atlas: ${error.message}`);
    throw error;
  }
}

// Export mongoose and connectToDatabase function
export { mongoose, connectToDatabase };
