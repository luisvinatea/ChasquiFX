import { NextResponse } from "next/server";
import { connectToDatabase } from "../../lib/mongodb";

export async function GET() {
  try {
    // Check if we're in build time (no MongoDB URI available)
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        {
          status: "ok",
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || "production",
          version: process.env.NEXT_PUBLIC_VERSION || "1.0.0",
          database: {
            status: "not_configured",
            note: "Database connection not configured during build",
          },
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    // Test database connection
    const { db } = await connectToDatabase();

    // Ping the database
    await db.command({ ping: 1 });

    // Get MongoDB status information
    const dbStats = await db.stats();

    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "production",
        version: process.env.NEXT_PUBLIC_VERSION || "1.0.0",
        database: {
          status: "connected",
          name: db.databaseName,
          collections: dbStats.collections,
          size:
            Math.round((dbStats.dataSize / 1024 / 1024) * 100) / 100 + " MB",
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Service unavailable",
        error: error.message,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}
