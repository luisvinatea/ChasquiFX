/**
 * Consolidated API Service for ChasquiFX
 * Handles all API communication with the backend
 */

import axios from "axios";

// Define the API base URL with Next.js API routes
// In development, uses relative path
// In production, uses absolute path to the domain
const API_BASE_URL = "/api";

// Helper function to get API keys from localStorage
const getApiKeys = () => {
  try {
    // Use browser localStorage only in client-side code
    if (typeof window !== "undefined") {
      const keys = localStorage.getItem("chasquiFxApiKeys");
      return keys
        ? JSON.parse(keys)
        : { serpApi: "", exchangeApi: "", searchApi: "" };
    }
    return { serpApi: "", exchangeApi: "", searchApi: "" };
  } catch (error) {
    console.error("Failed to parse API keys from localStorage:", error);
    return { serpApi: "", exchangeApi: "", searchApi: "" };
  }
};

// Create axios instance with interceptors
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding auth token and API keys
apiClient.interceptors.request.use(
  (config) => {
    // Browser-only code for adding tokens
    if (typeof window !== "undefined") {
      // Add authorization token if available
      const token = localStorage.getItem("supabaseToken");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }

      // Add API keys if available
      const apiKeys = getApiKeys();
      if (apiKeys.serpApi) {
        config.headers["X-Serpapi-Key"] = apiKeys.serpApi;
      }
      if (apiKeys.exchangeApi) {
        config.headers["X-Exchange-Api-Key"] = apiKeys.exchangeApi;
      }
      if (apiKeys.searchApi) {
        config.headers["X-Search-Api-Key"] = apiKeys.searchApi;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Format the error details
    const errorDetails = {
      message: error.message || "Unknown error occurred",
      status: error.response?.status || 0,
      data: error.response?.data || null,
    };

    // Log the error
    console.error("API Error:", errorDetails);

    // Handle specific error codes - browser-side only
    if (typeof window !== "undefined") {
      switch (errorDetails.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem("supabaseToken");
          window.location.href = "/login";
          break;

        case 403:
          // Forbidden - likely an API key issue
          console.error("API Key Issue: Access forbidden", errorDetails);
          // Could dispatch an event or update a global state
          document.dispatchEvent(new CustomEvent("chasquifx:api-key-error"));
          break;

        case 429:
          // Too many requests - API rate limit
          console.error("API Rate Limit Exceeded", errorDetails);
          document.dispatchEvent(
            new CustomEvent("chasquifx:api-limit-exceeded")
          );
          break;

        default:
          // For all other errors, dispatch a general error event
          document.dispatchEvent(
            new CustomEvent("chasquifx:api-error", {
              detail: errorDetails,
            })
          );
      }
    }

    return Promise.reject(errorDetails);
  }
);

/**
 * System API Services
 */
export const systemService = {
  /**
   * Check if the API server is running
   * @returns {Promise<Boolean>} - True if API is accessible
   */
  checkApiStatus: async () => {
    try {
      const response = await apiClient.get("/health", {
        timeout: 2000,
        params: { _t: Date.now() }, // Cache-busting parameter
      });
      return response.status === 200;
    } catch (error) {
      console.error("API connection error:", error);
      return false;
    }
  },

  /**
   * Get detailed API server status
   * @returns {Promise<Object>} - Service status details
   */
  getStatus: async () => {
    try {
      const response = await apiClient.get("/health", {
        params: { _t: Date.now() }, // Cache-busting parameter
      });
      return response.data;
    } catch (error) {
      console.error("API Status error:", error);
      return { status: "error", message: error.message };
    }
  },

  /**
   * Get database status
   * @returns {Promise<Object>} - Database connection status
   */
  getDatabaseStatus: async () => {
    try {
      const response = await apiClient.get("/db-status");
      return response.data;
    } catch (error) {
      console.error("Database status check error:", error);
      return { status: "error", message: error.message };
    }
  },
};

/**
 * Forex API Services
 */
export const forexService = {
  /**
   * Get exchange rates
   * @param {String} fromCurrency - Base currency code
   * @param {String} toCurrency - Target currency code
   * @returns {Promise<Object>} - Exchange rate data
   */
  getExchangeRates: async (fromCurrency, toCurrency) => {
    try {
      const response = await apiClient.get("/forex", {
        params: {
          rates: true,
          from_currency: fromCurrency,
          to_currency: toCurrency,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to get exchange rates:", error);
      throw error;
    }
  },

  /**
   * Get forex service status
   * @returns {Promise<Object>} - Service status
   */
  getStatus: async () => {
    try {
      const response = await apiClient.get("/forex");
      return response.data;
    } catch (error) {
      console.error("Failed to get forex status:", error);
      throw error;
    }
  },
};

/**
 * Recommendations API Services
 */
export const recommendationService = {
  /**
   * Get travel recommendations
   * @param {String} departureAirport - Departure airport code
   * @returns {Promise<Array>} - Recommendations
   */
  getRecommendations: async (departureAirport) => {
    try {
      // In the migration phase, we'll use mock data
      // In the future, this will connect to the actual API endpoint
      const mockRecommendations = [
        {
          id: 1,
          destination: "MEX",
          destinationCity: "Mexico City",
          price: 350,
          currency: "USD",
          exchangeRate: 17.2,
          localCost: 6020,
          date: new Date().toISOString(),
        },
        {
          id: 2,
          destination: "BOG",
          destinationCity: "Bogota",
          price: 420,
          currency: "USD",
          exchangeRate: 3800,
          localCost: 1596000,
          date: new Date().toISOString(),
        },
        {
          id: 3,
          destination: "LIM",
          destinationCity: "Lima",
          price: 380,
          currency: "USD",
          exchangeRate: 3.6,
          localCost: 1368,
          date: new Date().toISOString(),
        },
      ];

      return mockRecommendations;
    } catch (error) {
      console.error("Flight Recommendation Error:", error);
      throw error;
    }
  },

  /**
   * Get user recommendation history
   * @param {String} userId - User ID
   * @returns {Promise<Array>} - User recommendation history
   */
  getUserHistory: async (userId) => {
    try {
      // In the migration phase, we'll return empty results
      return [];
    } catch (error) {
      console.error("Failed to get recommendation history:", error);
      throw error;
    }
  },

  /**
   * Save recommendation to user history
   * @param {Object} recommendation - Recommendation data
   * @param {String} notes - Optional user notes
   * @returns {Promise<Object>} - Status
   */
  saveRecommendation: async (recommendation, notes = null) => {
    try {
      // In migration phase, just log the save action
      console.log("Saving recommendation:", recommendation);
      return { status: "success" };
    } catch (error) {
      console.error("Failed to save recommendation:", error);
      throw error;
    }
  },
};

/**
 * User Service
 */
export const userService = {
  /**
   * Save user search
   * @param {String} userId - User ID
   * @param {String} departureAirport - Departure airport code
   * @param {Array} recommendations - Recommendations results
   * @returns {Promise<Object>} - Status
   */
  saveSearch: async (userId, departureAirport, recommendations) => {
    try {
      // In the migration phase, we'll just log the search
      console.log(`Saved search for user ${userId} from ${departureAirport}`);
      return { status: "success" };
    } catch (error) {
      console.error("Save User Search Error:", error);
      throw error;
    }
  },

  /**
   * Get user's past searches
   * @param {String} userId - User ID
   * @returns {Promise<Array>} - Past searches
   */
  getPastSearches: async (userId) => {
    try {
      // In the migration phase, return mock data
      return [];
    } catch (error) {
      console.error("Get User Past Searches Error:", error);
      throw error;
    }
  },
};

// Export all services
const chasquiApi = {
  systemService,
  forexService,
  recommendationService,
  userService,
};

export default chasquiApi;
