import { getLogger } from "../utils/logger.js";
import { PythonBridge } from "../services/pythonBridge.js";
import { supabaseClient } from "../services/supabase.js";

const logger = getLogger("recommendations-controller");
const pythonBridge = new PythonBridge();

/**
 * Get travel recommendations based on forex rates
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function getRecommendations(req, res) {
  try {
    const {
      base_currency,
      departure_airport,
      outbound_date,
      return_date,
      apiKey,
    } = req.query;

    if (!base_currency || !departure_airport) {
      return res.status(400).json({
        status: "error",
        message: "base_currency and departure_airport parameters are required",
      });
    }

    // First check the cache
    const cacheKey = `${base_currency}_${departure_airport}_${
      outbound_date || ""
    }_${return_date || ""}`;
    const { data: cachedData } = await supabaseClient
      .from("recommendation_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .order("created_at", { ascending: false })
      .limit(1);

    // Check if we have fresh cached data (less than 6 hours old)
    const cacheExpiry = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    if (
      cachedData?.length &&
      new Date() - new Date(cachedData[0].created_at) < cacheExpiry
    ) {
      return res.json({
        status: "success",
        data: cachedData[0].recommendations,
        source: "cache",
      });
    }

    // If no fresh cache, use Python service
    const recommendations = await pythonBridge.callPythonMethod(
      "services.recommendation_service",
      "get_recommendations",
      [base_currency, departure_airport, outbound_date, return_date, apiKey]
    );

    // Cache the result if successful
    if (recommendations && recommendations.length > 0) {
      await supabaseClient.from("recommendation_cache").insert([
        {
          cache_key: cacheKey,
          recommendations,
          params: {
            base_currency,
            departure_airport,
            outbound_date,
            return_date,
          },
        },
      ]);
    }

    return res.json({
      status: "success",
      data: recommendations,
      source: "api",
    });
  } catch (error) {
    logger.error(`Error generating recommendations: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to generate recommendations",
      error: error.message,
    });
  }
}

/**
 * Save a recommendation to user's history
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function saveUserRecommendation(req, res) {
  try {
    const { user } = req;
    const { recommendation } = req.body;

    if (!recommendation) {
      return res.status(400).json({
        status: "error",
        message: "recommendation data is required",
      });
    }

    // Save to user's recommendations history
    const { error } = await supabaseClient
      .from("user_recommendations")
      .insert([
        {
          user_id: user.id,
          recommendation_data: recommendation,
          notes: req.body.notes || null,
        },
      ]);

    if (error) throw error;

    return res.status(201).json({
      status: "success",
      message: "Recommendation saved to history",
    });
  } catch (error) {
    logger.error(`Error saving recommendation: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to save recommendation",
      error: error.message,
    });
  }
}

/**
 * Get user's recommendation history
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function getUserHistory(req, res) {
  try {
    const { user } = req;
    const { limit = 10, offset = 0 } = req.query;

    const { data, error, count } = await supabaseClient
      .from("user_recommendations")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    return res.json({
      status: "success",
      data,
      meta: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error(`Error retrieving user history: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve recommendation history",
      error: error.message,
    });
  }
}
