/**
 * File Standardization Service
 *
 * This module provides utilities for standardizing data files based on their content
 * and metadata, matching the functionality of the Python file_renamer.py script but
 * implemented in JavaScript for the Node.js backend.
 */

const fs = require("fs").promises;
const path = require("path");
const logger = require("../utils/logger");

/**
 * Extract specific metadata from a JSON file or object
 *
 * @param {Object|string} jsonInput - JSON object or path to a JSON file
 * @param {Array<string>} keys - List of keys to extract (can use dot notation for nested keys)
 * @returns {Promise<Object>} - Dictionary of extracted key-value pairs
 */
async function extractJsonMetadata(jsonInput, keys) {
  try {
    let data;

    // If input is a string, treat it as a file path
    if (typeof jsonInput === "string") {
      const content = await fs.readFile(jsonInput, "utf8");
      data = JSON.parse(content);
    } else {
      // Otherwise, use the input object directly
      data = jsonInput;
    }

    const result = {};

    for (const key of keys) {
      // Handle nested keys with dot notation
      const parts = key.split(".");
      let value = data;

      for (const part of parts) {
        if (value && typeof value === "object" && part in value) {
          value = value[part];
        } else {
          value = null;
          break;
        }
      }

      result[key] = value;
    }

    return result;
  } catch (error) {
    logger.error(`Error extracting metadata: ${error.message}`);
    return {};
  }
}

/**
 * Generate a standardized filename based on file metadata
 *
 * @param {Object|string} originalFile - JSON object or path to the original file
 * @param {Array<string>} metadataKeys - Keys to extract from JSON for filename
 * @param {string} template - Template string for filename (e.g., "{key1}_{key2}")
 * @param {string} [delimiter="_"] - Delimiter to use between parts of the filename
 * @returns {Promise<string|null>} - Standardized filename or null if metadata extraction failed
 */
async function standardizeFilename(
  originalFile,
  metadataKeys,
  template,
  delimiter = "_"
) {
  try {
    // Extract metadata
    const metadata = await extractJsonMetadata(originalFile, metadataKeys);

    if (
      !metadata ||
      Object.keys(metadata).length === 0 ||
      metadataKeys.some(
        (k) => metadata[k] === null || metadata[k] === undefined
      )
    ) {
      logger.warning(
        `Could not extract required metadata from ${
          typeof originalFile === "string" ? originalFile : "object"
        }`
      );
      return null;
    }

    // Format the filename according to template
    // We'll use the leaf part of the key (after the last dot) as the format variable
    const formatVars = {};
    for (const key of metadataKeys) {
      const leafName = key.split(".").pop();
      formatVars[leafName] = metadata[key];
    }

    // Replace template placeholders with values
    let newBasename = template;
    for (const [key, value] of Object.entries(formatVars)) {
      newBasename = newBasename.replace(`{${key}}`, value);
    }

    // If original file is a file path, add the extension
    if (typeof originalFile === "string") {
      const ext = path.extname(originalFile);
      return `${newBasename}${ext}`;
    }

    return newBasename;
  } catch (error) {
    logger.error(`Error standardizing filename: ${error.message}`);
    return null;
  }
}

/**
 * Standardize flight data filenames
 *
 * @param {Object} data - Flight data object
 * @returns {Promise<string|null>} - Standardized filename without extension
 */
async function standardizeFlightFilename(data) {
  return await standardizeFilename(
    data,
    [
      "search_parameters.departure_id",
      "search_parameters.arrival_id",
      "search_parameters.outbound_date",
      "search_parameters.return_date",
    ],
    "{departure_id}_{arrival_id}_{outbound_date}_{return_date}"
  );
}

/**
 * Standardize forex data filenames
 *
 * @param {Object} data - Forex data object
 * @returns {Promise<string|null>} - Standardized filename without extension
 */
async function standardizeForexFilename(data) {
  // First ensure search_metadata has a created_at field
  if (!data.search_metadata || !data.search_metadata.created_at) {
    if (!data.search_metadata) {
      data.search_metadata = {};
    }
    data.search_metadata.created_at = new Date().toISOString();
  }

  // Standardize the timestamp in created_at field
  const timestamp = data.search_metadata.created_at;
  const standardizedTimestamp = timestamp
    .replace(/[T]/g, "-")
    .replace(/:/g, "-")
    .replace(/\.\d+Z?$/, "");

  data.search_metadata.created_at = standardizedTimestamp;

  return await standardizeFilename(
    data,
    ["search_parameters.q", "search_metadata.created_at"],
    "{q}_{created_at}"
  );
}

/**
 * Write a standardized JSON file to disk
 *
 * @param {Object} data - JSON data to write
 * @param {string} type - Type of data ('flight' or 'forex')
 * @param {string} [baseDir=null] - Base directory to write the file to (defaults to chasquifx data dirs)
 * @returns {Promise<string|null>} - Path to the written file or null if failed
 */
async function writeStandardizedFile(data, type, baseDir = null) {
  try {
    let filename;
    let targetDir;

    // Determine the filename based on data type
    if (type === "flight") {
      filename = await standardizeFlightFilename(data);
      targetDir =
        baseDir || path.resolve(__dirname, "../../../assets/data/flights");
    } else if (type === "forex") {
      filename = await standardizeForexFilename(data);
      targetDir =
        baseDir || path.resolve(__dirname, "../../../assets/data/forex");
    } else {
      logger.error(`Unknown data type: ${type}`);
      return null;
    }

    if (!filename) {
      logger.error("Failed to generate standardized filename");
      return null;
    }

    // Make sure the directory exists
    try {
      await fs.mkdir(targetDir, { recursive: true });
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
    }

    const filePath = path.join(targetDir, `${filename}.json`);

    // Write the file
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
    logger.info(`Successfully wrote standardized file: ${filePath}`);

    return filePath;
  } catch (error) {
    logger.error(`Error writing standardized file: ${error.message}`);
    return null;
  }
}

/**
 * Generate a MongoDB cache key from data
 *
 * @param {Object} data - The data object
 * @param {string} type - Type of data ('flight' or 'forex')
 * @returns {Promise<string|null>} - Cache key for MongoDB
 */
async function generateCacheKey(data, type) {
  if (type === "flight") {
    return await standardizeFlightFilename(data);
  } else if (type === "forex") {
    return await standardizeForexFilename(data);
  } else {
    logger.error(`Unknown data type: ${type}`);
    return null;
  }
}

module.exports = {
  extractJsonMetadata,
  standardizeFilename,
  standardizeFlightFilename,
  standardizeForexFilename,
  writeStandardizedFile,
  generateCacheKey,
};
