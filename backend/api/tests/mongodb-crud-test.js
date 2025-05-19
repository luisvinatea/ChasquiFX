/**
 * MongoDB Insert Test
 * Creates a collection and inserts a document to verify write operations
 */

import mongoose from "mongoose";
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
import { randomUUID } from "crypto";

// Load environment variables
dotenv.config();

// Connection information from environment variables
const username = encodeURIComponent(process.env.MONGODB_USER);
const password = encodeURIComponent(process.env.MONGODB_PASSWORD);
const host = process.env.MONGODB_HOST || "chasquifx.ymxb5bs.mongodb.net";
const dbName = process.env.MONGODB_DBNAME || "chasquifx";

// Check for missing credentials
if (!process.env.MONGODB_USER || !process.env.MONGODB_PASSWORD) {
  console.error("ERROR: MongoDB credentials missing in environment variables");
  console.error("Please set MONGODB_USER and MONGODB_PASSWORD in .env file");
  process.exit(1);
}
const uri = `mongodb+srv://${username}:${password}@${host}/${dbName}?retryWrites=true&w=majority&appName=ChasquiFX`;

// Test document to insert
const testId = randomUUID();
const testDocument = {
  _id: testId,
  name: "Test Document",
  createdAt: new Date(),
  description: "This document was created by the MongoDB insert test script",
  testValue: Math.floor(Math.random() * 1000),
  isActive: true,
};

// Define the test collection name
const COLLECTION_NAME = "test_collection";

/**
 * Test MongoDB direct client CRUD operations
 */
async function testDirectClientOperations() {
  console.log("=== Testing MongoDB Direct Client Operations ===");

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    console.log("Connected successfully");

    // Get the database and collection
    const db = client.db(dbName);
    const collection = db.collection(COLLECTION_NAME);

    // Insert the test document
    console.log(`Inserting test document with ID: ${testId}...`);
    const insertResult = await collection.insertOne(testDocument);
    console.log(`Document inserted with ID: ${insertResult.insertedId}`);

    // Read the document back
    console.log("Reading back the document...");
    const foundDocument = await collection.findOne({ _id: testId });
    console.log("Document found:");
    console.log(JSON.stringify(foundDocument, null, 2));

    // Update the document
    console.log("Updating the document...");
    const updateResult = await collection.updateOne(
      { _id: testId },
      { $set: { lastUpdated: new Date(), updatedValue: "Modified by test" } }
    );
    console.log(`Updated ${updateResult.modifiedCount} document(s)`);

    // Read the updated document
    console.log("Reading back the updated document...");
    const updatedDocument = await collection.findOne({ _id: testId });
    console.log("Updated document:");
    console.log(JSON.stringify(updatedDocument, null, 2));

    // Delete the document
    console.log("Deleting the test document...");
    const deleteResult = await collection.deleteOne({ _id: testId });
    console.log(`Deleted ${deleteResult.deletedCount} document(s)`);

    console.log(
      "✅ Direct client CRUD operations test completed successfully"
    );
    return true;
  } catch (error) {
    console.error(
      `❌ Error during direct client operations: ${error.message}`
    );
    console.error(error);
    return false;
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

/**
 * Test Mongoose CRUD operations
 */
async function testMongooseOperations() {
  console.log("\n=== Testing Mongoose Operations ===");

  try {
    console.log("Connecting with Mongoose...");
    await mongoose.connect(uri, {
      serverApi: {
        version: "1",
        strict: true,
        deprecationErrors: true,
      },
    });
    console.log("Connected successfully");

    // Define a simple schema and model
    const TestSchema = new mongoose.Schema({
      _id: String,
      name: String,
      createdAt: Date,
      description: String,
      testValue: Number,
      isActive: Boolean,
      lastUpdated: Date,
      updatedValue: String,
    });

    // Create model
    const TestModel = mongoose.model(
      "TestModel",
      TestSchema,
      "mongoose_test_collection"
    );

    // Create a test document
    const mongooseTestId = randomUUID();
    console.log(
      `Creating Mongoose test document with ID: ${mongooseTestId}...`
    );

    const newTestDoc = new TestModel({
      _id: mongooseTestId,
      name: "Mongoose Test Document",
      createdAt: new Date(),
      description: "This document was created by the Mongoose test",
      testValue: Math.floor(Math.random() * 1000),
      isActive: true,
    });

    // Save the document
    const savedDoc = await newTestDoc.save();
    console.log("Document saved:");
    console.log(JSON.stringify(savedDoc.toObject(), null, 2));

    // Read the document back
    console.log("Reading back the document...");
    const foundDoc = await TestModel.findById(mongooseTestId);
    console.log("Document found:");
    console.log(JSON.stringify(foundDoc.toObject(), null, 2));

    // Update the document
    console.log("Updating the document...");
    foundDoc.lastUpdated = new Date();
    foundDoc.updatedValue = "Modified by Mongoose test";
    await foundDoc.save();

    // Read the updated document
    console.log("Reading back the updated document...");
    const updatedDoc = await TestModel.findById(mongooseTestId);
    console.log("Updated document:");
    console.log(JSON.stringify(updatedDoc.toObject(), null, 2));

    // Delete the document
    console.log("Deleting the test document...");
    const deleteResult = await TestModel.deleteOne({ _id: mongooseTestId });
    console.log(`Deleted ${deleteResult.deletedCount} document(s)`);

    console.log("✅ Mongoose CRUD operations test completed successfully");
    return true;
  } catch (error) {
    console.error(`❌ Error during Mongoose operations: ${error.message}`);
    console.error(error);
    return false;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("Mongoose connection closed");
    }
  }
}

// Run both tests
async function runAllTests() {
  console.log("Starting MongoDB CRUD operations tests...\n");

  const directResult = await testDirectClientOperations();
  const mongooseResult = await testMongooseOperations();

  console.log("\n=== Test Results ===");
  console.log(
    `Direct Client Operations: ${directResult ? "✅ PASSED" : "❌ FAILED"}`
  );
  console.log(
    `Mongoose Operations: ${mongooseResult ? "✅ PASSED" : "❌ FAILED"}`
  );

  if (directResult && mongooseResult) {
    console.log("\n✅ All tests completed successfully!");
    process.exit(0);
  } else {
    console.log("\n❌ Some tests failed.");
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error(`Fatal error: ${error}`);
  process.exit(1);
});
