/**
 * JSON Data Utilities Module
 *
 * Provides utilities for parsing, fixing, and importing JSON data into MongoDB
 */

import fs from "fs";
import path from "path";
import { createLogger } from "./mongodb-client.js";

// Initialize logger
const logger = createLogger();

/**
 * Fixes common JSON issues in a string
 * @param {string} content - JSON string to fix
 * @returns {string} Fixed JSON string
 */
export function fixJsonString(content) {
  let fixedContent = content;

  // Remove file path comments
  fixedContent = fixedContent.replace(/\/\/.*?$/gm, "");

  // Replace problematic control characters
  fixedContent = fixedContent.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");

  // Convert the specific datetime format that's causing issues
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

/**
 * Loads and fixes JSON from a file
 * @param {string} filePath - Path to the JSON file
 * @returns {object|null} Parsed JSON object or null if parsing fails
 */
export async function fixAndLoadJson(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf8");

    // Apply fixes to the JSON string
    content = fixJsonString(content);

    // Try to parse the JSON
    try {
      return JSON.parse(content);
    } catch (e) {
      logger.error(
        `Error parsing fixed JSON in ${path.basename(filePath)}: ${e.message}`
      );

      // If we can't parse it, try a more aggressive approach
      // Replace all control characters with spaces
      content = content.replace(/[\x00-\x1F]/g, " ");

      try {
        return JSON.parse(content);
      } catch (e2) {
        logger.error(
          `Still can't parse ${path.basename(filePath)} after aggressive fixes`
        );
        return null;
      }
    }
  } catch (error) {
    logger.error(`Error reading file ${path.basename(filePath)}:`, error);
    return null;
  }
}

/**
 * Special handling for Flight data
 * @param {object} db - MongoDB database instance
 * @param {string} filePath - Path to the flight data file
 * @param {string} fileName - Name of the file
 * @returns {boolean} Success status
 */
export async function importFlightData(db, filePath, fileName) {
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
      logger.info(`Successfully parsed flight data for ${fileName}`);

      // Extract route information from filename
      const routeParts = fileName.split(".")[0].split("_");
      const [departureAirport, arrivalAirport, outboundDate, returnDate] =
        routeParts;

      // Create a comprehensive flight document with metadata
      const enhancedFlightData = {
        ...flightData,
        _source: fileName,
        route_info: {
          departure_airport: departureAirport,
          arrival_airport: arrivalAirport,
          outbound_date: outboundDate,
          return_date: returnDate,
        },
        imported_at: new Date().toISOString(),
      };

      // Insert into the flights collection
      await db.collection("flights").insertOne(enhancedFlightData);
      logger.info(`Imported flight data for ${fileName}`);
      return true;
    } catch (parseError) {
      logger.error(
        `Error parsing flight data ${fileName}: ${parseError.message}`
      );

      // Create a minimal record so we know this file exists but couldn't be parsed
      try {
        await db.collection("flights").insertOne({
          _source: fileName,
          route_info: {
            raw_filename: fileName,
          },
          import_error: parseError.message,
          imported_at: new Date().toISOString(),
          parse_status: "failed",
        });
        logger.warn(
          `Created placeholder record for unparseable flight data: ${fileName}`
        );
        return false;
      } catch (insertError) {
        logger.error(
          `Failed to create placeholder for flight data ${fileName}: ${insertError.message}`
        );
        return false;
      }
    }
  } catch (error) {
    logger.error(`Error importing flight data ${fileName}:`, error);
    return false;
  }
}

/**
 * Special handling for Forex data
 * @param {object} db - MongoDB database instance
 * @param {string} filePath - Path to the forex data file
 * @param {string} fileName - Name of the file
 * @returns {boolean} Success status
 */
export async function importForexData(db, filePath, fileName) {
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
    logger.info(
      `Imported forex document for ${fileName} using template approach`
    );
    return true;
  } catch (error) {
    logger.error(`Error importing forex data ${fileName}:`, error);
    return false;
  }
}

/**
 * Import geo data (airports, cities)
 * @param {object} db - MongoDB database instance
 * @param {string} filePath - Path to the geo data file
 * @param {string} fileName - Name of the file
 * @returns {boolean} Success status
 */
export async function importGeoData(db, filePath, fileName) {
  try {
    // Load and fix the JSON data
    const geoData = await fixAndLoadJson(filePath);

    if (!geoData) {
      logger.error(`Failed to parse geo data file: ${fileName}`);
      return false;
    }

    // Insert or update the geo data
    await db.collection("geo").insertOne({
      ...geoData,
      _source: fileName,
      imported_at: new Date().toISOString(),
    });

    logger.info(`Imported geo data from ${fileName}`);
    return true;
  } catch (error) {
    logger.error(`Error importing geo data ${fileName}:`, error);
    return false;
  }
}

export default {
  fixJsonString,
  fixAndLoadJson,
  importFlightData,
  importForexData,
  importGeoData,
};
