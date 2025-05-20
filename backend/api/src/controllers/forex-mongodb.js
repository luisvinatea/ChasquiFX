/**
 * Forex controller with MongoDB implementation
 * This version replaces the deprecated Supabase and PythonBridge implementations
 */

import { getLogger } from "../utils/logger.js";
import { connectToDatabase } from "../db/mongodb-vercel.js";

const logger = getLogger("forex-mongodb-controller");

/**
 * Get forex exchange rates
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function getForexRates(req, res) {
  try {
    const { from_currency, to_currency } = req.query;

    if (!from_currency || !to_currency) {
      return res.status(400).json({
        status: "error",
        message: "Both from_currency and to_currency parameters are required",
      });
    }

    const currencyPair = `${from_currency}-${to_currency}`;

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Check the cache in MongoDB
    const cachedData = await db.collection("forex").findOne({
      currency_pair: currencyPair,
      expiresAt: { $gt: new Date() },
    });

    if (cachedData) {
      return res.json({
        status: "success",
        data: cachedData,
        source: "cache",
      });
    }

    // If no cache found, query the main forex collection
    const forexData = await db.collection("forex").findOne({
      currency_pair: currencyPair,
    });

    if (!forexData) {
      return res.status(404).json({
        status: "error",
        message: `No forex data available for ${currencyPair}`,
      });
    }

    // Create an expiry date for the cache (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Return the data
    return res.json({
      status: "success",
      data: forexData,
      source: "database",
    });
  } catch (error) {
    logger.error(`Error fetching forex rates: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve forex data",
      error: error.message,
    });
  }
}

/**
 * Get forex API status
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function getForexStatus(req, res) {
  try {
    // Start timing the request
    const startTime = process.hrtime();

    // Get MongoDB status
    let dbStatus = {
      status: "unknown",
      error: null,
    };

    try {
      const { db } = await connectToDatabase();
      await db.command({ ping: 1 });

      // Get collection stats
      const forexCount = await db.collection("forex").countDocuments();

      dbStatus = {
        status: "available",
        collections: {
          forex: forexCount,
        },
        message: "MongoDB connection successful",
      };
    } catch (error) {
      logger.error(`Error connecting to MongoDB: ${error.message}`);
      dbStatus = {
        status: "unavailable",
        error: error.message,
      };
    }

    // Calculate response time
    const hrtime = process.hrtime(startTime);
    const responseTimeMs = Math.round(hrtime[0] * 1000 + hrtime[1] / 1000000);

    // Get Node.js stats
    const nodeStats = {
      api_version: process.env.npm_package_version || "1.0.0",
      node_version: process.version,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage().heapUsed / 1024 / 1024, // In MB
      response_time_ms: responseTimeMs,
    };

    return res.json({
      status: "success",
      api_version: nodeStats.api_version,
      response_time_ms: responseTimeMs,
      node_stats: nodeStats,
      database: dbStatus,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Error checking system status: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to check system status",
      error: error.message,
    });
  }
}

/**
 * Reset quota status (admin only)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function resetQuotaStatus(req, res) {
  // Since this was for Python/Supabase before, we'll just return success
  // as quota is no longer applicable with MongoDB
  return res.json({
    status: "success",
    message: "MongoDB implementation does not use quotas",
  });
}

export default {
  getForexRates,
  getForexStatus,
  resetQuotaStatus,
};
