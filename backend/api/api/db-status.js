import { connectToDatabase } from "../src/db/mongodb-vercel.js";
import { createLogger } from "../src/db/mongodb-vercel.js";

const logger = createLogger();

export default async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Serpapi-Key, X-Search-Api-Key, X-Exchange-Api-Key"
  );

  // Handle OPTIONS requests (preflight)
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Health check
  if (req.url === "/api/health") {
    return res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "production",
      apiVersion: "1.0.0",
      serverless: true,
    });
  }

  try {
    const { db } = await connectToDatabase();

    const result = {
      status: "connected",
      message: "MongoDB connection successful",
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Database connection error: ${error.message}`);

    return res.status(500).json({
      status: "error",
      message: "Failed to connect to the database",
      error: error.message,
    });
  }
};
