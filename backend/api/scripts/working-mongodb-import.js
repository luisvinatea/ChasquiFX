// Import required modules
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ServerApiVersion } from "mongodb";
import { fileURLToPath } from "url";

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv with absolute path
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });
console.log("ENV Path:", envPath);

// Get credentials from env
const username = encodeURIComponent(process.env.MONGODB_USER);
const password = encodeURIComponent(process.env.MONGODB_PASSWORD);

// Use the correct host based on the successful test - ymxb5bs.mongodb.net
const host = "chasquifx.ymxb5bs.mongodb.net";
const dbName = "chasquifx";

// Build the URI
const uri = `mongodb+srv://${username}:${password}@${host}/${dbName}?retryWrites=true&w=majority&appName=ChasquiFX`;
console.log("Connection URI:", uri.replace(password, "****"));

// Create a new MongoClient with MongoDB Atlas recommended options
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Base directory for data files
const dataDir = path.join(__dirname, "../../assets/data");

// Function to connect to MongoDB
async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

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

    console.log(`Found ${jsonFiles.length} JSON files in ${directory}`);

    const fileContents = [];
    for (const file of jsonFiles) {
      const filePath = path.join(directory, file);
      let content = fs.readFileSync(filePath, "utf8");

      // Clean up the JSON content
      // Remove comments
      content = content.replace(/\/\/.*$/gm, "");
      // Replace trailing commas
      content = content.replace(/,(\s*[\]}])/g, "$1");
      // Fix control characters
      content = content.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

      try {
        // Use a more tolerant JSON parsing method
        const jsonContent = eval("(" + content + ")");
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
    console.log(`Reading forex data from ${forexDir}`);
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
    console.log(`Reading flights data from ${flightsDir}`);
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
    console.log(`Reading geo data from ${geoDir}`);
    const geoData = await readJsonFiles(geoDir);
    if (geoData.length > 0) {
      const geoCollection = db.collection("geo");

      // Special handling for geo data - flatten arrays if needed
      for (const data of geoData) {
        // If the data is an array, insert each item individually
        if (Array.isArray(data)) {
          console.log(`Geo data is an array with ${data.length} items`);
          if (data.length > 0) {
            try {
              // Insert each airport as a separate document
              const insertPromises = data.map((item) => {
                // Add source information
                item._source = data._source;
                return geoCollection.insertOne(item);
              });

              const results = await Promise.all(insertPromises);
              console.log(`${results.length} geo documents imported`);
            } catch (err) {
              console.error("Error importing geo data items:", err);
            }
          }
        } else {
          // Handle as a single document
          try {
            await geoCollection.insertOne(data);
            console.log("1 geo document imported");
          } catch (err) {
            console.error("Error importing geo document:", err);
          }
        }
      }
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
