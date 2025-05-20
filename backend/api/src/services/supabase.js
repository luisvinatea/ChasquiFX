/**
 * DEPRECATED: Supabase Client Service
 *
 * This is a placeholder file for backward compatibility.
 * The application is transitioning to MongoDB for data storage.
 */

import { getLogger } from "../utils/logger.js";

const logger = getLogger("supabase-service");

logger.warn(
  "DEPRECATED: Using Supabase client service which is scheduled for removal"
);

// Mock Supabase client with MongoDB-compatible methods
export const supabaseClient = {
  auth: {
    getUser: async () => {
      logger.warn(
        "Deprecated auth.getUser called - MongoDB should be used instead"
      );
      return {
        data: { user: null },
        error: "Auth service migrated to MongoDB",
      };
    },
  },
  from: (table) => ({
    select: () => ({
      eq: () => ({
        single: async () => {
          logger.warn(
            `Deprecated query on ${table} - MongoDB should be used instead`
          );
          return { data: null };
        },
      }),
      order: () => ({
        limit: () => ({
          then: (callback) => {
            logger.warn(
              `Deprecated query on ${table} - MongoDB should be used instead`
            );
            callback({ data: [] });
          },
        }),
      }),
    }),
    insert: async () => {
      logger.warn(
        `Deprecated insert on ${table} - MongoDB should be used instead`
      );
      return { data: null, error: "Insert operation migrated to MongoDB" };
    },
  }),
};
