/**
 * MongoDB Collection Setup Script
 *
 * This script sets up the forex, flights, and geo collections in MongoDB
 * and imports data from JSON files.
 */

const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();
const mongoose = require("mongoose");
const { connectToDatabase } = require("../src/db/mongodb");

// Base directories for data files
const FOREX_DATA_DIR = path.resolve(__dirname, "../../assets/data/forex");
const FLIGHTS_DATA_DIR = path.resolve(__dirname, "../../assets/data/flights");
const GEO_DATA_DIR = path.resolve(__dirname, "../../assets/data/geo");

// Set up logger
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  debug: (msg) => console.debug(`[DEBUG] ${msg}`),
};

/**
 * Read and parse a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {Promise<Object|null>} - Parsed JSON object or null if error
 */
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Error reading file ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Setup the MongoDB collections and define schemas for them
 * @returns {Promise<Object>} - Object containing the created models
 */
async function setupCollections() {
  try {
    logger.info("Setting up collections...");

    // Connect to MongoDB
    await connectToDatabase();

    // Define schemas if they don't exist already

    // Forex collection schema
    const forexSchema = new mongoose.Schema({
      cacheKey: {
        type: String,
        required: true,
        unique: true,
      },
      searchParameters: {
        q: String, // Currency pair (e.g., "USD-EUR")
      },
      searchMetadata: {
        created_at: Date, // Creation timestamp
      },
      data: mongoose.Schema.Types.Mixed, // The actual forex data
      expiresAt: {
        type: Date,
        required: true,
      },
      importedAt: {
        type: Date,
        default: Date.now,
      },
    });

    // Flights collection schema
    const flightSchema = new mongoose.Schema({
      cacheKey: {
        type: String,
        required: true,
        unique: true,
      },
      searchParameters: {
        departure_id: String,
        arrival_id: String,
        outbound_date: String,
        return_date: String,
      },
      data: mongoose.Schema.Types.Mixed, // The actual flight data
      expiresAt: {
        type: Date,
        required: true,
      },
      importedAt: {
        type: Date,
        default: Date.now,
      },
    });

    // Geo collection schema for airports
    const airportSchema = new mongoose.Schema({
      AirportID: Number,
      Name: String,
      City: String,
      Country: String,
      IATA: String,
      ICAO: String,
      Latitude: Number,
      Longitude: Number,
      Altitude: Number,
      Timezone: Number,
      DST: String,
      Tz: String,
    });

    // Create models
    const models = {
      Forex: mongoose.models.Forex || mongoose.model("Forex", forexSchema),
      Flight: mongoose.models.Flight || mongoose.model("Flight", flightSchema),
      Airport:
        mongoose.models.Airport || mongoose.model("Airport", airportSchema),
    };

    // Create indexes
    logger.info("Creating indexes...");

    // Forex indexes
    await models.Forex.collection.createIndex(
      { cacheKey: 1 },
      { unique: true }
    );
    await models.Forex.collection.createIndex({ "searchParameters.q": 1 });
    await models.Forex.collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );
    logger.info("Created indexes for Forex collection");

    // Flight indexes
    await models.Flight.collection.createIndex(
      { cacheKey: 1 },
      { unique: true }
    );
    await models.Flight.collection.createIndex({
      "searchParameters.departure_id": 1,
      "searchParameters.arrival_id": 1,
    });
    await models.Flight.collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );
    logger.info("Created indexes for Flight collection");

    // Airport indexes
    await models.Airport.collection.createIndex({ IATA: 1 }, { unique: true });
    await models.Airport.collection.createIndex({ Country: 1 });
    logger.info("Created indexes for Airport collection");

    return models;
  } catch (error) {
    logger.error(`Error setting up collections: ${error.message}`);
    throw error;
  }
}

/**
 * Import forex data from JSON files
 * @param {mongoose.Model} ForexModel - Mongoose model for forex collection
 * @returns {Promise<number>} - Number of imported files
 */
async function importForexData(ForexModel) {
  try {
    logger.info("Importing forex data...");
    const files = await fs.readdir(FOREX_DATA_DIR);
    const jsonFiles = files.filter(
      (file) => file.endsWith(".json") && file !== "api_quota_status.json"
    );

    logger.info(`Found ${jsonFiles.length} forex data files`);
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const fileName of jsonFiles) {
      try {
        const filePath = path.join(FOREX_DATA_DIR, fileName);
        const data = await readJsonFile(filePath);

        if (!data) {
          errorCount++;
          continue;
        }

        // Extract currency pair from filename
        const fileNameMatch = path
          .basename(fileName, ".json")
          .match(/^([A-Z]{3}-[A-Z]{3})_(.+)$/);
        if (!fileNameMatch) {
          logger.warn(`Skipping ${fileName}: Invalid naming format`);
          skipCount++;
          continue;
        }

        const currencyPair = fileNameMatch[1];
        let createdAt = fileNameMatch[2].replace(/-/g, ":");
        createdAt = createdAt.slice(0, 10) + " " + createdAt.slice(11);

        // Generate cache key
        const cacheKey = path.basename(fileName, ".json");

        // Check if document already exists
        const existing = await ForexModel.findOne({ cacheKey });
        if (existing) {
          logger.info(`Skipping ${fileName}: Already exists in database`);
          skipCount++;
          continue;
        }

        // Set expiry date (24 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Create the document
        await ForexModel.create({
          cacheKey,
          searchParameters: {
            q: currencyPair,
          },
          searchMetadata: {
            created_at: data.search_metadata?.created_at || createdAt,
          },
          data,
          expiresAt,
        });

        logger.info(`Imported forex data: ${fileName}`);
        successCount++;
      } catch (error) {
        logger.error(
          `Error importing forex file ${fileName}: ${error.message}`
        );
        errorCount++;
      }
    }

    logger.info(
      `Forex data import completed: ${successCount} imported, ${skipCount} skipped, ${errorCount} errors`
    );
    return successCount;
  } catch (error) {
    logger.error(`Error importing forex data: ${error.message}`);
    return 0;
  }
}

/**
 * Import flight data from JSON files
 * @param {mongoose.Model} FlightModel - Mongoose model for flight collection
 * @returns {Promise<number>} - Number of imported files
 */
async function importFlightData(FlightModel) {
  try {
    logger.info("Importing flight data...");
    const files = await fs.readdir(FLIGHTS_DATA_DIR);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    logger.info(`Found ${jsonFiles.length} flight data files`);
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const fileName of jsonFiles) {
      try {
        const filePath = path.join(FLIGHTS_DATA_DIR, fileName);
        const data = await readJsonFile(filePath);

        if (!data) {
          errorCount++;
          continue;
        }

        // Extract search parameters from filename
        const fileNameParts = path.basename(fileName, ".json").split("_");
        if (fileNameParts.length !== 4) {
          logger.warn(`Skipping ${fileName}: Invalid naming format`);
          skipCount++;
          continue;
        }

        const [departure_id, arrival_id, outbound_date, return_date] =
          fileNameParts;

        // Generate cache key
        const cacheKey = path.basename(fileName, ".json");

        // Check if document already exists
        const existing = await FlightModel.findOne({ cacheKey });
        if (existing) {
          logger.info(`Skipping ${fileName}: Already exists in database`);
          skipCount++;
          continue;
        }

        // Set expiry date (24 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Create the document
        await FlightModel.create({
          cacheKey,
          searchParameters: {
            departure_id,
            arrival_id,
            outbound_date,
            return_date,
          },
          data,
          expiresAt,
        });

        logger.info(`Imported flight data: ${fileName}`);
        successCount++;
      } catch (error) {
        logger.error(
          `Error importing flight file ${fileName}: ${error.message}`
        );
        errorCount++;
      }
    }

    logger.info(
      `Flight data import completed: ${successCount} imported, ${skipCount} skipped, ${errorCount} errors`
    );
    return successCount;
  } catch (error) {
    logger.error(`Error importing flight data: ${error.message}`);
    return 0;
  }
}

/**
 * Import geo data (airports)
 * @param {mongoose.Model} AirportModel - Mongoose model for airport collection
 * @returns {Promise<number>} - Number of imported airports
 */
async function importGeoData(AirportModel) {
  try {
    logger.info("Importing geo data (airports)...");

    const airportsPath = path.join(GEO_DATA_DIR, "airports.json");
    const airportsData = await readJsonFile(airportsPath);

    if (!airportsData || !Array.isArray(airportsData)) {
      logger.error("Failed to read airports data or invalid format");
      return 0;
    }

    logger.info(`Found ${airportsData.length} airports in the file`);

    // Check if there's existing data
    const existingCount = await AirportModel.countDocuments();
    if (existingCount > 0) {
      logger.info(
        `Found ${existingCount} existing airports in database, skipping import`
      );
      return 0;
    }

    // Insert all airports
    const result = await AirportModel.insertMany(
      airportsData.filter((airport) => airport.IATA), // Filter out entries without IATA codes
      { ordered: false } // Continue inserting even if some documents fail
    );

    logger.info(`Imported ${result.length} airports`);
    return result.length;
  } catch (error) {
    logger.error(`Error importing geo data: ${error.message}`);
    return 0;
  }
}

/**
 * Main function to set up collections and import data
 */
async function main() {
  try {
    logger.info("Starting collection setup and data import...");

    // Setup collections and get models
    const models = await setupCollections();

    // Import data into collections
    await importGeoData(models.Airport);
    await importForexData(models.Forex);
    await importFlightData(models.Flight);

    logger.info("Collection setup and data import completed successfully");

    // Close database connection
    await mongoose.connection.close();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error(`Collection setup and data import failed: ${error.message}`);

    // Try to close connection on error
    try {
      await mongoose.connection.close();
    } catch (e) {
      // Ignore error on close
    }

    process.exit(1);
  }
}

// Run the main function
main();
