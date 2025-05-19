// Import required modules
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, ServerApiVersion } from "mongodb";
import { fileURLToPath } from "url";

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv with path from ENV_PATH if available, otherwise use default
// The script is in backend/api/scripts/auth, so we need to go up 2 directories to get to backend/api
const envPath = process.env.ENV_PATH || path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });
console.log("ENV Path:", envPath);

// Get credentials from env
const username = process.env.MONGODB_USER;
const password = process.env.MONGODB_PASSWORD;

// Check if credentials are available
if (!username || !password) {
  console.error(
    "Error: MongoDB credentials are missing from environment variables."
  );
  console.error(`MONGODB_USER: ${username ? "Set" : "Missing"}`);
  console.error(`MONGODB_PASSWORD: ${password ? "Set" : "Missing"}`);
  console.error(
    `Make sure your .env file at ${envPath} contains these variables.`
  );
  process.exit(1);
}

// Encode credentials for URL
const encodedUsername = encodeURIComponent(username);
const encodedPassword = encodeURIComponent(password);

// Get host and database name from environment variables with defaults
const host = process.env.MONGODB_HOST || "chasquifx.ymxb5bs.mongodb.net";
const dbName = process.env.MONGODB_DBNAME || "chasquifx";

// Build the URI
console.log("MongoDB Host:", host);
console.log("Database Name:", dbName);
const uri = `mongodb+srv://${encodedUsername}:${encodedPassword}@${host}/${dbName}?retryWrites=true&w=majority&appName=ChasquiFX`;
console.log("Connection URI:", uri.replace(encodedPassword, "****"));

// Create a new MongoClient with MongoDB Atlas recommended options
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Base directory for data files - going up one more directory to reach backend/assets/data
const dataDir = path.join(__dirname, "../../../assets/data");

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

// Function to fix known JSON issues in a string
function fixJsonString(content) {
  let fixedContent = content;

  // Remove file path comments
  fixedContent = fixedContent.replace(/\/\/.*?$/gm, "");

  // Replace problematic control characters
  fixedContent = fixedContent.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");

  // Convert the specific datetime format that's causing issues (at position ~122)
  // Format: "created_at": "2025-05-12 18:59:00 UTC" -> "created_at": "2025-05-12T18:59:00Z"
  fixedContent = fixedContent.replace(
    /"(created_at|processed_at)":\s*"(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) UTC"/g,
    '"$1": "$2T$3Z"'
  );

  // Ensure any other date formats are also consistent
  fixedContent = fixedContent.replace(
    /"(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([A-Z]+)"/g,
    '"$1T$2 $3"'
  );

  // Remove trailing commas in objects and arrays
  fixedContent = fixedContent.replace(/,(\s*[\]}])/g, "$1");

  return fixedContent;
}

// Direct JSON fixing approach
async function fixAndLoadJson(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf8");

    // Apply fixes to the JSON string
    content = fixJsonString(content);

    // Try to manually load
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error(
        `Error parsing fixed JSON in ${path.basename(filePath)}: ${e.message}`
      );

      // If we can't parse it, try a more aggressive approach
      // Replace all control characters with spaces
      content = content.replace(/[\x00-\x1F]/g, " ");

      try {
        return JSON.parse(content);
      } catch (e2) {
        console.error(
          `Still can't parse ${path.basename(filePath)} after aggressive fixes`
        );
        return null;
      }
    }
  } catch (error) {
    console.error(`Error reading file ${path.basename(filePath)}:`, error);
    return null;
  }
}

// Special handling for Flight data
async function importFlightData(db, filePath, fileName) {
  try {
    // Read the raw content of the file
    const rawContent = fs.readFileSync(filePath, "utf8");

    // Apply the specific date fix that works for all flight files
    const fixedContent = rawContent.replace(
      /"(created_at|processed_at)":\s*"(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) UTC"/g,
      '"$1": "$2T$3Z"'
    );

    // Try to parse the fixed JSON
    let flightData;
    try {
      flightData = JSON.parse(fixedContent);
      console.log(`Successfully parsed flight data for ${fileName}`);

      // Extract route information from filename
      const routeParts = fileName.split(".")[0].split("_");
      const [departureAirport, arrivalAirport, outboundDate, returnDate] =
        routeParts;

      // Create a comprehensive flight document
      const enhancedFlightDoc = {
        _source: fileName,
        route: fileName.split(".")[0],
        date_imported: new Date().toISOString(),
        raw_data_available: true,

        // Search metadata
        search_metadata: flightData.search_metadata || {},

        // Search parameters
        search_parameters: flightData.search_parameters || {},

        // Route details
        route_info: {
          departure_airport: departureAirport,
          arrival_airport: arrivalAirport,
          outbound_date: outboundDate,
          return_date: returnDate,
        },

        // Best flights summary (for quick access to most important data)
        best_flights_summary: flightData.best_flights
          ? flightData.best_flights.map((flight) => ({
              price: flight.price,
              type: flight.type,
              total_duration: flight.total_duration,
              airline:
                flight.flights && flight.flights[0]
                  ? flight.flights[0].airline
                  : null,
              carbon_emissions: flight.carbon_emissions
                ? {
                    amount: flight.carbon_emissions.this_flight,
                    compared_to_typical:
                      flight.carbon_emissions.difference_percent,
                  }
                : null,
              layover_count: flight.layovers ? flight.layovers.length : 0,
              departure_time:
                flight.flights &&
                flight.flights[0] &&
                flight.flights[0].departure_airport
                  ? flight.flights[0].departure_airport.time
                  : null,
              arrival_time:
                flight.flights &&
                flight.flights[flight.flights.length - 1] &&
                flight.flights[flight.flights.length - 1].arrival_airport
                  ? flight.flights[flight.flights.length - 1].arrival_airport
                      .time
                  : null,
            }))
          : [],

        // Complete best flights data (all details)
        best_flights: flightData.best_flights || [],

        // Other flights summary
        other_flights_count: flightData.other_flights
          ? flightData.other_flights.length
          : 0,

        // Include price range
        price_range:
          flightData.best_flights && flightData.best_flights.length > 0
            ? {
                min: Math.min(
                  ...flightData.best_flights.map((f) => f.price || Infinity)
                ),
                max: Math.max(
                  ...flightData.best_flights.map((f) => f.price || 0)
                ),
              }
            : null,
      };

      // Insert the enhanced document
      await db.collection("flights").insertOne(enhancedFlightDoc);
      console.log(
        `Imported flight document for ${fileName} with complete schema`
      );
      return true;
    } catch (parseError) {
      console.error(
        `Error parsing flight JSON after date fix: ${parseError.message}`
      );
      console.error(`Problem location in file: ${fileName}`);

      // Fall back to the extraction method for any files that still fail
      console.log(`Attempting fallback parsing approach for ${fileName}`);

      // Extract main sections using regex
      const searchMetadataMatch = rawContent.match(
        /"search_metadata":\s*\{([^}]+)\}/s
      );
      const searchParametersMatch = rawContent.match(
        /"search_parameters":\s*\{([^}]+)\}/s
      );

      // Check if there are "best_flights" available by looking for the keyword
      const hasBestFlights = rawContent.indexOf('"best_flights"') !== -1;

      // Try to extract price info if available
      let minPrice = null;
      let maxPrice = null;

      const priceMatch = rawContent.match(/"price":\s*(\d+)/g);
      if (priceMatch && priceMatch.length > 0) {
        const prices = priceMatch.map((p) => parseInt(p.match(/\d+/)[0]));
        minPrice = Math.min(...prices);
        maxPrice = Math.max(...prices);
      }

      // Extract route information from filename
      const routeParts = fileName.split(".")[0].split("_");
      const [departureAirport, arrivalAirport, outboundDate, returnDate] =
        routeParts;

      // Create basic document with extracted information
      const flightDoc = {
        _source: fileName,
        route: fileName.split(".")[0],
        date_imported: new Date().toISOString(),
        has_flights: hasBestFlights,
        raw_data_available: true,
        parse_method: "fallback",

        // Route details
        route_info: {
          departure_airport: departureAirport,
          arrival_airport: arrivalAirport,
          outbound_date: outboundDate,
          return_date: returnDate,
        },

        // Add price info if available
        price_range: minPrice !== null ? { min: minPrice, max: maxPrice } : null,

        // Try to extract search parameters if available
        search_parameters: searchParametersMatch
          ? extractJsonObject(searchParametersMatch[0])
          : null,
      };

      // Insert the document with extracted data
      await db.collection("flights").insertOne(flightDoc);
      console.log(
        `Imported flight document for ${fileName} using fallback extraction method`
      );
      return true;
    }
  } catch (error) {
    console.error(`Error importing flight data ${fileName}:`, error);
    return false;
  }
}

// Special handling for Forex data
async function importForexData(db, filePath, fileName) {
  try {
    // Known structure of forex data - we can create a document manually
    const rawContent = fs.readFileSync(filePath, "utf8");

    // Extract currency pair from filename (e.g., AUD-EUR)
    const currencyPair = fileName.split("_")[0];

    // Extract price if available
    const priceMatch = rawContent.match(/"price":\s*"([0-9.]+)"/);
    const price = priceMatch ? parseFloat(priceMatch[1]) : null;

    // Create a simplified document
    const forexDoc = {
      _source: fileName,
      currency_pair: currencyPair,
      date_imported: new Date().toISOString(),
      price: price,
      raw_data_available: true,
    };

    // Insert the document
    await db.collection("forex").insertOne(forexDoc);
    console.log(
      `Imported forex document for ${fileName} using template approach`
    );
    return true;
  } catch (error) {
    console.error(`Error importing forex data ${fileName}:`, error);
    return false;
  }
}

// Import data from all collections
async function importAllData(db) {
  // Import geo data - we know this works
  const geoCollection = db.collection("geo");
  const geoDir = path.join(dataDir, "geo");
  console.log(`Processing geo data from ${geoDir}`);

  const geoFiles = fs
    .readdirSync(geoDir)
    .filter((file) => file.endsWith(".json"));
  console.log(`Found ${geoFiles.length} geo files`);

  for (const file of geoFiles) {
    const filePath = path.join(geoDir, file);
    try {
      const data = await fixAndLoadJson(filePath);
      if (data && Array.isArray(data)) {
        console.log(
          `Geo file ${file} contains array with ${data.length} items`
        );

        // Use bulk operations for better performance
        const bulkOps = data.map((item) => ({
          insertOne: { document: { ...item, _source: file } },
        }));

        if (bulkOps.length > 0) {
          const result = await geoCollection.bulkWrite(bulkOps);
          console.log(
            `Imported ${result.insertedCount} geo items from ${file}`
          );
        }
      }
    } catch (error) {
      console.error(`Error processing geo file ${file}:`, error);
    }
  }

  // Import forex data
  const forexDir = path.join(dataDir, "forex");
  console.log(`Processing forex data from ${forexDir}`);

  const forexFiles = fs
    .readdirSync(forexDir)
    .filter((file) => file.endsWith(".json"));
  console.log(`Found ${forexFiles.length} forex files`);

  let forexImported = 0;
  for (const file of forexFiles) {
    const filePath = path.join(forexDir, file);
    const success = await importForexData(db, filePath, file);
    if (success) forexImported++;
  }
  console.log(`Successfully imported ${forexImported} forex files`);

  // Import flights data
  const flightsDir = path.join(dataDir, "flights");
  console.log(`Processing flights data from ${flightsDir}`);

  const flightsFiles = fs
    .readdirSync(flightsDir)
    .filter((file) => file.endsWith(".json"));
  console.log(`Found ${flightsFiles.length} flights files`);

  let flightsImported = 0;
  for (const file of flightsFiles) {
    const filePath = path.join(flightsDir, file);
    const success = await importFlightData(db, filePath, file);
    if (success) flightsImported++;
  }
  console.log(`Successfully imported ${flightsImported} flights files`);
}

// Main function
async function main() {
  try {
    const db = await connectToMongoDB();
    await setupCollections(db);

    // Check if data directories exist before attempting import
    const dataDirectoryExists = fs.existsSync(dataDir);

    if (dataDirectoryExists) {
      console.log("Starting data import process...");
      await importAllData(db);
      console.log("Data import completed successfully");
    } else {
      console.log(
        `Data directory ${dataDir} not found. Skipping data import.`
      );
      console.log(
        "Connection test completed successfully without data import."
      );
    }
  } catch (error) {
    console.error("Error in main process:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("MongoDB connection closed");
    }
  }
}

// Run the script
main();
