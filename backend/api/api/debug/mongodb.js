/**
 * MongoDB Connection Diagnostic API Endpoint
 * This endpoint provides detailed information about MongoDB connection issues
 * Access via: https://chasquifx-api.vercel.app/api/debug/mongodb
 */

import { connectToDatabase } from "../../src/db/mongodb-vercel.js";

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  // Handle OPTIONS requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({
      status: "error",
      message: "Method not allowed",
    });
  }

  // Create diagnostic report
  const diagnosticReport = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
    nodeVersion: process.version,
    vercelRegion: process.env.VERCEL_REGION || "unknown",
    config: {
      mongoDbUser: process.env.MONGODB_USER ? "set" : "missing",
      mongoDbPassword: process.env.MONGODB_PASSWORD ? "set" : "missing",
      mongoDbHost: process.env.MONGODB_HOST || "chasquifx.ymxb5bs.mongodb.net (default)",
      mongoDbName: process.env.MONGODB_DBNAME || "chasquifx (default)",
    }
  };

  try {
    console.log("Attempting MongoDB connection...");
    
    // Get connection start time for performance metrics
    const startTime = Date.now();
    
    // Try to connect to MongoDB
    const { db, client } = await connectToDatabase();
    
    // Calculate connection time
    const connectionTime = Date.now() - startTime;
    diagnosticReport.connectionTimeMs = connectionTime;
    
    console.log(`Connected successfully in ${connectionTime}ms`);

    // Test database with ping command
    await db.command({ ping: 1 });
    console.log("Ping command successful");
    
    // Get database information
    const dbStats = await db.admin().serverStatus();
    const collections = await db.listCollections().toArray();
    
    // Add successful connection details to report
    diagnosticReport.status = "connected";
    diagnosticReport.mongodb = {
      version: dbStats.version,
      connections: dbStats.connections ? {
        current: dbStats.connections.current,
        available: dbStats.connections.available,
        totalCreated: dbStats.connections.totalCreated
      } : "unavailable",
      collections: collections.map(c => c.name),
      collectionCount: collections.length
    };
    
    // Check for specific collections
    const requiredCollections = ["forex", "flights", "geo"];
    const missingCollections = requiredCollections.filter(
      name => !collections.some(c => c.name === name)
    );
    
    if (missingCollections.length > 0) {
      diagnosticReport.warnings = {
        missingCollections: missingCollections,
        message: `Missing required collections: ${missingCollections.join(", ")}`
      };
    }
    
    // Try to query forex collection if it exists
    if (collections.some(c => c.name === "forex")) {
      try {
        const forexCount = await db.collection("forex").countDocuments();
        diagnosticReport.forexCollection = {
          count: forexCount,
          isEmpty: forexCount === 0
        };
        
        if (forexCount === 0) {
          if (!diagnosticReport.warnings) diagnosticReport.warnings = {};
          diagnosticReport.warnings.emptyForexCollection = "Forex collection exists but is empty";
        }
      } catch (forexError) {
        diagnosticReport.forexQuery = {
          error: forexError.message,
          stack: forexError.stack
        };
      }
    }
    
    // Close the connection
    await client.close();
    
    return res.status(200).json({
      status: "success",
      message: "MongoDB connection successful",
      diagnosticReport
    });
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    console.error(error.stack);
    
    // Add detailed error information
    diagnosticReport.status = "error";
    diagnosticReport.error = {
      message: error.message,
      type: error.name,
      stack: error.stack
    };
    
    // Add error analysis
    if (error.message.includes("authentication failed")) {
      diagnosticReport.errorAnalysis = "Authentication failed - incorrect username or password";
      diagnosticReport.suggestedFix = "Check your MongoDB Atlas credentials in Vercel environment variables";
    } else if (error.message.includes("timed out")) {
      diagnosticReport.errorAnalysis = "Connection timed out - network or firewall issue";
      diagnosticReport.suggestedFix = "Check MongoDB Atlas Network Access settings to allow connections from Vercel";
    } else if (error.message.includes("ENOTFOUND") || error.message.includes("no such host")) {
      diagnosticReport.errorAnalysis = "Host not found - incorrect MongoDB Atlas hostname";
      diagnosticReport.suggestedFix = "Verify the MONGODB_HOST environment variable is set correctly";
    } else if (error.message.includes("net::ERR_NAME_NOT_RESOLVED")) {
      diagnosticReport.errorAnalysis = "DNS resolution failed - cannot resolve MongoDB hostname";
      diagnosticReport.suggestedFix = "Check if the MongoDB cluster exists and is spelled correctly";
    } else {
      diagnosticReport.errorAnalysis = "Unknown MongoDB connection error";
      diagnosticReport.suggestedFix = "Check error details and MongoDB Atlas dashboard for more information";
    }
    
    return res.status(500).json({
      status: "error",
      message: "MongoDB connection failed",
      diagnosticReport
    });
  }
}
