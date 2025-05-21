/**
 * MongoDB Connection Verification Script
 * 
 * This script validates MongoDB connection settings and outputs detailed diagnostic information
 * Run with: node verify-mongodb.js
 */

import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config();

// Color formatting for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m"
};

// Format log messages with timestamp and color
function log(message, type = "info") {
  const timestamp = new Date().toISOString().replace("T", " ").substr(0, 19);
  
  switch (type) {
    case "error":
      console.error(`${colors.red}${timestamp} ERROR:${colors.reset}`, message);
      break;
    case "warn":
      console.warn(`${colors.yellow}${timestamp} WARN :${colors.reset}`, message);
      break;
    case "success":
      console.log(`${colors.green}${timestamp} OK   :${colors.reset}`, message);
      break;
    case "info":
      console.info(`${colors.blue}${timestamp} INFO :${colors.reset}`, message);
      break;
    case "debug":
      console.debug(`${colors.gray}${timestamp} DEBUG:${colors.reset}`, message);
      break;
    case "header":
      console.log(`\n${colors.magenta}${message}${colors.reset}\n`);
      break;
    default:
      console.log(`${timestamp} ${type.padEnd(5)}: ${message}`);
  }
}

// Verify MongoDB environment variables
function checkMongoDBEnvVars() {
  log("CHECKING MONGODB ENVIRONMENT VARIABLES", "header");
  
  const requiredVars = ["MONGODB_USER", "MONGODB_PASSWORD"];
  const optionalVars = ["MONGODB_HOST", "MONGODB_DBNAME"];
  
  let hasAllRequired = true;
  
  // Check required vars
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      log(`${varName} is missing`, "error");
      hasAllRequired = false;
    } else {
      log(`${varName} is set`, "success");
    }
  }
  
  // Check optional vars
  for (const varName of optionalVars) {
    if (!process.env[varName]) {
      log(`${varName} is not set, will use default value`, "warn");
    } else {
      log(`${varName} is set to: ${varName === "MONGODB_HOST" ? process.env[varName] : "***"}`, "success");
    }
  }
  
  return hasAllRequired;
}

// Build MongoDB connection URI
function buildConnectionURI() {
  log("BUILDING MONGODB CONNECTION URI", "header");
  
  // Get credentials from env
  const username = process.env.MONGODB_USER;
  const password = process.env.MONGODB_PASSWORD;
  
  if (!username || !password) {
    log("Cannot build connection URI: missing credentials", "error");
    return null;
  }
  
  // Encode credentials for URL
  const encodedUsername = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  
  // Get host and database name with defaults
  const host = process.env.MONGODB_HOST || "chasquifx.ymxb5bs.mongodb.net";
  const dbName = process.env.MONGODB_DBNAME || "chasquifx";
  
  log(`Using MongoDB host: ${host}`, "info");
  log(`Using database name: ${dbName}`, "info");
  
  // Build the URI
  const uri = `mongodb+srv://${encodedUsername}:${encodedPassword}@${host}/${dbName}?retryWrites=true&w=majority&appName=ChasquiFXVerifier`;
  const maskedUri = `mongodb+srv://${encodedUsername}:****@${host}/${dbName}?retryWrites=true&w=majority&appName=ChasquiFXVerifier`;
  
  log(`Connection URI: ${maskedUri}`, "info");
  
  return { uri, dbName };
}

// Test MongoDB connection
async function testConnection(connectionDetails) {
  log("TESTING MONGODB CONNECTION", "header");
  
  if (!connectionDetails) {
    log("Cannot test connection: missing connection details", "error");
    return false;
  }
  
  const { uri, dbName } = connectionDetails;
  
  // Create MongoDB client
  log("Creating MongoDB client...", "info");
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    connectTimeoutMS: 10000, // 10 seconds
    socketTimeoutMS: 45000,  // 45 seconds
  });
  
  try {
    // Connect to MongoDB
    log("Attempting to connect to MongoDB...", "info");
    await client.connect();
    log("Successfully connected to MongoDB Atlas!", "success");
    
    // Ping database
    log("Sending ping command...", "info");
    await client.db("admin").command({ ping: 1 });
    log("Ping successful", "success");
    
    // Access database
    const db = client.db(dbName);
    
    // List collections
    log("Listing collections...", "info");
    const collections = await db.listCollections().toArray();
    log(`Found ${collections.length} collections:`, "success");
    
    // Keep track of required collections
    const requiredCollections = ["forex", "flights", "geo"];
    const foundCollections = new Set();
    
    // Log each collection
    for (const coll of collections) {
      log(`- ${coll.name}`, "info");
      if (requiredCollections.includes(coll.name)) {
        foundCollections.add(coll.name);
      }
    }
    
    // Check for missing required collections
    const missingCollections = requiredCollections.filter(coll => !foundCollections.has(coll));
    if (missingCollections.length > 0) {
      log(`Missing required collections: ${missingCollections.join(", ")}`, "warn");
    } else {
      log("All required collections exist", "success");
    }
    
    // Try to query a collection
    if (foundCollections.has("forex")) {
      log("Testing query on forex collection...", "info");
      const count = await db.collection("forex").countDocuments();
      log(`Forex collection has ${count} documents`, "success");
    }
    
    // Close connection
    await client.close();
    log("Connection closed", "info");
    
    return true;
  } catch (error) {
    log(`MongoDB connection error: ${error.message}`, "error");
    
    // Provide more helpful error messages
    if (error.message.includes("authentication failed")) {
      log("Authentication failed - incorrect username or password", "error");
      log("Please check your MongoDB Atlas credentials", "info");
    } else if (error.message.includes("timed out")) {
      log("Connection timed out - check network and firewall settings", "error");
      log("Make sure your MongoDB Atlas Network Access allows connections from your IP", "info");
    } else if (error.message.includes("getaddrinfo ENOTFOUND") || error.message.includes("no such host")) {
      log("Host not found - check MONGODB_HOST setting", "error");
      log("Verify the MongoDB Atlas cluster name is correct", "info");
    }
    
    try {
      await client.close();
    } catch (closeError) {
      // Ignore close errors
    }
    
    return false;
  }
}

// Provide fix guidance
function provideFixGuidance() {
  log("TROUBLESHOOTING GUIDANCE", "header");
  
  log("1. Verify MongoDB Atlas Credentials", "info");
  log("   - Log in to MongoDB Atlas dashboard", "info");
  log("   - Go to Database Access to check user credentials", "info");
  log("   - Reset password if necessary", "info");
  
  log("2. Check Network Access Settings", "info");
  log("   - In MongoDB Atlas, go to Network Access", "info");
  log("   - Add your current IP address or use 0.0.0.0/0 for testing", "info");
  
  log("3. Verify Cluster Status", "info");
  log("   - Make sure your MongoDB Atlas cluster is running (not paused)", "info");
  
  log("4. Correct Environment Variables", "info");
  log("   - Update .env file with correct credentials", "info");
  log("   - Make sure to update Vercel environment variables after fixing locally", "info");
  
  log("\nTo deploy to Vercel with fixed credentials, run:", "info");
  log("cd /home/luisvinatea/DEVinatea/Repos/chasquifx/backend/api", "info");
  log("./deploy.sh", "info");
}

// Main execution function
async function main() {
  log("MONGODB CONNECTION DIAGNOSTIC TOOL", "header");
  log("This tool will verify your MongoDB connection settings and help diagnose issues", "info");
  
  // Check environment variables
  const hasRequiredVars = checkMongoDBEnvVars();
  if (!hasRequiredVars) {
    log("Missing required environment variables. Cannot proceed with connection testing.", "error");
    provideFixGuidance();
    return false;
  }
  
  // Build connection URI
  const connectionDetails = buildConnectionURI();
  if (!connectionDetails) {
    log("Failed to build connection URI. Cannot proceed with connection testing.", "error");
    provideFixGuidance();
    return false;
  }
  
  // Test connection
  const connectionSuccessful = await testConnection(connectionDetails);
  if (connectionSuccessful) {
    log("MONGODB CONNECTION IS WORKING CORRECTLY!", "success");
    log("Your MongoDB connection is properly configured.", "success");
    
    // Suggest next steps
    log("\nNext steps:", "info");
    log("1. Update Vercel environment variables if needed", "info");
    log("2. Deploy the API to Vercel using './deploy.sh'", "info");
    
    return true;
  } else {
    log("MONGODB CONNECTION FAILED", "error");
    provideFixGuidance();
    return false;
  }
}

// Run the main function
main()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`Unhandled error: ${error.message}`, "error");
    process.exit(1);
  });
