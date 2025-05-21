/**
 * Environment variable utilities
 */
import { getLogger } from "./logger.js";

const logger = getLogger("environment");

/**
 * Get a required environment variable
 * @param {string} name - Environment variable name
 * @param {string} fallback - Optional fallback value for non-production environments
 * @returns {string} - Environment variable value
 * @throws {Error} - If environment variable is not set in production
 */
export function getRequiredEnv(name, fallback = null) {
  const value = process.env[name];
  const isProduction = process.env.NODE_ENV === "production";

  if (!value) {
    if (isProduction) {
      const message = `Required environment variable ${name} is not set`;
      logger.error(message);
      throw new Error(message);
    } else if (fallback !== null) {
      logger.warn(
        `Using fallback value for ${name} in ${process.env.NODE_ENV} environment`
      );
      return fallback;
    } else {
      const message = `Required environment variable ${name} is not set`;
      logger.error(message);
      throw new Error(message);
    }
  }

  return value;
}

/**
 * Get an optional environment variable with a default value
 * @param {string} name - Environment variable name
 * @param {string} defaultValue - Default value if not set
 * @returns {string} - Environment variable value or default
 */
export function getEnv(name, defaultValue) {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }
  return value;
}
