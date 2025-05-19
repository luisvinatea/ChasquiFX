import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv with absolute path
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });
console.log("ENV Path:", envPath);

// Get credentials from env
const username = process.env.MONGODB_USER;
const password = process.env.MONGODB_PASSWORD;
console.log("Username:", username);
console.log("Password length:", password ? password.length : 0);

// Build the URI
const uri = `mongodb+srv://${username}:${password}@chasquifx.2akcifh.mongodb.net/chasquifx?retryWrites=true&w=majority&appName=ChasquiFX`;
console.log("Connection URI:", uri);

// Create a new MongoClient
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 10000, // 10 seconds
});

async function run() {
  try {
    // Connect the client to the server
    console.log("Attempting to connect to MongoDB Atlas...");
    await client.connect();

    // Verify connection
    await client.db("admin").command({ ping: 1 });
    console.log("Connected successfully to MongoDB Atlas");

    // List all databases
    const dbList = await client.db().admin().listDatabases();
    console.log("Databases:");
    dbList.databases.forEach((db) => console.log(` - ${db.name}`));
  } catch (error) {
    console.error("Could not connect to MongoDB Atlas:", error);
  } finally {
    // Close the connection
    await client.close();
  }
}

run().catch(console.dir);
