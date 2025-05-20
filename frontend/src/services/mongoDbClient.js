/**
 * MongoDB Client Service
 * Provides authentication and API key management functions
 */

import axios from "axios";

// API base URL
const API_URL =
  process.env.REACT_APP_API_URL || "https://chasquifx-api.vercel.app";

/**
 * Sign in user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} - Auth response
 */
export const signInUser = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/signin`, {
      email,
      password,
    });

    // Store the auth token in localStorage for later use
    if (response.data.token) {
      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }

    return {
      user: response.data.user,
      session: response.data.session,
      error: null,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      user: null,
      session: null,
      error: error.response?.data?.message || "Failed to sign in",
    };
  }
};

/**
 * Sign out the current user
 * @returns {Promise} - Sign out response
 */
export const signOutUser = async () => {
  try {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    return { error: null };
  } catch (error) {
    console.error("Sign out error:", error);
    return {
      error: "Failed to sign out",
    };
  }
};

/**
 * Store API key for the user
 * @param {string} userId - User ID
 * @param {string} keyType - Type of API key (e.g., 'serpapi', 'searchapi')
 * @param {string} apiKey - The API key to store
 * @returns {Promise} - Storage response
 */
export const storeUserApiKey = async (userId, keyType, apiKey) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/auth/store-key`,
      {
        userId,
        keyType,
        apiKey,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      }
    );
    return { error: null, data: response.data };
  } catch (error) {
    console.error("Error storing API key:", error);
    return {
      error: error.response?.data?.message || "Failed to store API key",
      data: null,
    };
  }
};

/**
 * Get API key for the user
 * @param {string} userId - User ID
 * @param {string} keyType - Type of API key (e.g., 'serpapi', 'searchapi')
 * @returns {Promise} - Retrieved API key
 */
export const getUserApiKey = async (userId, keyType) => {
  try {
    const response = await axios.get(`${API_URL}/api/auth/get-key`, {
      params: { userId, keyType },
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });
    return { error: null, data: response.data };
  } catch (error) {
    console.error("Error retrieving API key:", error);
    return {
      error: error.response?.data?.message || "Failed to retrieve API key",
      data: null,
    };
  }
};

/**
 * Get user recommendations history
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of user recommendations
 */
export const getUserRecommendations = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/api/user/recommendations`, {
      params: { userId },
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });
    return response.data.recommendations || [];
  } catch (error) {
    console.error("Error retrieving user recommendations:", error);
    return [];
  }
};
