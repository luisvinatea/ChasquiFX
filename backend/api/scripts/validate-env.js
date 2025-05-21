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

// Check all environments required vars
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`❌ Required environment variable missing: ${varName}`);
    hasErrors = true;
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

// Security check for JWT_SECRET
if (
  process.env.JWT_SECRET === "PLACEHOLDER_SECRET_DO_NOT_USE_IN_PRODUCTION" &&
  isProduction
) {
  console.error(
    "❌ JWT_SECRET is set to the placeholder value in production!"
  );
  hasErrors = true;
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
