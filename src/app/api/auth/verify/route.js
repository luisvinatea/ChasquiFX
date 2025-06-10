/**
 * User Authentication API - Verify Token Route
 * Validates JWT tokens and returns user information
 */

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase, createLogger } from "../../../lib/mongodb.js";

const logger = createLogger();

// JWT secret - should be in environment variables
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

export async function GET(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      );
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      logger.warn("Invalid token verification attempt");
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    // Find user by ID from token
    const user = await usersCollection.findOne({
      _id: decoded.userId,
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if user is still active
    if (user.status === "inactive") {
      return NextResponse.json(
        { message: "Account is inactive" },
        { status: 401 }
      );
    }

    // Update last active timestamp
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastActive: new Date() } }
    );

    // Return user info (without password)
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: {
        id: userWithoutPassword._id,
        email: userWithoutPassword.email,
        name: userWithoutPassword.name,
        role: userWithoutPassword.role || "user",
        createdAt: userWithoutPassword.createdAt,
        lastLogin: userWithoutPassword.lastLogin,
        preferences: userWithoutPassword.preferences || {},
      },
      valid: true,
    });
  } catch (error) {
    logger.error("Token verification error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { message: "Token is required" },
        { status: 400 }
      );
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return NextResponse.json(
        { message: "Invalid or expired token", valid: false },
        { status: 200 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    // Find user by ID from token
    const user = await usersCollection.findOne({
      _id: decoded.userId,
    });

    if (!user || user.status === "inactive") {
      return NextResponse.json(
        { message: "User not found or inactive", valid: false },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      userId: user._id,
      email: user.email,
      role: user.role || "user",
    });
  } catch (error) {
    logger.error("Token validation error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
