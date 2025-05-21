/**
 * API Key Controller
 * Handles API key management routes
 */

import { getLogger } from "../utils/logger.js";
import {
  storeApiKey,
  getApiKey,
  deleteApiKey,
  listApiKeys,
  hasApiKey,
} from "../services/apiKeyService.js";

const logger = getLogger("api-key-controller");

/**
 * Store an API key
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleStoreApiKey(req, res) {
  try {
    const { user } = req;
    const { keyType, apiKey } = req.body;

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    if (!keyType || !apiKey) {
      return res.status(400).json({
        status: "error",
        message: "Key type and API key are required",
      });
    }

    await storeApiKey(user.id, keyType, apiKey);

    return res.json({
      status: "success",
      message: "API key stored successfully",
    });
  } catch (error) {
    logger.error(`Error storing API key: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to store API key",
      error: error.message,
    });
  }
}

/**
 * Verify an API key exists (without returning the key)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleVerifyApiKey(req, res) {
  try {
    const { user } = req;
    const { keyType } = req.params;

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    if (!keyType) {
      return res.status(400).json({
        status: "error",
        message: "Key type is required",
      });
    }

    const hasKey = await hasApiKey(user.id, keyType);

    return res.json({
      status: "success",
      exists: hasKey,
    });
  } catch (error) {
    logger.error(`Error verifying API key: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to verify API key",
      error: error.message,
    });
  }
}

/**
 * Get an API key
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleGetApiKey(req, res) {
  try {
    const { user } = req;
    const { keyType } = req.params;

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    if (!keyType) {
      return res.status(400).json({
        status: "error",
        message: "Key type is required",
      });
    }

    const apiKey = await getApiKey(user.id, keyType);

    if (!apiKey) {
      return res.status(404).json({
        status: "error",
        message: "API key not found",
      });
    }

    return res.json({
      status: "success",
      apiKey,
    });
  } catch (error) {
    logger.error(`Error getting API key: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to get API key",
      error: error.message,
    });
  }
}

/**
 * Delete an API key
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleDeleteApiKey(req, res) {
  try {
    const { user } = req;
    const { keyType } = req.params;

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    if (!keyType) {
      return res.status(400).json({
        status: "error",
        message: "Key type is required",
      });
    }

    const deleted = await deleteApiKey(user.id, keyType);

    if (!deleted) {
      return res.status(404).json({
        status: "error",
        message: "API key not found",
      });
    }

    return res.json({
      status: "success",
      message: "API key deleted successfully",
    });
  } catch (error) {
    logger.error(`Error deleting API key: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to delete API key",
      error: error.message,
    });
  }
}

/**
 * List all API keys for a user
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleListApiKeys(req, res) {
  try {
    const { user } = req;

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const keys = await listApiKeys(user.id);

    return res.json({
      status: "success",
      keys,
    });
  } catch (error) {
    logger.error(`Error listing API keys: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to list API keys",
      error: error.message,
    });
  }
}
