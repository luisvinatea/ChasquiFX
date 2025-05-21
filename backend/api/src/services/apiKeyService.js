/**
 * API Key Management Service
 * Handles storage and retrieval of user API keys securely in MongoDB
 */

import crypto from "crypto";
import { connectToDatabase } from "../db/mongodb.js";
import User from "../models/user.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("api-key-service");
// Encryption key from environment or a secure default for development
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "chasquifx-default-encryption-key-for-dev-use";

/**
 * Encrypt an API key
 * @param {string} text - API key to encrypt
 * @returns {Object} - Object containing encrypted key and initialization vector
 */
function encrypt(text) {
  try {
    // Create a random initialization vector
    const iv = crypto.randomBytes(16);
    // Create cipher using AES-256-CBC algorithm
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY.slice(0, 32), "utf-8"),
      iv
    );

    // Encrypt the text
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return {
      encryptedKey: encrypted,
      iv: iv.toString("hex"),
    };
  } catch (error) {
    logger.error(`Encryption error: ${error.message}`);
    throw new Error("Failed to encrypt API key");
  }
}

/**
 * Decrypt an API key
 * @param {string} encryptedKey - Encrypted API key
 * @param {string} ivString - Initialization vector as hex string
 * @returns {string} - Decrypted API key
 */
function decrypt(encryptedKey, ivString) {
  try {
    const iv = Buffer.from(ivString, "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY.slice(0, 32), "utf-8"),
      iv
    );

    let decrypted = decipher.update(encryptedKey, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    logger.error(`Decryption error: ${error.message}`);
    throw new Error("Failed to decrypt API key");
  }
}

/**
 * Store an API key for a user
 * @param {string} userId - User ID
 * @param {string} keyType - Type of API key (e.g., 'serpapi', 'searchapi', 'exchangeapi')
 * @param {string} apiKey - API key to store
 */
export async function storeApiKey(userId, keyType, apiKey) {
  try {
    await connectToDatabase();

    // Encrypt the API key
    const { encryptedKey, iv } = encrypt(apiKey);

    // Check if the user already has a key of this type
    const existingUser = await User.findById(userId);

    if (!existingUser) {
      throw new Error(`User not found: ${userId}`);
    }

    // Find the index of the existing key if it exists
    const existingKeyIndex =
      existingUser.apiKeys?.findIndex((key) => key.keyType === keyType) ?? -1;

    if (existingKeyIndex >= 0) {
      // Update existing key
      existingUser.apiKeys[existingKeyIndex].encryptedKey = encryptedKey;
      existingUser.apiKeys[existingKeyIndex].iv = iv;
      existingUser.apiKeys[existingKeyIndex].lastUsed = new Date();
    } else {
      // Add new key
      const newApiKey = {
        keyType,
        encryptedKey,
        iv,
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      if (!existingUser.apiKeys) {
        existingUser.apiKeys = [];
      }

      existingUser.apiKeys.push(newApiKey);
    }

    await existingUser.save();
    logger.info(`API key stored for user ${userId}, type: ${keyType}`);

    return true;
  } catch (error) {
    logger.error(`Error storing API key: ${error.message}`);
    throw error;
  }
}

/**
 * Get an API key for a user
 * @param {string} userId - User ID
 * @param {string} keyType - Type of API key
 * @returns {string|null} - Decrypted API key or null if not found
 */
export async function getApiKey(userId, keyType) {
  try {
    await connectToDatabase();

    const user = await User.findById(userId);

    if (!user || !user.apiKeys) {
      return null;
    }

    const apiKeyObj = user.apiKeys.find((key) => key.keyType === keyType);

    if (!apiKeyObj) {
      return null;
    }

    // Update lastUsed timestamp
    await User.updateOne(
      {
        _id: userId,
        "apiKeys.keyType": keyType,
      },
      {
        $set: { "apiKeys.$.lastUsed": new Date() },
      }
    );

    // Decrypt and return the API key
    return decrypt(apiKeyObj.encryptedKey, apiKeyObj.iv);
  } catch (error) {
    logger.error(`Error getting API key: ${error.message}`);
    throw error;
  }
}

/**
 * Check if a user has an API key of a specific type
 * @param {string} userId - User ID
 * @param {string} keyType - Type of API key
 * @returns {boolean} - True if key exists, false otherwise
 */
export async function hasApiKey(userId, keyType) {
  try {
    await connectToDatabase();

    const count = await User.countDocuments({
      _id: userId,
      "apiKeys.keyType": keyType,
    });

    return count > 0;
  } catch (error) {
    logger.error(`Error checking API key: ${error.message}`);
    throw error;
  }
}

/**
 * Delete an API key for a user
 * @param {string} userId - User ID
 * @param {string} keyType - Type of API key
 * @returns {boolean} - True if key was deleted, false if not found
 */
export async function deleteApiKey(userId, keyType) {
  try {
    await connectToDatabase();

    const result = await User.updateOne(
      { _id: userId },
      { $pull: { apiKeys: { keyType: keyType } } }
    );

    if (result.modifiedCount > 0) {
      logger.info(`API key deleted for user ${userId}, type: ${keyType}`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error(`Error deleting API key: ${error.message}`);
    throw error;
  }
}

/**
 * List all API key types for a user (without returning the actual keys)
 * @param {string} userId - User ID
 * @returns {Array} - Array of objects with keyType and lastUsed date
 */
export async function listApiKeys(userId) {
  try {
    await connectToDatabase();

    const user = await User.findById(userId);

    if (!user || !user.apiKeys) {
      return [];
    }

    // Return only the key types and timestamps, not the actual keys
    return user.apiKeys.map((key) => ({
      keyType: key.keyType,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
    }));
  } catch (error) {
    logger.error(`Error listing API keys: ${error.message}`);
    throw error;
  }
}
