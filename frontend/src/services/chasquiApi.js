/**
 * Consolidated API Service for ChasquiFX
 * Handles all API communication with the backend
 */

import axios from "axios";

// Define the API endpoint with fallback options
// Use environment variable if available, fallback to Vercel deployment, finally use local development server
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://chasquifx-api.vercel.app" ||
  "http://localhost:3001";

// Helper function to get API keys from localStorage
const getApiKeys = () => {
  try {
    const keys = localStorage.getItem("chasquiFxApiKeys");
    return keys
      ? JSON.parse(keys)
      : { serpApi: "", exchangeApi: "", searchApi: "" };
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
    // Add authorization token if available
    const token = localStorage.getItem("supabaseToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add API keys as headers if available
    const apiKeys = getApiKeys();
    if (apiKeys.serpApi) {
      config.headers["X-Serpapi-Key"] = apiKeys.serpApi;
    }
    if (apiKeys.searchApi) {
      config.headers["X-Search-Api-Key"] = apiKeys.searchApi;
    }
    if (apiKeys.exchangeApi) {
      config.headers["X-Exchange-Api-Key"] = apiKeys.exchangeApi;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Format the error details
    const errorDetails = {
      message: error.message || 'Unknown error occurred',
      status: error.response?.status || 0,
      data: error.response?.data || null,
    };

    // Log the error
    console.error('API Error:', errorDetails);      // Handle specific error codes
    switch (errorDetails.status) {
      case 401:
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem("supabaseToken");
        window.location.href = "/login";
        break;
      
      case 403:
        // Forbidden - likely an API key issue
        console.error('API Key Issue: Access forbidden', errorDetails);
        // Could dispatch an event or update a global state
        document.dispatchEvent(new CustomEvent('chasquifx:api-key-error'));
        break;
      
      case 429:
        // Too many requests - API rate limit
        console.error('API Rate Limit Exceeded', errorDetails);
        document.dispatchEvent(new CustomEvent('chasquifx:api-limit-exceeded'));
        break;
      
      default:
        // For all other errors, dispatch a general error event
        document.dispatchEvent(new CustomEvent('chasquifx:api-error', { 
          detail: errorDetails 
        }));
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
      const response = await apiClient.get("/health", { timeout: 2000 });
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
      // Try multiple endpoints in sequence
      const endpoints = [
        `/api/v2/forex/status`, // V2 API preferred
        `/api/v1/forex/status`, // V1 API fallback
        `/health`, // Basic health check
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await apiClient.get(endpoint, { timeout: 3000 });

          if (response.status === 200) {
            if (endpoint === "/health") {
              // Just return a basic healthy status for health endpoint
              return { status: "healthy", message: "Basic connectivity OK" };
            }

            // For forex status, check for quota_exceeded flag
            if (
              (endpoint === "/api/v2/forex/status" ||
                endpoint === "/api/v1/forex/status") &&
              response.data.quota_exceeded
            ) {
              return {
                status: "limited",
                message:
                  response.data.quota_message || "API quota limit exceeded",
                quotaExceeded: true,
                ...response.data,
              };
            }

            return response.data;
          }
        } catch (endpointError) {
          // Continue to next endpoint
          console.log(`Endpoint ${endpoint} failed, trying next option...`);
        }
      }

      // If we get here, all endpoints failed
      throw new Error("All API endpoints unreachable");
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
      const response = await apiClient.get("/api/db-status");
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
   * @param {String} toCurrency - Target currency code (optional)
   * @returns {Promise<Object>} - Exchange rate data
   */
  getExchangeRates: async (fromCurrency, toCurrency = null) => {
    try {
      const params = { from_currency: fromCurrency };
      if (toCurrency) params.to_currency = toCurrency;

      // Try V2 API first, fall back to V1
      try {
        const response = await apiClient.get("/api/v2/forex/rates", {
          params,
        });
        return response.data;
      } catch (v2Error) {
        console.warn("V2 API failed, trying V1:", v2Error);
        const response = await apiClient.get("/api/v1/forex/rates", {
          params,
        });
        return response.data;
      }
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
      // Try V2 API first, fall back to V1
      try {
        const response = await apiClient.get("/api/v2/forex/status");
        return response.data;
      } catch (v2Error) {
        console.warn("V2 API failed, trying V1:", v2Error);
        const response = await apiClient.get("/api/v1/forex/status");
        return response.data;
      }
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
   * @param {Object} params - Search parameters
   * @param {String} params.baseCurrency - Base currency code
   * @param {String} params.departureAirport - Departure airport code
   * @param {String} params.outboundDate - Optional outbound date
   * @param {String} params.returnDate - Optional return date
   * @returns {Promise<Object>} - Recommendations
   */
  getRecommendations: async (params) => {
    try {
      // Format parameters to match API expectations
      const queryParams = {
        base_currency: params.baseCurrency,
        departure_airport: params.departureAirport,
      };

      if (params.outboundDate) queryParams.outbound_date = params.outboundDate;
      if (params.returnDate) queryParams.return_date = params.returnDate;

      // Try V2 API first, fall back to V1
      try {
        const response = await apiClient.get("/api/v2/recommendations", {
          params: queryParams,
          timeout: 40000, // 40 seconds timeout for recommendation processing
        });
        return response.data;
      } catch (v2Error) {
        console.warn("V2 API failed, trying V1:", v2Error);
        const response = await apiClient.get("/api/v1/recommendations", {
          params: queryParams,
          timeout: 40000,
        });
        return response.data;
      }
    } catch (error) {
      console.error("Failed to get recommendations:", error);
      throw error;
    }
  },

  /**
   * Get user recommendation history
   * @param {Number} limit - Results per page
   * @param {Number} offset - Pagination offset
   * @returns {Promise<Object>} - User recommendation history
   */
  getUserHistory: async (limit = 10, offset = 0) => {
    try {
      const response = await apiClient.get("/api/v2/recommendations/history", {
        params: { limit, offset },
      });
      return response.data;
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
      const response = await apiClient.post("/api/v2/recommendations/save", {
        recommendation,
        notes,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to save recommendation:", error);
      throw error;
    }
  },
};

/**
 * Flight API Services
 */
export const flightService = {
  /**
   * Get flight routes
   * @param {String} departureAirport - Departure airport code
   * @param {String} destinationAirport - Destination airport code
   * @param {String} outboundDate - Optional outbound date
   * @param {String} returnDate - Optional return date
   * @returns {Promise<Object>} - Flight route data
   */
  getRoutes: async (
    departureAirport,
    destinationAirport,
    outboundDate = null,
    returnDate = null
  ) => {
    try {
      const params = {};
      if (outboundDate) params.outbound_date = outboundDate;
      if (returnDate) params.return_date = returnDate;

      const response = await apiClient.get(
        `/api/v2/flights/routes/${departureAirport}/${destinationAirport}`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get flight routes:", error);
      throw error;
    }
  },

  /**
   * Get flight prices
   * @param {String} departureAirport - Departure airport code
   * @param {String} destinationAirport - Destination airport code
   * @param {String} outboundDate - Outbound date
   * @param {String} returnDate - Optional return date
   * @returns {Promise<Object>} - Flight price data
   */
  getFlightPrices: async (
    departureAirport,
    destinationAirport,
    outboundDate,
    returnDate = null
  ) => {
    try {
      const params = {
        outbound_date: outboundDate,
      };
      if (returnDate) params.return_date = returnDate;

      const response = await apiClient.get(
        `/api/v2/flights/prices/${departureAirport}/${destinationAirport}`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get flight prices:", error);
      throw error;
    }
  },
};

// Export all services
const chasquiApi = {
  systemService,
  forexService,
  recommendationService,
  flightService,
};

export default chasquiApi;
