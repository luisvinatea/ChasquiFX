// Supabase client for frontend
import { createClient } from "@supabase/supabase-js";

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Sign up a new user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise} - Supabase sign up result
 */
export const signUpUser = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

/**
 * Sign in a user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise} - Supabase sign in result
 */
export const signInUser = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

/**
 * Sign out the current user
 * @returns {Promise} - Supabase sign out result
 */
export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Get the current session
 * @returns {Promise} - Supabase session
 */
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data;
};

/**
 * Store the user's SerpAPI key
 * @param {string} userId - User's ID
 * @param {string} apiKey - SerpAPI key
 * @returns {Promise} - Supabase insert result
 */
export const storeUserApiKey = async (userId, apiKey) => {
  const { data, error } = await supabase
    .from("user_api_keys")
    .upsert({ user_id: userId, serpapi_key: apiKey })
    .select();

  if (error) throw error;
  return data;
};

/**
 * Get the user's SerpAPI key
 * @param {string} userId - User's ID
 * @returns {Promise} - Supabase select result
 */
export const getUserApiKey = async (userId) => {
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("serpapi_key")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No key found
      return null;
    }
    throw error;
  }

  return data?.serpapi_key;
};

/**
 * Get the user's past recommendations
 * @param {string} userId - User's ID
 * @param {number} limit - Maximum number of recommendations to return
 * @returns {Promise} - Supabase select result
 */
export const getUserRecommendations = async (userId, limit = 10) => {
  const { data, error } = await supabase
    .from("user_recommendations")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};
