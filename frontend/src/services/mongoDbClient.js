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
