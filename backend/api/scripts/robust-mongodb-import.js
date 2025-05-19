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

// Use the correct host
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

// Function to manually read a JSON file with direct object creation
async function readJsonFile(filePath) {
  try {
    const rawContent = fs.readFileSync(filePath, "utf8");

    // Remove file path comments
    const content = rawContent.replace(/\/\/.*?$/gm, "");

    // Let's create a proper safe JSON string:
    let cleanedContent = content
      // Remove any trailing commas
      .replace(/,(\s*[\]}])/g, "$1")
      // Remove BOM and other UTF8 markers if present
      .replace(/^\uFEFF/, "");

    // Use native JSON.parse for safety
    try {
      return JSON.parse(cleanedContent);
    } catch (jsonError) {
      console.error(
        `Error parsing ${path.basename(filePath)}: ${jsonError.message}`
      );

      // Fallback approach using a more direct method if needed
      // WARNING: This is less secure but may work with malformed JSON
      try {
        const result = new Function(`return ${cleanedContent}`)();
        console.log(`Used alternative parsing for ${path.basename(filePath)}`);
        return result;
      } catch (funcError) {
        console.error(
          `All parsing methods failed for ${path.basename(filePath)}`
        );
        throw jsonError; // Throw the original error
      }
    }
  } catch (error) {
    console.error(
      `Error processing file ${path.basename(filePath)}:`,
      error.message
    );
    return null;
  }
}

// Function to import forex data
async function importForexData(db) {
  const forexCollection = db.collection("forex");
  const forexDir = path.join(dataDir, "forex");
  console.log(`Processing forex data from ${forexDir}`);

  const files = fs
    .readdirSync(forexDir)
    .filter((file) => file.endsWith(".json"));
  console.log(`Found ${files.length} forex files`);

  let importCount = 0;

  for (const file of files) {
    const filePath = path.join(forexDir, file);
    try {
      const data = await readJsonFile(filePath);
      if (data) {
        data._source = file;
        await forexCollection.insertOne(data);
        importCount++;
        console.log(`Imported ${file}`);
      }
    } catch (error) {
      console.error(`Failed to import ${file}:`, error.message);
    }
  }

  console.log(`Successfully imported ${importCount} forex documents`);
}

// Function to import flights data
async function importFlightsData(db) {
  const flightsCollection = db.collection("flights");
  const flightsDir = path.join(dataDir, "flights");
  console.log(`Processing flights data from ${flightsDir}`);

  const files = fs
    .readdirSync(flightsDir)
    .filter((file) => file.endsWith(".json"));
  console.log(`Found ${files.length} flights files`);

  let importCount = 0;

  for (const file of files) {
    const filePath = path.join(flightsDir, file);
    try {
      const data = await readJsonFile(filePath);
      if (data) {
        data._source = file;
        await flightsCollection.insertOne(data);
        importCount++;
        console.log(`Imported ${file}`);
      }
    } catch (error) {
      console.error(`Failed to import ${file}:`, error.message);
    }
  }

  console.log(`Successfully imported ${importCount} flights documents`);
}

// Function to import geo data
async function importGeoData(db) {
  const geoCollection = db.collection("geo");
  const geoDir = path.join(dataDir, "geo");
  console.log(`Processing geo data from ${geoDir}`);

  const files = fs.readdirSync(geoDir).filter((file) => file.endsWith(".json"));
  console.log(`Found ${files.length} geo files`);

  let importCount = 0;

  for (const file of files) {
    const filePath = path.join(geoDir, file);
    try {
      const data = await readJsonFile(filePath);
      if (data) {
        // Handle arrays in geo data (airports.json has an array of airports)
        if (Array.isArray(data)) {
          console.log(`File ${file} contains array with ${data.length} items`);
          // Add source to each item and insert individually
          const sourcedData = data.map((item) => ({ ...item, _source: file }));

          if (sourcedData.length > 0) {
            // Use bulk operations for better performance with large arrays
            const bulkOps = sourcedData.map((item) => ({
              insertOne: { document: item },
            }));

            const result = await geoCollection.bulkWrite(bulkOps);
            importCount += result.insertedCount;
            console.log(`Imported ${result.insertedCount} items from ${file}`);
          }
        } else {
          // Single document
          data._source = file;
          await geoCollection.insertOne(data);
          importCount++;
          console.log(`Imported ${file}`);
        }
      }
    } catch (error) {
      console.error(`Failed to import ${file}:`, error.message);
    }
  }

  console.log(`Successfully imported ${importCount} geo documents`);
}

// Main function
async function main() {
  try {
    const db = await connectToMongoDB();
    await setupCollections(db);

    console.log("Starting data import process...");

    // Import data collection by collection
    await importGeoData(db);
    await importForexData(db);
    await importFlightsData(db);

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
