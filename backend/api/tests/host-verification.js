/**
 * MongoDB Atlas URL Verification
 * Tests if the MongoDB Atlas host is correct
 */

import { MongoClient } from "mongodb";
import dns from "dns";
import { promisify } from "util";
import dotenv from "dotenv";

dotenv.config();

const resolveSrv = promisify(dns.resolveSrv);

// Test the MongoDB Atlas host
async function testMongoDbHost() {
  console.log("Testing MongoDB Atlas host...");

  const host = process.env.MONGODB_HOST || "chasquifx.ymxb5bs.mongodb.net";

  try {
    console.log(`Resolving SRV records for _mongodb._tcp.${host}`);
    const records = await resolveSrv(`_mongodb._tcp.${host}`);

    console.log("SRV Records found:");
    records.forEach((record) => {
      console.log(
        `  - Priority: ${record.priority}, Weight: ${record.weight}, Port: ${record.port}, Name: ${record.name}`
      );
    });

    console.log("\n✅ The MongoDB Atlas hostname appears to be valid.");
    return true;
  } catch (err) {
    console.error(`❌ Failed to resolve SRV records: ${err.message}`);
    console.log(
      "\nThis may indicate that the MongoDB Atlas hostname is incorrect."
    );
    return false;
  }
}

// Verify if the MongoDB user exists by trying a simple auth
async function verifyUserExists() {
  const username = process.env.MONGODB_USER;
  const password = process.env.MONGODB_PASSWORD;
  const host = process.env.MONGODB_HOST || "chasquifx.ymxb5bs.mongodb.net";

  // Exit if credentials are missing
  if (!username || !password) {
    console.error(
      "ERROR: MongoDB credentials missing in environment variables"
    );
    console.error("Please set MONGODB_USER and MONGODB_PASSWORD in .env file");
    process.exit(1);
  }

  console.log(
    `\nAttempting to authenticate user "${username}" (this may take a moment)...`
  );

  const uri = `mongodb+srv://${encodeURIComponent(
    username
  )}:${encodeURIComponent(password)}@${host}/?authSource=admin`;
  const client = new MongoClient(uri, {
    serverApi: { version: "1" },
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    console.log("✅ Authentication successful!");
    await client.close();
    return true;
  } catch (err) {
    if (err.message.includes("auth")) {
      console.log(`❌ Authentication failed: ${err.message}`);
      console.log("\nThis indicates one of the following issues:");
      console.log("1. The username may be incorrect");
      console.log("2. The password may be incorrect");
      console.log("3. The user may not have access to this database");
    } else {
      console.log(`❌ Connection failed: ${err.message}`);
    }
    return false;
  }
}

// Run the tests
async function runTests() {
  const hostValid = await testMongoDbHost();

  if (hostValid) {
    await verifyUserExists();

    console.log("\n=== Suggestions ===");
    console.log("1. Double-check your MongoDB Atlas username/password");
    console.log(
      "2. Ensure your IP address is whitelisted in the Atlas Network Access settings"
    );
    console.log("3. Try resetting the database user password in the Atlas UI");
    console.log(
      "4. Check if your MongoDB Atlas cluster is running (not paused)"
    );
  }
}

runTests().catch((err) => {
  console.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
