import { NextResponse } from "next/server";
import { connectToDatabase } from "../../lib/mongodb";

export async function GET() {
  try {
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
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Service unavailable",
        error: error.message,
      },
      { status: 503 }
    );
  }
}
