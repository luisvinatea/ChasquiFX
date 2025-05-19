/**
 * MongoDB Connection Test
 *
 * This script tests the MongoDB connection and basic operations.
 * Run with: node test-mongodb.js
 */

const mongoose = require("mongoose");
const { connectToDatabase } = require("../src/db/mongodb");
const { ForexCache, FlightCache } = require("../src/db/schemas");

// Test MongoDB connection and operations
async function testMongoDBConnection() {
  console.log("Testing MongoDB connection...");

  try {
    // Connect to MongoDB
    const connection = await connectToDatabase();
    console.log("✅ MongoDB connection successful");

    // Test the database name
    console.log(`Connected to database: ${connection.name}`);

    // Print available collections
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log("\nAvailable collections:");
    collections.forEach((collection) => {
      console.log(`- ${collection.name}`);
    });

    console.log("\nConnection details:", {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
    });

    // Close connection
    await mongoose.connection.close();
    console.log("Connection closed successfully");

    return true;
  } catch (error) {
    console.error("❌ MongoDB connection test failed:", error.message);
    return false;
  }
}

// Test basic CRUD operations
async function testCRUDOperations() {
  console.log("\nTesting basic CRUD operations...");

  try {
    // Connect to MongoDB
    await connectToDatabase();

    // Create a test document
    const testKey = `test_${Date.now()}`;
    const testDoc = new ForexCache({
      cacheKey: testKey,
      searchParameters: {
        q: "USD-EUR",
      },
      searchMetadata: {
        created_at: new Date(),
      },
      data: { test: true, value: "test data" },
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    });

    // Save the document
    const savedDoc = await testDoc.save();
    console.log("✅ Document created:", testKey);

    // Read the document
    const foundDoc = await ForexCache.findOne({ cacheKey: testKey });
    if (foundDoc) {
      console.log("✅ Document retrieved successfully");
      console.log("Document content:", {
        cacheKey: foundDoc.cacheKey,
        q: foundDoc.searchParameters.q,
        expiresAt: foundDoc.expiresAt,
      });
    } else {
      throw new Error("Document not found after creation");
    }

    // Update the document
    await ForexCache.updateOne(
      { cacheKey: testKey },
      { $set: { "data.updated": true } }
    );
    console.log("✅ Document updated");

    // Verify update
    const updatedDoc = await ForexCache.findOne({ cacheKey: testKey });
    if (updatedDoc.data.updated === true) {
      console.log("✅ Update verified");
    } else {
      throw new Error("Document update failed");
    }

    // Delete the document
    await ForexCache.deleteOne({ cacheKey: testKey });
    console.log("✅ Document deleted");

    // Verify deletion
    const deletedDoc = await ForexCache.findOne({ cacheKey: testKey });
    if (!deletedDoc) {
      console.log("✅ Deletion verified");
    } else {
      throw new Error("Document deletion failed");
    }

    // Close connection
    await mongoose.connection.close();

    return true;
  } catch (error) {
    console.error("❌ CRUD operations test failed:", error.message);
    try {
      await mongoose.connection.close();
    } catch (e) {
      // Ignore error on close
    }
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log("==== MongoDB Connection Tests ====");

  const connectionSuccess = await testMongoDBConnection();

  if (connectionSuccess) {
    const crudSuccess = await testCRUDOperations();

    if (connectionSuccess && crudSuccess) {
      console.log("\n✅ All MongoDB tests passed!");
      process.exit(0);
    } else {
      console.error("\n❌ Some MongoDB tests failed");
      process.exit(1);
    }
  } else {
    console.error("\n❌ MongoDB connection failed, skipping CRUD tests");
    process.exit(1);
  }
}

// Execute tests
runTests();
