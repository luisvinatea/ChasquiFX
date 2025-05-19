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
const password = encodeURIComponent(
  process.env.MONGODB_PASSWORD || "oK3jLPBHTKFMoHB3e"
);

// Log credential info without exposing actual credentials
logger.debug(`Username: ${username}`);
logger.debug(
  `Password length: ${password.length > 0 ? "provided" : "missing"}`
);

// Construct the MongoDB URI directly
let MONGODB_URI;

// Check if environment variables are loaded correctly
if (!username || !password) {
  logger.error("MongoDB credentials missing. Check environment variables.");
}

// Construct URI from components, ignoring MONGODB_URI from env since it contains unresolved placeholders
MONGODB_URI = `mongodb+srv://${username}:${password}@chasquifx.2akcifh.mongodb.net/chasquifx?retryWrites=true&w=majority&appName=ChasquiFX`;

logger.debug("Using constructed MongoDB connection URI");

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
