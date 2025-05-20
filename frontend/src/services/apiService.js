/**
 * API Service for ChasquiFX
 * Handles all API communication with the backend
 */

import axios from "axios";

// Define the API endpoint with fallback options
// Use environment variable if available, fallback to Vercel deployment, finally use local development server
const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  "https://chasquifx.vercel.app" ||
  "http://localhost:8000";

// Helper function to get API keys from localStorage
const getApiKeys = () => {
  try {
    const keys = localStorage.getItem("chasquiFxApiKeys");
    return keys ? JSON.parse(keys) : { serpApi: "", exchangeApi: "" };
  } catch (error) {
    console.error("Failed to parse API keys from localStorage:", error);
    return { serpApi: "", exchangeApi: "" };
  }
};

// Helper function to get authentication headers
const buildAuthHeaders = () => {
  try {
    const apiKeys = getApiKeys();
    const headers = {};

    if (apiKeys.serpApi) {
      headers["X-Serpapi-Key"] = apiKeys.serpApi;
    }
    if (apiKeys.exchangeApi) {
      headers["X-Exchange-Api-Key"] = apiKeys.exchangeApi;
    }

    return headers;
  } catch (error) {
    console.error("Failed to build auth headers:", error);
    return {};
  }
};

// Helper function for standardized API error handling
const handleApiError = (error) => {
  if (error.response) {
    // The server responded with a status code outside the 2xx range
    const message =
      error.response.data?.message ||
      error.response.data?.error ||
      "API Error";
    const status = error.response.status;
    return { message, status, originalError: error };
  } else if (error.request) {
    // The request was made but no response was received
    return {
      message: "No response from server. Please check your connection.",
      status: 0,
      originalError: error,
    };
  } else {
    // Something happened in setting up the request
    return {
      message: error.message || "Unknown error occurred",
      status: 0,
      originalError: error,
    };
  }
};

// API Service class
class ApiService {
  // Check if the API server is running
  async checkApiStatus() {
    try {
      const response = await axios.get(`${API_BASE_URL}/`, { timeout: 2000 });
      return response.status === 200;
    } catch (error) {
      console.error("API connection error:", error);
      return false;
    }
  }

  // Get API server status
  async getStatus() {
    try {
      // Try multiple endpoints in sequence
      const endpoints = [
        `/api/forex/status`, // Preferred endpoint
        `/health`, // Fallback health check
        `/`, // Base API check
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
            timeout: 3000,
          });

          if (response.status === 200) {
            if (endpoint === "/") {
              // Just return a basic healthy status for root endpoint
              return { status: "healthy", message: "Basic connectivity OK" };
            }

            // For forex status, check for quota_exceeded flag
            if (
              endpoint === "/api/forex/status" &&
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
      return { status: "error" };
    }
  }

  // Get recommendations from API
  async getRecommendations(params) {
    try {
      // Get API keys from localStorage
      const apiKeys = getApiKeys();

      // Add API keys to params if available
      const enhancedParams = { ...params };
      if (apiKeys.serpApi) {
        enhancedParams.serp_api_key = apiKeys.serpApi;
        // Set header with SerpAPI key for backend to use
        axios.defaults.headers.common["X-Serpapi-Key"] = apiKeys.serpApi;
      }
      if (apiKeys.exchangeApi) {
        enhancedParams.exchange_api_key = apiKeys.exchangeApi;
      }

      // Create a progress indicator in the UI
      const response = await axios.get(`${API_BASE_URL}/api/recommendations`, {
        params: enhancedParams,
        timeout: 40000, // 40 seconds timeout
      });

      if (response.status === 200) {
        return response.data;
      } else {
        console.error("API Error:", response.status, response.data);
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (error) {
      console.error("API connection error:", error);
      throw error;
    }
  }

  // Get flight routes
  async getRoutes(startAirport, endAirport) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/routes/${startAirport}/${endAirport}`,
        {
          timeout: 10000,
        }
      );

      if (response.status === 200) {
        return response.data;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Failed to get routes:", error);
      return null;
    }
  }

  // Refresh forex data
  async refreshForexData() {
    try {
      // First check if API is reachable
      const apiStatus = await this.checkApiStatus();
      if (!apiStatus) {
        throw new Error("API server is not reachable");
      }

      const apiKeys = getApiKeys();
      const headers = {};

      if (apiKeys.serpApi) {
        headers["X-Serpapi-Key"] = apiKeys.serpApi;
      } else {
        throw new Error("SerpAPI key is required to refresh forex data");
      }

      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/forex/refresh`,
          {},
          {
            headers,
            timeout: 30000, // 30 seconds timeout as this can take a while
          }
        );

        if (response.status === 200 && response.data.success) {
          return { success: true };
        } else {
          return { success: false, message: "Unknown error" };
        }
      } catch (error) {
        // Check for quota limit error (status code 429)
        if (error.response && error.response.status === 429) {
          return {
            success: false,
            quotaExceeded: true,
            message: error.response.data.detail || "API quota limit exceeded",
          };
        }

        // Other API error
        const errorMessage = error.response?.data?.detail || error.message;
        return {
          success: false,
          message: `Error refreshing data: ${errorMessage}`,
        };
      }
    } catch (error) {
      console.error("Failed to refresh forex data:", error);
      return {
        success: false,
        message: `Connection error: ${error.message}`,
      };
    }
  }

  // Get exchange rate
  async getExchangeRate(baseCurrency, quoteCurrency) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/forex/exchange_rate`,
        {
          params: {
            base_currency: baseCurrency,
            quote_currency: quoteCurrency,
          },
          timeout: 5000,
        }
      );

      if (response.status === 200) {
        return response.data;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Failed to get exchange rate:", error);
      return null;
    }
  }

  // Get available currencies
  async getAvailableCurrencies() {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/forex/available_currencies`
      );

      if (response.status === 200) {
        return response.data;
      } else {
        return ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF"]; // Default currencies
      }
    } catch (error) {
      console.error("Failed to get available currencies:", error);
      return ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF"]; // Default currencies on error
    }
  }

  /**
   * Flight Service API endpoints
   */

  // Get flight service status
  async getFlightServiceStatus() {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v2/flights/status`,
        {
          timeout: 5000,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error getting flight service status:", error);
      throw error;
    }
  }

  // Get flight fare for a specific route and dates
  async getFlightFare(
    departureAirport,
    arrivalAirport,
    outboundDate,
    returnDate,
    currency = "USD"
  ) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v2/flights/fare`, {
        timeout: 10000,
        params: {
          departure_airport: departureAirport,
          arrival_airport: arrivalAirport,
          outbound_date: outboundDate,
          return_date: returnDate,
          currency,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error getting flight fare:", error);
      throw error;
    }
  }

  // Get flight fares for multiple destinations
  async getMultiFlightFares(
    departureAirport,
    arrivalAirports,
    outboundDate,
    returnDate,
    currency = "USD"
  ) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v2/flights/multi-fares`,
        {
          timeout: 10000,
          headers: buildAuthHeaders(),
          params: {
            departure_airport: departureAirport,
            arrival_airports: Array.isArray(arrivalAirports)
              ? arrivalAirports.join(",")
              : arrivalAirports,
            outbound_date: outboundDate,
            return_date: returnDate,
            currency,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error getting multiple flight fares:", error);
      throw handleApiError(error);
    }
  }

  // Get routes from a departure airport
  async getRoutesFromAirport(departureAirport) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v2/flights/routes/${departureAirport}`,
        {
          timeout: 8000,
          headers: buildAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error getting routes from ${departureAirport}:`, error);
      throw handleApiError(error);
    }
  }

  // Get popular flight routes
  async getPopularRoutes(limit = 10) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v2/flights/routes/popular`,
        {
          timeout: 8000,
          headers: buildAuthHeaders(),
          params: { limit },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error getting popular routes:", error);
      throw handleApiError(error);
    }
  }

  // Get cheapest routes from a departure airport
  async getCheapestRoutes(
    departureAirport,
    outboundDate,
    returnDate,
    currency = "USD",
    limit = 5
  ) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v2/flights/cheapest/${departureAirport}`,
        {
          timeout: 10000,
          headers: buildAuthHeaders(),
          params: {
            outbound_date: outboundDate,
            return_date: returnDate,
            currency,
            limit,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error getting cheapest routes from ${departureAirport}:`,
        error
      );
      throw handleApiError(error);
    }
  }

  // Get eco-friendly routes from a departure airport
  async getEcoFriendlyRoutes(departureAirport, limit = 5) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v2/flights/eco-friendly/${departureAirport}`,
        {
          timeout: 10000,
          params: { limit },
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error getting eco-friendly routes from ${departureAirport}:`,
        error
      );
      throw error;
    }
  }

  // Get emissions data for a specific route
  async getRouteEmissions(departureAirport, arrivalAirport) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v2/flights/emissions/${departureAirport}/${arrivalAirport}`,
        {
          timeout: 5000,
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error getting emissions for route ${departureAirport}-${arrivalAirport}:`,
        error
      );
      throw error;
    }
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();
