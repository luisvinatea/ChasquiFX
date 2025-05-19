/**
 * MongoDB Atlas Connection Test
 *
 * This script tests the connection to MongoDB Atlas cluster.
 * Run with: node test-atlas-connection.js
 */

import "dotenv/config";
import { MongoClient, ServerApiVersion } from "mongodb";
import mongoose from "mongoose";
import { connectToDatabase } from "../src/db/mongodb.js";

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

/**
 * Test direct connection to MongoDB Atlas using the native MongoDB driver
 */
async function testDirectConnection() {
  console.log(
    `${colors.blue}Testing direct connection to MongoDB Atlas...${colors.reset}`
  );

  // Construct the connection string
  const username = encodeURIComponent(
    process.env.MONGODB_USER || "paulobarberena"
  );
  const password = encodeURIComponent(process.env.MONGODB_PASSWORD || "");
  const uri = `mongodb+srv://${username}:${password}@chasquifx.2akcifh.mongodb.net/?retryWrites=true&w=majority&appName=ChasquiFX`;

  // Create MongoDB client
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    // Connect the client to the server
    await client.connect();

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      `${colors.green}✓ Direct connection successful: MongoDB Atlas ping command responded correctly${colors.reset}`
    );

    // Get server info
    const serverInfo = await client.db("admin").command({ buildInfo: 1 });
    console.log(
      `${colors.blue}MongoDB Version: ${serverInfo.version}${colors.reset}`
    );
    console.log(
      `${colors.blue}MongoDB Engine: ${serverInfo.storageEngines[0]}${colors.reset}`
    );

    // List available databases
    const dbs = await client.db().admin().listDatabases();
    console.log(`${colors.blue}Available databases:${colors.reset}`);
    dbs.databases.forEach((db) => {
      console.log(`  - ${db.name} (${formatBytes(db.sizeOnDisk)})`);
    });

    return true;
  } catch (error) {
    console.error(
      `${colors.red}✗ Direct connection failed: ${error.message}${colors.reset}`
    );
    return false;
  } finally {
    // Close the connection
    await client.close();
    console.log(`${colors.blue}Direct connection closed${colors.reset}`);
  }
}

/**
 * Test connection using Mongoose through our application's connection module
 */
async function testMongooseConnection() {
  console.log(
    `\n${colors.blue}Testing Mongoose connection through application module...${colors.reset}`
  );

  try {
    // Connect using our application's connection module
    const connection = await connectToDatabase();
    console.log(
      `${colors.green}✓ Mongoose connection successful${colors.reset}`
    );

    // Get database name
    console.log(
      `${colors.blue}Connected to database: ${connection.name}${colors.reset}`
    );

    // List collections
    const collections = await connection.db.listCollections().toArray();
    console.log(`${colors.blue}Available collections:${colors.reset}`);
    if (collections.length === 0) {
      console.log("  No collections found (new database)");
    } else {
      collections.forEach((collection) => {
        console.log(`  - ${collection.name}`);
      });
    }

    return true;
  } catch (error) {
    console.error(
      `${colors.red}✗ Mongoose connection failed: ${error.message}${colors.reset}`
    );
    return false;
  } finally {
    // Close the connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log(`${colors.blue}Mongoose connection closed${colors.reset}`);
    }
  }
}

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Run both connection tests
 */
async function runTests() {
  console.log("==== MongoDB Atlas Connection Tests ====");

  // Test direct connection
  const directResult = await testDirectConnection();

  // Test mongoose connection
  const mongooseResult = await testMongooseConnection();

  console.log("\n==== Test Results ====");
  if (directResult && mongooseResult) {
    console.log(
      `${colors.green}All connection tests passed! Your MongoDB Atlas configuration is working correctly.${colors.reset}`
    );
    process.exit(0);
  } else if (!directResult && !mongooseResult) {
    console.log(
      `${colors.red}All connection tests failed. Please check your MongoDB Atlas credentials and network connection.${colors.reset}`
    );
    process.exit(1);
  } else {
    console.log(
      `${colors.yellow}Some tests passed, but not all. This indicates a partial configuration issue.${colors.reset}`
    );
    process.exit(1);
  }
}

// Run the tests
runTests().catch((error) => {
  console.error(
    `${colors.red}Unhandled error during tests: ${error.message}${colors.reset}`
  );
  process.exit(1);
});
