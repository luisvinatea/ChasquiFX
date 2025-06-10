/**
 * User Profile Management API Route
 * Handles user profile updates and settings
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase, createLogger } from "../../../lib/mongodb.js";
import { verifyAuthToken } from "../../../../lib/auth.js";

const logger = createLogger();

// GET - Get user profile
export async function GET(request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (authResult.error) {
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    // Get user profile
    const user = await usersCollection.findOne({
      _id: authResult.user.id,
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Return user profile (without password)
    const { password: _, ...userProfile } = user;

    return NextResponse.json({
      user: {
        id: userProfile._id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role || "user",
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
        lastLogin: userProfile.lastLogin,
        preferences: userProfile.preferences || {},
      },
    });
  } catch (error) {
    logger.error("Get profile error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update user profile
export async function PUT(request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (authResult.error) {
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { name, preferences } = await request.json();

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    // Build update object
    const updateData = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (preferences !== undefined) {
      updateData.preferences = {
        ...preferences,
        // Ensure valid preference values
        currency: preferences.currency || "USD",
        notifications: Boolean(preferences.notifications),
        theme: preferences.theme || "light",
      };
    }

    // Update user profile
    const result = await usersCollection.updateOne(
      { _id: authResult.user.id },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Get updated user profile
    const updatedUser = await usersCollection.findOne({
      _id: authResult.user.id,
    });

    // Return updated profile (without password)
    const { password: _, ...userProfile } = updatedUser;

    logger.info(`Profile updated for user: ${authResult.user.email}`);

    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        id: userProfile._id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role || "user",
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
        lastLogin: userProfile.lastLogin,
        preferences: userProfile.preferences || {},
      },
    });
  } catch (error) {
    logger.error("Update profile error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Change password
export async function POST(request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (authResult.error) {
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: "Current password and new password are required" },
        { status: 400 }
      );
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: "New password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    // Get current user
    const user = await usersCollection.findOne({
      _id: authResult.user.id,
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { message: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await usersCollection.updateOne(
      { _id: authResult.user.id },
      {
        $set: {
          password: hashedNewPassword,
          updatedAt: new Date(),
        },
      }
    );

    logger.info(`Password changed for user: ${authResult.user.email}`);

    return NextResponse.json({
      message: "Password changed successfully",
    });
  } catch (error) {
    logger.error("Change password error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
