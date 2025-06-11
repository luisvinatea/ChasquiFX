/**
 * MongoDB Client Service
 * Provides authentication and API key management functions
 */

import axios from "axios";

// API base URL - Using Next.js environment variables
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.origin) ||
  "https://chasquifx-web.vercel.app";

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
 * Sign up user with email, password, and name
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User name (optional)
 * @returns {Promise} - Auth response
 */
export const signUpUser = async (email, password, name) => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/signup`, {
      email,
      password,
      name,
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
    console.error("Registration error:", error);
    return {
      user: null,
      session: null,
      error: error.response?.data?.message || "Failed to sign up",
    };
  }
};

/**
 * Sign out the current user
 * @returns {Promise} - Sign out response
 */
export const signOutUser = async () => {
  try {
    const token = localStorage.getItem("authToken");

    if (token) {
      // Call the logout API endpoint
      await axios.post(`${API_URL}/api/auth/logout`, { token });
    }

    // Clear local storage
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");

    return { error: null };
  } catch (error) {
    console.error("Sign out error:", error);
    // Even if API call fails, clear local storage
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    return {
      error: "Failed to sign out properly, but local session cleared",
    };
  }
};

/**
 * Verify current user's authentication token
 * @returns {Promise} - Verification response
 */
export const verifyToken = async () => {
  try {
    const token = localStorage.getItem("authToken");

    if (!token) {
      return { user: null, valid: false, error: "No token found" };
    }

    const response = await axios.get(`${API_URL}/api/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Update user info in localStorage
    if (response.data.user) {
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }

    return {
      user: response.data.user,
      valid: response.data.valid,
      error: null,
    };
  } catch (error) {
    console.error("Token verification error:", error);

    // If token is invalid, clear local storage
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    }

    return {
      user: null,
      valid: false,
      error: error.response?.data?.message || "Token verification failed",
    };
  }
};

/**
 * Get current user from localStorage
 * @returns {Object|null} - User object or null
 */
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean} - Authentication status
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem("authToken");
  const user = getCurrentUser();
  return !!(token && user);
};

/**
 * Store API key for the user
 * @param {string} keyType - Type of API key (e.g., 'serpapi', 'searchapi')
 * @param {string} apiKey - The API key to store
 * @returns {Promise} - Storage response
 */
export const storeUserApiKey = async (keyType, apiKey) => {
  try {
    const token = localStorage.getItem("authToken");

    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await axios.post(
      `${API_URL}/api/user/api-keys`,
      { keyType, apiKey },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      success: true,
      message: response.data.message,
      error: null,
    };
  } catch (error) {
    console.error("Store API Key Error:", error);
    return {
      success: false,
      message: null,
      error: error.response?.data?.message || "Failed to store API key",
    };
  }
};

/**
 * Get user's stored API keys (returns which keys exist, not the actual keys)
 * @returns {Promise} - API keys info response
 */
export const getUserApiKeys = async () => {
  try {
    const token = localStorage.getItem("authToken");

    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await axios.get(`${API_URL}/api/user/api-keys`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      apiKeys: response.data.apiKeys,
      error: null,
    };
  } catch (error) {
    console.error("Get API Keys Error:", error);
    return {
      apiKeys: {},
      error: error.response?.data?.message || "Failed to get API keys",
    };
  }
};

/**
 * Remove user's API key
 * @param {string} keyType - Type of API key to remove
 * @returns {Promise} - Removal response
 */
export const removeUserApiKey = async (keyType) => {
  try {
    const token = localStorage.getItem("authToken");

    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await axios.delete(
      `${API_URL}/api/user/api-keys?keyType=${keyType}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      success: true,
      message: response.data.message,
      error: null,
    };
  } catch (error) {
    console.error("Remove API Key Error:", error);
    return {
      success: false,
      message: null,
      error: error.response?.data?.message || "Failed to remove API key",
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
