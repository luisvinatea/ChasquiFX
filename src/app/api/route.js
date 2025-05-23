import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      name: "ChasquiFX API",
      version: process.env.NEXT_PUBLIC_VERSION || "1.0.0",
      status: "active",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "production",
      endpoints: [
        { path: "/api/health", description: "API health check" },
        { path: "/api/db-status", description: "Database connection status" },
        { path: "/api/forex", description: "Forex rates and status" },
      ],
      documentation: "/api/docs",
      migrated: true,
      message: "Successfully migrated to Next.js unified deployment",
    },
    { status: 200 }
  );
}
