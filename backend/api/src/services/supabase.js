import { createClient } from "@supabase/supabase-js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("supabase-service");

// Initialize Supabase client
export const supabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * Get user by ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - User data
 */
export async function getUserById(userId) {
  try {
    const { data, error } = await supabaseClient
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error(`Error fetching user data: ${error.message}`);
    throw error;
  }
}

/**
 * Get user's API keys
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - API keys
 */
export async function getUserApiKeys(userId) {
  try {
    const { data, error } = await supabaseClient
      .from("api_keys")
      .select("service, key")
      .eq("user_id", userId);

    if (error) throw error;

    // Convert to map of service => key
    const apiKeys = data.reduce((acc, item) => {
      acc[item.service] = item.key;
      return acc;
    }, {});

    return apiKeys;
  } catch (error) {
    logger.error(`Error fetching API keys: ${error.message}`);
    throw error;
  }
}

/**
 * Log API usage
 * @param {String} userId - User ID (optional)
 * @param {String} service - Service name (e.g., 'serpapi', 'forex')
 * @param {String} endpoint - Endpoint called
 * @param {Object} params - Request parameters
 * @returns {Promise<void>}
 */
export async function logApiUsage(userId, service, endpoint, params) {
  try {
    const { error } = await supabaseClient.from("api_usage").insert([
      {
        user_id: userId,
        service,
        endpoint,
        params,
      },
    ]);

    if (error) throw error;
  } catch (error) {
    logger.error(`Error logging API usage: ${error.message}`);
    // Non-blocking error - don't throw
  }
}
