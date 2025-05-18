import { getLogger } from "../utils/logger.js";
import { PythonBridge } from "../services/pythonBridge.js";
import { supabaseClient } from "../services/supabase.js";

const logger = getLogger("forex-controller");
const pythonBridge = new PythonBridge();

/**
 * Get forex exchange rates
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function getForexRates(req, res) {
  try {
    const { from_currency, to_currency, apiKey } = req.query;

    if (!from_currency || !to_currency) {
      return res.status(400).json({
        status: "error",
        message: "Both from_currency and to_currency parameters are required",
      });
    }

    // First check the cache
    const { data: cachedData } = await supabaseClient
      .from("forex_cache")
      .select("*")
      .eq("from_currency", from_currency)
      .eq("to_currency", to_currency)
      .order("created_at", { ascending: false })
      .limit(1);

    // Check if we have fresh cached data (less than 1 hour old)
    const cacheExpiry = 60 * 60 * 1000; // 1 hour in milliseconds
    if (
      cachedData?.length &&
      new Date() - new Date(cachedData[0].created_at) < cacheExpiry
    ) {
      return res.json({
        status: "success",
        data: cachedData[0],
        source: "cache",
      });
    }

    // If no fresh cache, use Python service
    const forexData = await pythonBridge.callPythonMethod(
      "services.forex_service",
      "get_exchange_rates",
      [from_currency, to_currency, apiKey]
    );

    // Cache the result if successful
    if (forexData && forexData.rate) {
      await supabaseClient.from("forex_cache").insert([
        {
          from_currency,
          to_currency,
          rate: forexData.rate,
          data: forexData,
        },
      ]);
    }

    return res.json({
      status: "success",
      data: forexData,
      source: "api",
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

    // Check if Python services are available
    let pythonServiceStatus = {
      status: "unknown",
      error: null,
    };

    try {
      pythonServiceStatus = await pythonBridge.callPythonMethod(
        "services.forex_service",
        "get_service_status"
      );
    } catch (error) {
      logger.error(`Error contacting Python service: ${error.message}`);
      pythonServiceStatus = {
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
      python_service: pythonServiceStatus,
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
  try {
    // This is protected by auth middleware
    const { user } = req;

    // Check if user has admin role
    const { data: userData } = await supabaseClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized: Admin privileges required",
      });
    }

    // Reset quota status in Python service
    const result = await pythonBridge.callPythonMethod(
      "services.forex_service",
      "reset_quota_status"
    );

    return res.json({
      status: "success",
      message: "Quota status reset successfully",
      data: result,
    });
  } catch (error) {
    logger.error(`Error resetting quota status: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to reset quota status",
      error: error.message,
    });
  }
}
