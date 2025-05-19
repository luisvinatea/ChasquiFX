// Import required modules
import dotenv from "dotenv";
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

async function verifyCollections() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");
    const db = client.db("chasquifx");

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log("\nDatabase Collections:");
    collections.forEach((coll) => {
      console.log(` - ${coll.name}`);
    });

    // Count documents in each collection
    console.log("\nDocument counts:");

    // Forex collection
    const forexCount = await db.collection("forex").countDocuments();
    console.log(` - forex: ${forexCount} documents`);

    // Sample forex document
    const forexSample = await db.collection("forex").findOne();
    console.log("\nSample forex document:");
    console.log(JSON.stringify(forexSample, null, 2));

    // Flights collection
    const flightsCount = await db.collection("flights").countDocuments();
    console.log(`\n - flights: ${flightsCount} documents`);

    // Sample flights document
    const flightsSample = await db.collection("flights").findOne();
    console.log("\nSample flights document:");
    console.log(JSON.stringify(flightsSample, null, 2));

    // Geo collection
    const geoCount = await db.collection("geo").countDocuments();
    console.log(`\n - geo: ${geoCount} documents`);

    // Sample geo document
    const geoSample = await db.collection("geo").findOne();
    console.log("\nSample geo document:");
    console.log(JSON.stringify(geoSample, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
    console.log("\nMongoDB connection closed");
  }
}

// Run verification
verifyCollections();
