/**
 * MongoDB Atlas Comprehensive Connection Test
 * Tests both direct MongoDB client and Mongoose connections
 * with detailed error reporting
 */

import { MongoClient, ServerApiVersion } from "mongodb";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectToDatabase } from "../src/db/mongodb.js";

// Load environment variables
dotenv.config();

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

// Connection information from environment variables
const username = process.env.MONGODB_USER;
const password = process.env.MONGODB_PASSWORD;
const host = process.env.MONGODB_HOST || "chasquifx.ymxb5bs.mongodb.net";
const dbName = process.env.MONGODB_DBNAME || "chasquifx";

// Exit if credentials are missing
if (!username || !password) {
  console.error(
    `${colors.red}ERROR: MongoDB credentials missing in environment variables${colors.reset}`
  );
  console.error(
    `${colors.red}Please set MONGODB_USER and MONGODB_PASSWORD in .env file${colors.reset}`
  );
  process.exit(1);
}

const uri = `mongodb+srv://${username}:${password}@${host}/${dbName}?retryWrites=true&w=majority&appName=ChasquiFX`;

// Helper function to format numbers
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Test direct MongoDB client connection
 */
async function testDirectConnection() {
  console.log(
    `\n${colors.blue}=== Testing Direct MongoDB Client Connection ===${colors.reset}`
  );
  console.log(`${colors.yellow}Connection Details:${colors.reset}`);
  console.log(`- Host: ${host}`);
  console.log(`- Database: ${dbName}`);
  console.log(`- Username: ${username}`);
  console.log(`- URI: mongodb+srv://${username}:****@${host}/${dbName}?...`);

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    console.log(
      `\n${colors.blue}Connecting to MongoDB Atlas...${colors.reset}`
    );
    await client.connect();

    console.log(`${colors.blue}Running ping command...${colors.reset}`);
    await client.db("admin").command({ ping: 1 });
    console.log(`${colors.green}✓ PING successful!${colors.reset}`);

    console.log(
      `\n${colors.blue}Retrieving server information...${colors.reset}`
    );
    const serverInfo = await client.db("admin").command({ buildInfo: 1 });
    console.log(`- MongoDB Version: ${serverInfo.version}`);
    console.log(`- Storage Engine: ${serverInfo.storageEngines[0]}`);

    console.log(`\n${colors.blue}Listing available databases:${colors.reset}`);
    const dbs = await client.db().admin().listDatabases();
    if (!dbs.databases || dbs.databases.length === 0) {
      console.log(`- No databases found`);
    } else {
      dbs.databases.forEach((db) => {
        console.log(`- ${db.name} (${formatBytes(db.sizeOnDisk)})`);
      });
    }

    console.log(
      `\n${colors.green}✓ Direct MongoDB connection test PASSED${colors.reset}`
    );
    return true;
  } catch (error) {
    console.log(
      `\n${colors.red}✗ Direct MongoDB connection test FAILED${colors.reset}`
    );
    console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
    console.log(`Stack: ${error.stack}`);
    return false;
  } finally {
    await client.close();
    console.log(`${colors.blue}Connection closed${colors.reset}`);
  }
}

/**
 * Test Mongoose connection through our application's module
 */
async function testMongooseConnection() {
  console.log(
    `\n${colors.blue}=== Testing Mongoose Connection ===${colors.reset}`
  );
  console.log(
    `${colors.yellow}Using application's connectToDatabase() function${colors.reset}`
  );

  try {
    console.log(`${colors.blue}Connecting through Mongoose...${colors.reset}`);
    const connection = await connectToDatabase();

    console.log(
      `${colors.green}✓ Mongoose connection established!${colors.reset}`
    );
    console.log(
      `- Connection State: ${mongoose.connection.readyState} (Connected)`
    );
    console.log(`- Database Name: ${connection.name}`);
    console.log(`- Host: ${connection.host}`);
    console.log(`- Port: ${connection.port}`);

    console.log(
      `\n${colors.blue}Listing available collections:${colors.reset}`
    );
    const collections = await connection.db.listCollections().toArray();
    if (collections.length === 0) {
      console.log(`- No collections found (database may be empty)`);
    } else {
      collections.forEach((collection) => {
        console.log(`- ${collection.name} (${collection.type})`);
      });
    }

    console.log(
      `\n${colors.green}✓ Mongoose connection test PASSED${colors.reset}`
    );
    return true;
  } catch (error) {
    console.log(
      `\n${colors.red}✗ Mongoose connection test FAILED${colors.reset}`
    );
    console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
    console.log(`Stack: ${error.stack}`);
    return false;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log(`${colors.blue}Mongoose connection closed${colors.reset}`);
    }
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log(
    `${colors.blue}======== MongoDB Atlas Connection Tests ========${colors.reset}`
  );
  console.log(
    `${colors.yellow}Date/Time: ${new Date().toISOString()}${colors.reset}`
  );
  console.log(
    `${colors.yellow}Node.js Version: ${process.version}${colors.reset}`
  );

  let directResult = false;
  let mongooseResult = false;

  try {
    // Test direct MongoDB connection
    directResult = await testDirectConnection();

    // Test Mongoose connection
    mongooseResult = await testMongooseConnection();
  } catch (error) {
    console.error(
      `${colors.red}Unhandled error during tests: ${error.message}${colors.reset}`
    );
  }

  // Summary
  console.log(`\n${colors.blue}======== Test Results ========${colors.reset}`);
  console.log(
    `Direct MongoDB Connection: ${
      directResult
        ? colors.green + "PASSED" + colors.reset
        : colors.red + "FAILED" + colors.reset
    }`
  );
  console.log(
    `Mongoose Connection: ${
      mongooseResult
        ? colors.green + "PASSED" + colors.reset
        : colors.red + "FAILED" + colors.reset
    }`
  );

  if (directResult && mongooseResult) {
    console.log(
      `\n${colors.green}SUCCESS! All connection tests passed. MongoDB Atlas configuration is working correctly.${colors.reset}`
    );
    process.exit(0);
  } else if (!directResult && !mongooseResult) {
    console.log(
      `\n${colors.red}ERROR! All connection tests failed. Please check your MongoDB Atlas credentials and connection settings.${colors.reset}`
    );
    process.exit(1);
  } else {
    console.log(
      `\n${colors.yellow}WARNING! Some tests passed, but not all. This indicates a partial configuration issue.${colors.reset}`
    );
    process.exit(1);
  }
}

// Run the tests
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
