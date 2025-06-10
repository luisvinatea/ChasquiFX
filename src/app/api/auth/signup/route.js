/**
 * User Authentication API - Sign Up Route
 * Handles user registration with email and password
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

// Password strength validation
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return "Password must be at least 8 characters long";
  }

  if (!hasUpperCase || !hasLowerCase) {
    return "Password must contain both uppercase and lowercase letters";
  }

  if (!hasNumbers) {
    return "Password must contain at least one number";
  }

  // Optional: require special characters for stronger security
  // if (!hasSpecialChar) {
  //   return "Password must contain at least one special character";
  // }

  return null;
}

// Email validation
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request) {
  try {
    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { message: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 });
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user object
    const newUser = {
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || email.split("@")[0], // Use email username as default name
      role: "user",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
      lastActive: new Date(),
      preferences: {
        currency: "USD",
        notifications: true,
        theme: "light",
      },
      apiKeys: {}, // Storage for user's API keys
    };

    // Insert user into database
    const result = await usersCollection.insertOne(newUser);

    if (!result.insertedId) {
      throw new Error("Failed to create user");
    }

    logger.info(`New user registered: ${email}`);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: result.insertedId,
        email: newUser.email,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return success response (without password)
    return NextResponse.json(
      {
        message: "User registered successfully",
        token,
        user: {
          id: result.insertedId,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          createdAt: newUser.createdAt,
        },
        session: {
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Sign up error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
