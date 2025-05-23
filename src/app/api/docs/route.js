import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      title: "ChasquiFX API Documentation",
      version: process.env.NEXT_PUBLIC_VERSION || "1.0.0",
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "",
      description: "API documentation for the ChasquiFX service",
      endpoints: [
        {
          path: "/api/health",
          method: "GET",
          description: "Check API health status",
          response: {
            status: "String - API status (ok or error)",
            timestamp: "ISO date string",
            environment: "String - deployment environment",
            version: "String - API version",
            database: "Object - database connection information",
          },
        },
        {
          path: "/api/db-status",
          method: "GET",
          description: "Check database connection status",
          response: {
            status: "String - database status (connected or error)",
            database: "Object - database information",
            collections: "Array - collection information",
            timestamp: "ISO date string",
          },
        },
        {
          path: "/api/forex",
          method: "GET",
          description: "Get forex status information",
          response: {
            status: "String - service status",
            serviceStatus: "String - online or offline",
            databaseStatus: "String - database connection status",
            updateInfo: "Object - update information",
          },
        },
        {
          path: "/api/forex",
          method: "GET",
          description: "Get forex exchange rates",
          query: {
            rates: "Boolean - set to true to get exchange rates",
            from_currency: "String - base currency code",
            to_currency: "String - target currency code",
          },
          response: {
            status: "String - success or error",
            data: "Object - exchange rate data",
            source: "String - cache or database",
          },
        },
      ],
      migrationStatus: "Completed",
      updatedAt: new Date().toISOString(),
    },
    { status: 200 }
  );
}
