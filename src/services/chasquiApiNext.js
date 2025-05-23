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

// API Health Service
const healthService = {
  checkApiStatus: async () => {
    try {
      const response = await apiClient.get("/health");
      return response.data;
    } catch (error) {
      console.error("API Health Check Error:", error);
      throw error;
    }
  },

  checkDatabaseStatus: async () => {
    try {
      const response = await apiClient.get("/db-status");
      return response.data;
    } catch (error) {
      console.error("Database Status Check Error:", error);
      throw error;
    }
  },
};

// Forex Service
const forexService = {
  getExchangeRate: async (fromCurrency, toCurrency) => {
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
      console.error("Forex Exchange Rate Error:", error);
      throw error;
    }
  },

  getForexStatus: async () => {
    try {
      const response = await apiClient.get("/forex");
      return response.data;
    } catch (error) {
      console.error("Forex Status Error:", error);
      throw error;
    }
  },
};

// Flight Recommendation Service
const recommendationService = {
  getRecommendations: async (departureAirport) => {
    try {
      // In the migration phase, we'll keep the implementation simple
      // This would be connected to the actual flight recommendation logic
      // available through the API route
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
};

// User Service
const userService = {
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
  healthService,
  forexService,
  recommendationService,
  userService,
};

export default chasquiApi;
