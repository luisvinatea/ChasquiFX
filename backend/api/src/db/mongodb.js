/**
 * MongoDB connection module for ChasquiFX
 * Manages database connection and provides MongoDB client
 */

const mongoose = require("mongoose");
const { ServerApiVersion } = require("mongodb");
const logger = require("../utils/logger");
require("dotenv").config();

// MongoDB Atlas connection URI with credentials from environment variables
const username = encodeURIComponent(
  process.env.MONGODB_USER || "paulobarberena"
);
const password = encodeURIComponent(process.env.MONGODB_PASSWORD || "");
const MONGODB_URI =
  process.env.MONGODB_URI ||
  `mongodb+srv://${username}:${password}@chasquifx.2akcifh.mongodb.net/chasquifx?retryWrites=true&w=majority&appName=ChasquiFX`;

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
module.exports = {
  mongoose,
  connectToDatabase,
};
