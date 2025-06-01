// DEPRECATED: Compatibility layer for transition from Supabase to MongoDB
// This file provides stub implementations for legacy Supabase functions
// TODO: Migrate all usage to MongoDB client

import { mongoDbClient } from "./mongoDbClient.js";

// Mock session structure for compatibility
const mockSession = {
  user: {
    id: "mock-user-id",
    email: "user@example.com",
    user_metadata: {},
  },
  access_token: "mock-token",
  refresh_token: "mock-refresh-token",
};

export async function getSession() {
  // Return mock session for now - replace with actual auth logic
  console.warn(
    "getSession() is deprecated. Please migrate to MongoDB authentication."
  );
  return { data: { session: mockSession }, error: null };
}

export async function signOutUser() {
  // Stub implementation for sign out
  console.warn(
    "signOutUser() is deprecated. Please migrate to MongoDB authentication."
  );
  return { error: null };
}

export async function getUserRecommendations(userId) {
  // Stub implementation - should be replaced with MongoDB queries
  console.warn(
    "getUserRecommendations() is deprecated. Please migrate to MongoDB queries."
  );

  try {
    // Return empty array for now - replace with actual MongoDB query
    return { data: [], error: null };
  } catch (error) {
    console.error("Error in getUserRecommendations:", error);
    return { data: null, error: error.message };
  }
}

// Export any other functions that might be needed
export default {
  getSession,
  signOutUser,
  getUserRecommendations,
};
