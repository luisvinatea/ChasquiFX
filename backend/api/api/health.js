import { connectToDatabase } from "../src/db/mongodb-vercel.js";

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
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

  try {
    // Test database connection
    const { db, client } = await connectToDatabase();

    // Ping the database
    await db.command({ ping: 1 });

    // Get MongoDB status information
    const dbStats = await db.stats();

    return res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "production",
      apiVersion: "1.0.0",
      databaseConnected: true,
      dbStats: {
        collections: dbStats.collections,
        views: dbStats.views,
        objects: dbStats.objects,
      },
      serverless: true,
      hostname: process.env.VERCEL_URL || "localhost",
    });
  } catch (error) {
    console.error(`Health check error: ${error.message}`);

    return res.status(500).json({
      status: "error",
      message: "Health check failed",
      error: error.message,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "production",
      databaseConnected: false,
      serverless: true,
      hostname: process.env.VERCEL_URL || "localhost",
    });
  }
}
