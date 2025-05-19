/**
 * MongoDB Alternative Connection Test
 * Tries a different approach to connecting to MongoDB Atlas
 */

import { MongoClient } from "mongodb";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Try different connection string formats
async function testAlternativeConnection() {
  console.log("Testing alternative MongoDB connection approaches...");

  // Get the credentials from environment variables
  const username = process.env.MONGODB_USER;
  const password = process.env.MONGODB_PASSWORD;
  const host = process.env.MONGODB_HOST || "chasquifx.ymxb5bs.mongodb.net";
  const dbName = process.env.MONGODB_DBNAME || "chasquifx";

  // Exit if credentials are missing
  if (!username || !password) {
    console.error(
      "ERROR: MongoDB credentials missing in environment variables"
    );
    console.error("Please set MONGODB_USER and MONGODB_PASSWORD in .env file");
    process.exit(1);
  }

  // Different connection string formats to try
  const connectionStrings = [
    // Format 1: Standard connection string with auth source
    `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(
      password
    )}@chasquifx.ymxb5bs.mongodb.net/chasquifx?retryWrites=true&w=majority&authSource=admin`,

    // Format 2: Connection string with authentication mechanism
    `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(
      password
    )}@chasquifx.ymxb5bs.mongodb.net/chasquifx?authMechanism=SCRAM-SHA-1`,

    // Format 3: Connection string with SSL and authentication mechanism
    `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(
      password
    )}@chasquifx.ymxb5bs.mongodb.net/chasquifx?ssl=true&authMechanism=SCRAM-SHA-256`,

    // Format 4: Basic connection string
    `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(
      password
    )}@chasquifx.ymxb5bs.mongodb.net/`,

    // Format 5: Try standard MongoDB format (not SRV)
    `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(
      password
    )}@chasquifx.ymxb5bs.mongodb.net/?retryWrites=true&w=majority`,
  ];

  // Test MongoDB Cluster information
  // Try to display all possible info about the cluster
  console.log("\n=== MongoDB Cluster Info ===");
  console.log(`Username: ${username}`);
  console.log(`Host: chasquifx.2akcifh.mongodb.net`);

  // Try each connection string
  for (let i = 0; i < connectionStrings.length; i++) {
    const uri = connectionStrings[i];
    console.log(`\nTrying connection format ${i + 1}:`);
    console.log(`URI: ${uri.replace(encodeURIComponent(password), "****")}`);

    const client = new MongoClient(uri, {
      serverApi: { version: "1" },
      connectTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 5000,
    });

    try {
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      console.log(`✅ SUCCESS! Connected with format ${i + 1}`);

      // Get server info
      const serverInfo = await client.db("admin").command({ buildInfo: 1 });
      console.log(`MongoDB Version: ${serverInfo.version}`);

      await client.close();
      return uri; // Return the working connection string
    } catch (err) {
      console.log(`❌ Failed with format ${i + 1}: ${err.message}`);
      try {
        await client.close();
      } catch (e) {
        // Ignore close errors
      }
    }
  }

  return null; // No connection strings worked
}

testAlternativeConnection()
  .then((workingUri) => {
    if (workingUri) {
      console.log(`\n=== WORKING CONNECTION STRING ===`);
      const password = process.env.MONGODB_PASSWORD || "";
      console.log(workingUri.replace(encodeURIComponent(password), "****"));

      // Suggest updating the .env file and mongodb.js
      console.log(
        "\nRecommendation: Update your .env file with this connection string."
      );
    } else {
      console.log("\n❌ No connection formats worked.");
      console.log("Possible issues:");
      console.log("1. MongoDB Atlas credentials are incorrect");
      console.log(
        "2. IP address restrictions are in place (check Atlas Network Access)"
      );
      console.log("3. Atlas cluster name/hostname might be incorrect");
      console.log("4. Atlas cluster might be paused or unavailable");
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
