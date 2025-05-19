// Import required modules
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient } from "mongodb";
import { fileURLToPath } from "url";

// Configure dotenv
dotenv.config({ path: "../.env" });

// Get directory name (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection string
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Base directory for data files
const dataDir = path.join(__dirname, "../../assets/data");

// Function to connect to MongoDB
async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");
    return client.db("chasquifx");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

// Function to create collections if they don't exist
async function setupCollections(db) {
  try {
    // Get list of existing collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((col) => col.name);

    // Create collections if they don't exist
    const requiredCollections = ["forex", "flights", "geo"];

    for (const collection of requiredCollections) {
      if (!collectionNames.includes(collection)) {
        await db.createCollection(collection);
        console.log(`Created collection: ${collection}`);
      } else {
        console.log(`Collection ${collection} already exists`);
      }
    }
  } catch (error) {
    console.error("Error setting up collections:", error);
    throw error;
  }
}

// Function to read JSON files from directory
async function readJsonFiles(directory) {
  try {
    const files = fs.readdirSync(directory);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    const fileContents = [];
    for (const file of jsonFiles) {
      const filePath = path.join(directory, file);
      let content = fs.readFileSync(filePath, "utf8");

      // Remove comments if present (JSON doesn't support comments)
      content = content.replace(/\/\/.*$/gm, "");

      try {
        const jsonContent = JSON.parse(content);
        // Add filename as source
        jsonContent._source = file;
        fileContents.push(jsonContent);
      } catch (error) {
        console.error(`Error parsing JSON file ${file}:`, error);
      }
    }

    return fileContents;
  } catch (error) {
    console.error(`Error reading directory ${directory}:`, error);
    return [];
  }
}

// Function to import data into collections
async function importData(db) {
  try {
    // Import forex data
    const forexDir = path.join(dataDir, "forex");
    const forexData = await readJsonFiles(forexDir);
    if (forexData.length > 0) {
      const forexCollection = db.collection("forex");
      const forexResult = await forexCollection.insertMany(forexData);
      console.log(`${forexResult.insertedCount} forex documents imported`);
    } else {
      console.log("No forex data to import");
    }

    // Import flights data
    const flightsDir = path.join(dataDir, "flights");
    const flightsData = await readJsonFiles(flightsDir);
    if (flightsData.length > 0) {
      const flightsCollection = db.collection("flights");
      const flightsResult = await flightsCollection.insertMany(flightsData);
      console.log(`${flightsResult.insertedCount} flights documents imported`);
    } else {
      console.log("No flights data to import");
    }

    // Import geo data
    const geoDir = path.join(dataDir, "geo");
    const geoData = await readJsonFiles(geoDir);
    if (geoData.length > 0) {
      const geoCollection = db.collection("geo");
      const geoResult = await geoCollection.insertMany(geoData);
      console.log(`${geoResult.insertedCount} geo documents imported`);
    } else {
      console.log("No geo data to import");
    }
  } catch (error) {
    console.error("Error importing data:", error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    const db = await connectToMongoDB();
    await setupCollections(db);
    await importData(db);
    console.log("Data import completed successfully");
  } catch (error) {
    console.error("Error in main process:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("MongoDB connection closed");
    }
  }
}

// Run the script
main();
