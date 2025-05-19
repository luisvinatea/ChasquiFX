/**
 * Recommendations Controller
 *
 * Handles recommendation-related API endpoints using the orchestrator service
 */

import { getLogger } from "../utils/logger.js";
import {
  generateRecommendations,
  saveUserRecommendation,
} from "../services/recommendationOrchestrator.js";
import {
  getCachedRecommendations,
  cacheRecommendations,
} from "../services/cacheService.js";

const logger = getLogger("recommendations-controller");

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
    const cachedData = await getCachedRecommendations(cacheKey);

    // Check if we have fresh cached data (less than 6 hours old)
    if (cachedData) {
      return res.json({
        status: "success",
        data: cachedData.recommendations,
        source: "cache",
        cached_at: cachedData.created_at,
      });
    }

    // No cache hit, generate new recommendations
    const recommendationParams = {
      baseCurrency: base_currency,
      departureAirport: departure_airport,
      outboundDate: outbound_date,
      returnDate: return_date,
      apiKey: apiKey,
    };

    const recommendations = await generateRecommendations(
      recommendationParams
    );

    // Cache the results
    await cacheRecommendations(cacheKey, recommendations);

    // Return the recommendations
    return res.json({
      status: "success",
      data: recommendations.recommendations,
      source: "fresh",
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    logger.error(`Error getting recommendations: ${err.message}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to get recommendations",
      error: err.message,
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
    const recommendation = req.body;

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    if (!recommendation || !recommendation.destination) {
      return res.status(400).json({
        status: "error",
        message: "Valid recommendation data is required",
      });
    }

    // Save recommendation using the orchestrator service
    const savedRecommendation = await saveUserRecommendation(
      user.id,
      recommendation
    );

    return res.json({
      status: "success",
      message: "Recommendation saved successfully",
      data: savedRecommendation,
    });
  } catch (err) {
    logger.error(`Error saving recommendation: ${err.message}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to save recommendation",
      error: err.message,
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

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    // This would be implemented with database access
    // For now, return an empty array as placeholder
    const history = [];

    return res.json({
      status: "success",
      data: history,
    });
  } catch (err) {
    logger.error(`Error getting user history: ${err.message}`);
    return res.status(500).json({
      status: "error",
      message: "Failed to get recommendation history",
      error: err.message,
    });
  }
}
