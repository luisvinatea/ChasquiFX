#!/usr/bin/env node

/**
 * Environment variables validation script
 * This script checks for required environment variables before starting the application
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("✅ Loaded environment variables from .env file");
} else {
  console.warn("⚠️ No .env file found, using process.env");
}

// Define required environment variables
const requiredVars = ["JWT_SECRET"];
const productionOnlyVars = ["MONGODB_URI", "EMAIL_SERVICE_API_KEY"];

// Check environment
const isProduction = process.env.NODE_ENV === "production";
console.log(`🌎 Environment: ${process.env.NODE_ENV || "development"}`);

// Validate required variables
let hasErrors = false;

// Function to check if a value looks like a placeholder
function isPlaceholder(value) {
  const placeholderPatterns = [
    /<[A-Z_]+>/i,                           // <PLACEHOLDER>
    /your_[a-z_]+/i,                        // your_placeholder
    /REPLACE_WITH_/i,                       // REPLACE_WITH_
    /\$\{[A-Z_]+\}/i,                       // ${PLACEHOLDER}
    /placeholder|example|dummy|test123/i,   // Common placeholder words
  ];
  
  return placeholderPatterns.some(pattern => pattern.test(value));
}

// Check all environments required vars
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`❌ Required environment variable missing: ${varName}`);
    hasErrors = true;
  } else if (isPlaceholder(process.env[varName])) {
    console.warn(`⚠️ ${varName} appears to be a placeholder value. Replace with a real value.`);
    hasErrors = isProduction; // Only consider as error in production
  } else {
    console.log(`✅ ${varName} is set`);
  }
}

// Check production-only required vars
if (isProduction) {
  for (const varName of productionOnlyVars) {
    if (!process.env[varName]) {
      console.error(`❌ Production environment variable missing: ${varName}`);
      hasErrors = true;
    } else {
      console.log(`✅ ${varName} is set`);
    }
  }
}

// Security check for specific JWT_SECRET values
if (isProduction) {
  const insecureJwtSecrets = [
    "PLACEHOLDER_SECRET_DO_NOT_USE_IN_PRODUCTION",
    "your_strong_jwt_secret_here",
    "<REPLACE_WITH_YOUR_SECRET>",
    "chasquifx-default-jwt-secret-for-dev-use",
    "test123",
    "secret",
    "jwt_secret",
    "development",
    "production"
  ];
  
  if (insecureJwtSecrets.includes(process.env.JWT_SECRET)) {
    console.error("❌ JWT_SECRET is set to an insecure placeholder value in production!");
    hasErrors = true;
  }
  
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn("⚠️ JWT_SECRET is too short for production use. Consider using a longer, more secure value.");
  }
}

// Exit with error if any required variables are missing
if (hasErrors) {
  console.error(
    "❌ Environment validation failed. Please set the required variables."
  );
  process.exit(1);
} else {
  console.log("✅ Environment validation successful");
}
