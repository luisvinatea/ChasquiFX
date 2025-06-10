/**
 * User Authentication API - Sign In Route
 * Handles user login with email and password
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase, createLogger } from "../../../lib/mongodb.js";

const logger = createLogger();

// JWT secret - should be in environment variables
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    // Find user by email
    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      logger.warn(`Failed login attempt for email: ${email}`);
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if user is active
    if (user.status === "inactive") {
      return NextResponse.json(
        { message: "Account is inactive. Please contact support." },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn(
        `Failed login attempt for email: ${email} - invalid password`
      );
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Update last login
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
          lastActive: new Date(),
        },
      }
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role || "user",
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from user object before sending response
    const { password: _, ...userWithoutPassword } = user;

    logger.info(`Successful login for user: ${email}`);

    return NextResponse.json({
      message: "Login successful",
      token,
      user: {
        id: userWithoutPassword._id,
        email: userWithoutPassword.email,
        name: userWithoutPassword.name,
        role: userWithoutPassword.role || "user",
        createdAt: userWithoutPassword.createdAt,
        lastLogin: new Date(),
      },
      session: {
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  } catch (error) {
    logger.error("Sign in error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
