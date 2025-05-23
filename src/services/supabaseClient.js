/* eslint-disable no-unused-vars */
/**
 * DEPRECATED: This is a compatibility layer for transitioning from Supabase to MongoDB
 * This file redirects all Supabase client calls to the equivalent MongoDB client functions
 */

import {
  signInUser,
  storeUserApiKey,
  getUserApiKey as getMongoUserApiKey,
} from "./mongoDbClient.js";

/**
 * Gets the current user session
 * @returns {Object} Session data or null
 */
export const getSession = async () => {
  const authToken = localStorage.getItem("authToken");
  const userStr = localStorage.getItem("user");

  if (!authToken || !userStr) {
    return { session: null };
  }

  try {
    const user = JSON.parse(userStr);
    return {
      session: {
        user,
      },
    };
  } catch (error) {
    console.error("Error parsing user from localStorage:", error);
    return { session: null };
  }
};

/**
 * Signs out the current user
 * @returns {Object} Success response
 */
export const signOutUser = async () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
  return { error: null };
};

/**
 * Gets user recommendations history from MongoDB
 * @param {string} userId - User ID to fetch recommendations for
 * @returns {Array} Array of recommendations
 */
export const getUserRecommendations = async (userId) => {
  // This would normally make an API call to MongoDB
  // For now returning an empty array or mock data
  return []; // Replace with actual MongoDB API call when available
};
