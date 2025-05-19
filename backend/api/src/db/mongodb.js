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
const username = encodeURIComponent(
  process.env.MONGODB_USER || "paulobarberena"
);
const password = encodeURIComponent(process.env.MONGODB_PASSWORD || "");

// Check if direct MONGODB_URI is provided in env, otherwise construct from parts
let MONGODB_URI;
if (process.env.MONGODB_URI) {
  // Use URI directly if provided (may contain variable placeholders)
  MONGODB_URI = process.env.MONGODB_URI.replace(
    "${MONGODB_USER}",
    username
  ).replace("${MONGODB_PASSWORD}", password);

  logger.debug("Using MongoDB connection URI from environment variable");
} else {
  // Construct URI from components
  MONGODB_URI = `mongodb+srv://${username}:${password}@chasquifx.2akcifh.mongodb.net/chasquifx?retryWrites=true&w=majority&appName=ChasquiFX`;

  logger.debug("Using default MongoDB connection URI");
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
      useNewUrlParser: true,
      useUnifiedTopology: true,
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
