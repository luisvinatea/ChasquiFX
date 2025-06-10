/**
 * User Authentication API - Logout Route
 * Handles user logout (token invalidation)
 */

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase, createLogger } from "../../../lib/mongodb.js";

const logger = createLogger();

// JWT secret - should be in environment variables
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

export async function POST(request) {
  try {
    // Get token from Authorization header or request body
    const authHeader = request.headers.get("authorization");
    let token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    // If no token in header, try to get from body
    if (!token) {
      const body = await request.json().catch(() => ({}));
      token = body.token;
    }

    if (!token) {
      return NextResponse.json(
        { message: "No token provided" },
        { status: 400 }
      );
    }

    // Verify JWT token to get user info
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      // Even if token is invalid, we can still "logout" successfully
      logger.info("Logout attempt with invalid token");
      return NextResponse.json({
        message: "Logged out successfully",
      });
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    // Update user's last logout timestamp
    await usersCollection.updateOne(
      { _id: decoded.userId },
      {
        $set: {
          lastLogout: new Date(),
          lastActive: new Date(),
        },
      }
    );

    // In a more sophisticated system, you might want to:
    // 1. Add the token to a blacklist collection
    // 2. Store invalidated tokens until their expiration
    // For now, we'll rely on client-side token removal

    logger.info(`User logged out: ${decoded.email}`);

    return NextResponse.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("Logout error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
