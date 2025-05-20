#!/bin/bash

# Set colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}ChasquiFX Recommendations Controller Fix${NC}"
echo -e "${BLUE}=======================================${NC}\n"

# Change to the backend/api directory
cd /home/luisvinatea/DEVinatea/Repos/chasquifx/backend/api || {
    echo -e "${RED}❌ Failed to change directory to backend/api${NC}"
    exit 1
}

# Create a backup of the existing controller
CONTROLLER_PATH="src/controllers/recommendations-controller.js"
BACKUP_PATH="${CONTROLLER_PATH}.bak.$(date +%Y%m%d%H%M%S)"

if [ -f "$CONTROLLER_PATH" ]; then
    cp "$CONTROLLER_PATH" "$BACKUP_PATH"
    echo -e "${GREEN}✅ Created backup at ${BACKUP_PATH}${NC}"
else
    echo -e "${RED}❌ Controller file not found at ${CONTROLLER_PATH}${NC}"
    exit 1
fi

# Create updated controller with MongoDB connection
cat >"$CONTROLLER_PATH" <<'EOF'
/**
 * Recommendations Controller
 *
 * Handles recommendation-related API endpoints using the orchestrator service
 */

import { getLogger } from "../utils/logger.js";
import { connectToDatabase } from "../db/mongodb-vercel.js";
import {
  generateRecommendations,
  saveUserRecommendation as saveRecommendationToDatabase,
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
    logger.info("Starting recommendations request");
    
    // Ensure database connection is established first
    const { db, client } = await connectToDatabase().catch(error => {
      logger.error(`Database connection error: ${error.message}`);
      throw new Error(`Failed to connect to database: ${error.message}`);
    });
    
    logger.info("Database connection successful");

    const {
      base_currency,
      departure_airport,
      outbound_date,
      return_date,
      apiKey,
    } = req.query;

    logger.info(`Request params: departure=${departure_airport}, dates=${outbound_date}-${return_date}`);

    if (!departure_airport) {
      logger.warn("Missing required parameter: departure_airport");
      return res.status(400).json({
        status: "error",
        message: "departure_airport parameter is required",
      });
    }

    // Use default base currency if not provided
    const baseCurrency = base_currency || "USD";

    // First check the cache
    const cacheKey = `${baseCurrency}_${departure_airport}_${
      outbound_date || ""
    }_${return_date || ""}`;
    
    logger.info(`Checking cache with key: ${cacheKey}`);
    let cachedData;
    
    try {
      cachedData = await getCachedRecommendations(cacheKey);
    } catch (cacheError) {
      logger.warn(`Cache check failed: ${cacheError.message}`);
      // Continue execution even if cache fails
    }

    // Check if we have fresh cached data (less than 6 hours old)
    if (cachedData) {
      logger.info("Cache hit - returning cached recommendations");
      return res.json({
        status: "success",
        data: cachedData.recommendations,
        source: "cache",
        cached_at: cachedData.created_at,
      });
    }

    logger.info("Cache miss - generating new recommendations");
    
    // No cache hit, generate new recommendations
    const recommendationParams = {
      baseCurrency,
      departureAirport: departure_airport,
      outboundDate: outbound_date,
      returnDate: return_date,
      apiKey: apiKey,
      db  // Pass the database connection
    };

    try {
      const recommendations = await generateRecommendations(
        recommendationParams
      );

      // Cache the results
      try {
        await cacheRecommendations(cacheKey, recommendations);
        logger.info("Recommendations cached successfully");
      } catch (cacheError) {
        logger.warn(`Failed to cache recommendations: ${cacheError.message}`);
        // Continue even if caching fails
      }

      logger.info("Successfully generated recommendations");
      
      // Return the recommendations
      return res.json({
        status: "success",
        data: recommendations.recommendations || recommendations, // Handle different response formats
        source: "fresh",
        generated_at: new Date().toISOString(),
      });
    } catch (genError) {
      logger.error(`Recommendation generation failed: ${genError.message}`);
      throw genError;
    }
  } catch (err) {
    logger.error(`Error getting recommendations: ${err.message}`);
    logger.error(err.stack);
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
export async function handleSaveUserRecommendation(req, res) {
  try {
    // Ensure database connection is established first
    const { db } = await connectToDatabase();
    
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
    const savedRecommendation = await saveRecommendationToDatabase(
      user.id,
      recommendation,
      db
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
    // Ensure database connection is established first
    const { db } = await connectToDatabase();
    
    const { user } = req;
    const { limit = 10, offset = 0 } = req.query;

    if (!user || !user.id) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    // Now that we have the database connection, we can query user history
    const history = await db
      .collection("user_recommendations")
      .find({ user_id: user.id })
      .sort({ created_at: -1 })
      .skip(parseInt(offset, 10))
      .limit(parseInt(limit, 10))
      .toArray();

    return res.json({
      status: "success",
      data: history || [],
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
EOF

echo -e "${GREEN}✅ Updated controller with improved database connection and error handling${NC}"

# Now let's check the recommendation orchestrator
ORCHESTRATOR_PATH="src/services/recommendationOrchestrator.js"

if [ -f "$ORCHESTRATOR_PATH" ]; then
    echo -e "\n${YELLOW}Checking recommendation orchestrator service...${NC}"
    head -n 30 "$ORCHESTRATOR_PATH"

    echo -e "\n${BLUE}Would you like to examine the full orchestrator file? (y/n)${NC}"
    read -r examine_orch

    if [ "$examine_orch" == "y" ] || [ "$examine_orch" == "Y" ]; then
        echo -e "\n${BLUE}Contents of recommendationOrchestrator.js:${NC}"
        cat "$ORCHESTRATOR_PATH"
    fi
else
    echo -e "\n${RED}❌ Recommendation orchestrator file not found${NC}"
    echo -e "${YELLOW}Creating a basic placeholder orchestrator...${NC}"

    # Create directory if it doesn't exist
    mkdir -p "src/services"

    # Create basic orchestrator file
    cat >"$ORCHESTRATOR_PATH" <<'EOF'
/**
 * Recommendation Orchestrator Service
 *
 * Coordinates the process of generating travel recommendations 
 * based on forex rates and flight data
 */

import { getLogger } from "../utils/logger.js";

const logger = getLogger("recommendation-orchestrator");

/**
 * Generate travel recommendations based on forex data and flight information
 * @param {Object} params - Parameters for recommendation generation
 * @param {String} params.baseCurrency - Base currency code
 * @param {String} params.departureAirport - Departure airport code
 * @param {String} params.outboundDate - Optional outbound date
 * @param {String} params.returnDate - Optional return date
 * @param {String} params.apiKey - Optional API key
 * @param {Object} params.db - MongoDB database instance
 * @returns {Promise<Object>} - Recommendations
 */
export async function generateRecommendations(params) {
  try {
    logger.info(`Generating recommendations for ${params.departureAirport}`);
    
    const { baseCurrency, departureAirport, outboundDate, returnDate, db } = params;
    
    if (!db) {
      throw new Error("Database connection required");
    }
    
    // For demo purposes, return mock recommendations
    const recommendations = {
      recommendations: [
        {
          destination: "CDG",
          destination_name: "Paris, France",
          exchange_rate: 0.92,
          flight_info: {
            price_range: "$500-$700",
            airlines: ["Air France", "Delta"]
          },
          score: 85
        },
        {
          destination: "LHR",
          destination_name: "London, UK",
          exchange_rate: 0.78,
          flight_info: {
            price_range: "$600-$800",
            airlines: ["British Airways", "American"]
          },
          score: 82
        },
        {
          destination: "NRT",
          destination_name: "Tokyo, Japan",
          exchange_rate: 150.25,
          flight_info: {
            price_range: "$900-$1,200",
            airlines: ["JAL", "ANA", "United"]
          },
          score: 79
        }
      ],
      metadata: {
        departure_airport: departureAirport,
        base_currency: baseCurrency,
        generated_at: new Date().toISOString(),
        result_count: 3
      }
    };
    
    logger.info(`Generated ${recommendations.recommendations.length} recommendations`);
    return recommendations;
  } catch (error) {
    logger.error(`Error generating recommendations: ${error.message}`);
    throw error;
  }
}

/**
 * Save a user's recommendation to the database
 * @param {String} userId - User ID
 * @param {Object} recommendation - Recommendation data
 * @param {Object} db - MongoDB database instance
 * @returns {Promise<Object>} - Saved recommendation
 */
export async function saveUserRecommendation(userId, recommendation, db) {
  try {
    if (!db) {
      throw new Error("Database connection required");
    }
    
    const userRecommendation = {
      user_id: userId,
      recommendation,
      created_at: new Date(),
    };
    
    await db.collection("user_recommendations").insertOne(userRecommendation);
    
    logger.info(`Saved recommendation for user ${userId}`);
    return userRecommendation;
  } catch (error) {
    logger.error(`Error saving recommendation: ${error.message}`);
    throw error;
  }
}
EOF

    echo -e "${GREEN}✅ Created basic recommendation orchestrator${NC}"
fi

# Check cache service
CACHE_SERVICE_PATH="src/services/cacheService.js"

if [ -f "$CACHE_SERVICE_PATH" ]; then
    echo -e "\n${YELLOW}Checking cache service...${NC}"
    grep -n "getCachedRecommendations\|cacheRecommendations" "$CACHE_SERVICE_PATH"
else
    echo -e "\n${RED}❌ Cache service file not found${NC}"
    echo -e "${YELLOW}Creating a basic cache service...${NC}"

    # Create directory if it doesn't exist
    mkdir -p "src/services"

    # Create basic cache service
    cat >"$CACHE_SERVICE_PATH" <<'EOF'
/**
 * Cache Service
 *
 * Provides caching functionality for forex data, flights, and recommendations
 */

import { getLogger } from "../utils/logger.js";
import { connectToDatabase } from "../db/mongodb-vercel.js";

const logger = getLogger("cache-service");

/**
 * Get cached recommendations
 * @param {String} key - Cache key
 * @returns {Promise<Object|null>} - Cached recommendations or null
 */
export async function getCachedRecommendations(key) {
  try {
    const { db } = await connectToDatabase();
    
    // Look for cached data
    const cachedItem = await db
      .collection("recommendations_cache")
      .findOne({ key });
    
    if (!cachedItem) {
      return null;
    }
    
    // Check if the cache is still valid (less than 6 hours old)
    const cacheAge = new Date() - new Date(cachedItem.created_at);
    const cacheTTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    
    if (cacheAge > cacheTTL) {
      logger.info(`Cache expired for key: ${key}`);
      return null;
    }
    
    logger.info(`Cache hit for key: ${key}`);
    return cachedItem;
  } catch (error) {
    logger.error(`Error getting cached recommendations: ${error.message}`);
    return null; // Continue app flow even if cache fails
  }
}

/**
 * Cache recommendations
 * @param {String} key - Cache key
 * @param {Object} recommendations - Recommendations to cache
 * @returns {Promise<void>}
 */
export async function cacheRecommendations(key, recommendations) {
  try {
    const { db } = await connectToDatabase();
    
    // Save to cache
    await db.collection("recommendations_cache").updateOne(
      { key },
      {
        $set: {
          key,
          recommendations,
          created_at: new Date(),
        },
      },
      { upsert: true }
    );
    
    logger.info(`Cached recommendations for key: ${key}`);
  } catch (error) {
    logger.error(`Error caching recommendations: ${error.message}`);
    // Do not throw, allow the application to continue
  }
}

// Export other caching functions as needed
export default {
  getCachedRecommendations,
  cacheRecommendations,
};
EOF

    echo -e "${GREEN}✅ Created basic cache service${NC}"
fi

echo -e "\n${GREEN}All fixes have been applied!${NC}"

# Ask about deploying
echo -e "\n${YELLOW}After making these fixes, you should deploy the changes.${NC}"
read -p "Deploy changes to Vercel now? (y/n): " deploy_answer

if [[ $deploy_answer == "y" || $deploy_answer == "Y" ]]; then
    echo -e "\n${BLUE}Deploying changes to Vercel...${NC}"
    # Login to Vercel (will be skipped if already logged in)
    vercel whoami || vercel login

    # Deploy to production
    vercel --prod

    echo -e "\n${GREEN}Deployment process completed!${NC}"
    echo -e "${YELLOW}It may take a few minutes for the changes to propagate.${NC}"
    echo -e "${YELLOW}After deployment, run ./test-api-endpoints.sh to verify API is working correctly.${NC}"
else
    echo -e "\n${YELLOW}No deployment initiated. Run ./deploy-api-cors-fix.sh manually when ready.${NC}"
fi
