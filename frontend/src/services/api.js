import axios from "axios";

// API base URL from environment or default to localhost
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3001/api/v1";

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    // Add authorization token if available
    const token = localStorage.getItem("supabaseToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem("supabaseToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

/**
 * Forex API Services
 */
export const forexService = {
  /**
   * Get exchange rates
   * @param {String} fromCurrency - Base currency code
   * @param {String} toCurrency - Target currency code
   * @param {String} apiKey - Optional API key
   * @returns {Promise<Object>} - Exchange rate data
   */
  getExchangeRates: async (fromCurrency, toCurrency, apiKey = null) => {
    const params = { from_currency: fromCurrency, to_currency: toCurrency };
    if (apiKey) params.apiKey = apiKey;

    const response = await apiClient.get("/forex/rates", { params });
    return response.data;
  },

  /**
   * Get forex service status
   * @returns {Promise<Object>} - Service status
   */
  getStatus: async () => {
    const response = await apiClient.get("/forex/status");
    return response.data;
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
   * @param {String} params.apiKey - Optional API key
   * @returns {Promise<Object>} - Recommendations
   */
  getRecommendations: async (params) => {
    const queryParams = {
      base_currency: params.baseCurrency,
      departure_airport: params.departureAirport,
    };

    if (params.outboundDate) queryParams.outbound_date = params.outboundDate;
    if (params.returnDate) queryParams.return_date = params.returnDate;
    if (params.apiKey) queryParams.apiKey = params.apiKey;

    const response = await apiClient.get("/recommendations", {
      params: queryParams,
    });
    return response.data;
  },

  /**
   * Get user recommendation history
   * @param {Number} limit - Results per page
   * @param {Number} offset - Pagination offset
   * @returns {Promise<Object>} - User recommendation history
   */
  getUserHistory: async (limit = 10, offset = 0) => {
    const response = await apiClient.get("/recommendations/history", {
      params: { limit, offset },
    });
    return response.data;
  },

  /**
   * Save recommendation to user history
   * @param {Object} recommendation - Recommendation data
   * @param {String} notes - Optional user notes
   * @returns {Promise<Object>} - Status
   */
  saveRecommendation: async (recommendation, notes = null) => {
    const response = await apiClient.post("/recommendations/save", {
      recommendation,
      notes,
    });
    return response.data;
  },
};

const apiServices = { forexService, recommendationService };
export default apiServices;
