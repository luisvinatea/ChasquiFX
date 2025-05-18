/**
 * API Service for ChasquiFX
 * Handles all API communication with the backend
 */

import axios from "axios";

// Define the API endpoint (assuming local development server)
const API_BASE_URL = "http://localhost:8000";

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
      // Try the forex status endpoint first
      try {
        const response = await axios.get(`${API_BASE_URL}/api/forex/status`, {
          timeout: 2000,
        });
        return response.data;
      } catch (statusError) {
        // If forex status endpoint fails, fall back to checking API root
        const isAlive = await this.checkApiStatus();
        if (isAlive) {
          // API is alive but status endpoint might not exist
          return { status: "healthy" };
        }
        throw statusError; // Rethrow if API root is also unreachable
      }
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
      const apiKeys = getApiKeys();
      const headers = {};

      if (apiKeys.serpApi) {
        headers["X-Serpapi-Key"] = apiKeys.serpApi;
      } else {
        throw new Error("SerpAPI key is required to refresh forex data");
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/forex/refresh`,
        {},
        {
          headers,
          timeout: 30000, // 30 seconds timeout as this can take a while
        }
      );

      return response.data.success;
    } catch (error) {
      console.error("Failed to refresh forex data:", error);
      throw error;
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
}

// Create and export a singleton instance
export const apiService = new ApiService();
