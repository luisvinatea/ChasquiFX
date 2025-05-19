/**
 * MongoDB Atlas Credentials Verification
 * This script attempts to connect to MongoDB Atlas using direct credentials
 */

import { MongoClient } from "mongodb";

// Import dotenv to load environment variables
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Try with credentials from environment variables
async function testWithDirectCredentials() {
  console.log("Testing with direct credentials...");

  // Get credentials from environment variables
  const envUser = process.env.MONGODB_USER;
  const envPass = process.env.MONGODB_PASSWORD;

  // Check if environment variables are set
  if (!envUser || !envPass) {
    console.error(
      "WARNING: MONGODB_USER or MONGODB_PASSWORD not set in environment variables"
    );
    console.error(
      "Will proceed with test credentials, but this should be fixed"
    );
  }

  // Define potential username/password combinations to test
  const credentials = [
    { user: envUser || "user", pass: envPass || "password" }, // Use env variables if available
    { user: envUser || "user", pass: "" }, // Try empty password as fallback
    { user: "admin", pass: "admin" }, // Try common admin credentials
  ];

  for (const cred of credentials) {
    const host = process.env.MONGODB_HOST || "chasquifx.ymxb5bs.mongodb.net";
    const uri = `mongodb+srv://${encodeURIComponent(
      cred.user
    )}:${encodeURIComponent(cred.pass)}@${host}/?retryWrites=true&w=majority`;

    console.log(
      `Trying username: ${cred.user} (password: ${
        cred.pass ? "***provided***" : "empty"
      })`
    );

    const client = new MongoClient(uri, {
      serverApi: { version: "1", strict: true },
    });

    try {
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      console.log(`✅ SUCCESS! Connected with ${cred.user}`);
      await client.close();
      return cred; // Return the working credentials
    } catch (err) {
      console.log(`❌ Failed with ${cred.user}: ${err.message}`);
      await client.close();
    }
  }

  return null; // No credentials worked
}

testWithDirectCredentials()
  .then((workingCreds) => {
    if (workingCreds) {
      console.log(`\n=== WORKING CREDENTIALS ===`);
      console.log(`Username: ${workingCreds.user}`);
      console.log(
        `Password: ${workingCreds.pass ? "***provided***" : "empty"}`
      );
    } else {
      console.log(
        "\n❌ No credentials worked. Please check your MongoDB Atlas setup."
      );
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
