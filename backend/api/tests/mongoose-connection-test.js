/**
 * Mongoose Connection Test
 * Focused on testing just the mongoose connection
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Connection information from environment variables
const username = encodeURIComponent(process.env.MONGODB_USER);
const password = encodeURIComponent(process.env.MONGODB_PASSWORD);
const host = process.env.MONGODB_HOST || "chasquifx.ymxb5bs.mongodb.net";
const dbName = process.env.MONGODB_DBNAME || "chasquifx";

// Exit if credentials are missing
if (!process.env.MONGODB_USER || !process.env.MONGODB_PASSWORD) {
  console.error("ERROR: MongoDB credentials missing in environment variables");
  console.error("Please set MONGODB_USER and MONGODB_PASSWORD in .env file");
  process.exit(1);
}
const uri = `mongodb+srv://${username}:${password}@${host}/${dbName}?retryWrites=true&w=majority&appName=ChasquiFX`;

console.log("Testing Mongoose connection...");
console.log("Connection URI:", uri.replace(password, "****"));
console.log("MongoDB Host:", host);
console.log("Database Name:", dbName);
console.log("Username:", username);

async function testMongooseConnection() {
  try {
    console.log("\nAttempting to connect with Mongoose...");

    // Connect with Mongoose
    await mongoose.connect(uri, {
      serverApi: {
        version: "1",
        strict: true,
        deprecationErrors: true,
      },
    });

    console.log("✅ Mongoose connection successful!");
    console.log("Connection state:", mongoose.connection.readyState);
    console.log("Database name:", mongoose.connection.name);

    // List collections
    console.log("\nListing collections:");
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    if (collections.length === 0) {
      console.log("No collections found (empty database)");
    } else {
      collections.forEach((collection) => {
        console.log(`- ${collection.name}`);
      });
    }

    return true;
  } catch (error) {
    console.error("❌ Mongoose connection failed:", error.message);
    console.error(error);
    return false;
  } finally {
    // Close the connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("Connection closed");
    }
  }
}

// Run the test
testMongooseConnection()
  .then((success) => {
    if (success) {
      console.log("\nMongoDB connection test completed successfully");
      process.exit(0);
    } else {
      console.log("\nMongoDB connection test failed");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
