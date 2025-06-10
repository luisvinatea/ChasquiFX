/**
 * User API Keys Management Route
 * Handles storing and retrieving user API keys securely
 */

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { connectToDatabase, createLogger } from "../../../lib/mongodb.js";

const logger = createLogger();

// JWT secret - should be in environment variables
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "your-32-char-encryption-key-here";

// Simple encryption/decryption functions for API keys
function encrypt(text) {
  const algorithm = "aes-256-ctr";
  const secretKey = crypto
    .createHash("sha256")
    .update(ENCRYPTION_KEY)
    .digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, secretKey);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(hash) {
  const algorithm = "aes-256-ctr";
  const secretKey = crypto
    .createHash("sha256")
    .update(ENCRYPTION_KEY)
    .digest();
  const textParts = hash.split(":");
  const iv = Buffer.from(textParts.shift(), "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipher(algorithm, secretKey);
  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);
  return decrypted.toString();
}

// Middleware to verify JWT token
async function verifyToken(request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  if (!token) {
    throw new Error("No token provided");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

// GET - Retrieve user's API keys
export async function GET(request) {
  try {
    const decoded = await verifyToken(request);

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    // Find user and get their API keys
    const user = await usersCollection.findOne({
      _id: decoded.userId,
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Decrypt API keys for response (only return key types, not actual keys for security)
    const apiKeyTypes = {};
    if (user.apiKeys) {
      Object.keys(user.apiKeys).forEach((keyType) => {
        apiKeyTypes[keyType] = {
          exists: true,
          lastUpdated: user.apiKeys[keyType].lastUpdated || null,
        };
      });
    }

    return NextResponse.json({
      apiKeys: apiKeyTypes,
    });
  } catch (error) {
    if (
      error.message === "No token provided" ||
      error.message === "Invalid or expired token"
    ) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    logger.error("Get API keys error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Store user's API key
export async function POST(request) {
  try {
    const decoded = await verifyToken(request);
    const { keyType, apiKey } = await request.json();

    // Validate input
    if (!keyType || !apiKey) {
      return NextResponse.json(
        { message: "Key type and API key are required" },
        { status: 400 }
      );
    }

    // Validate key type
    const allowedKeyTypes = ["serpapi", "searchapi", "amadeus", "openweather"];
    if (!allowedKeyTypes.includes(keyType)) {
      return NextResponse.json(
        {
          message: `Invalid key type. Allowed types: ${allowedKeyTypes.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey);

    // Update user's API keys
    const updateResult = await usersCollection.updateOne(
      { _id: decoded.userId },
      {
        $set: {
          [`apiKeys.${keyType}`]: {
            key: encryptedKey,
            lastUpdated: new Date(),
            createdAt: new Date(),
          },
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    logger.info(`API key stored for user ${decoded.email}, type: ${keyType}`);

    return NextResponse.json({
      message: "API key stored successfully",
      keyType,
      stored: true,
    });
  } catch (error) {
    if (
      error.message === "No token provided" ||
      error.message === "Invalid or expired token"
    ) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    logger.error("Store API key error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove user's API key
export async function DELETE(request) {
  try {
    const decoded = await verifyToken(request);
    const { searchParams } = new URL(request.url);
    const keyType = searchParams.get("keyType");

    if (!keyType) {
      return NextResponse.json(
        { message: "Key type is required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    // Remove the API key
    const updateResult = await usersCollection.updateOne(
      { _id: decoded.userId },
      {
        $unset: {
          [`apiKeys.${keyType}`]: "",
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    logger.info(`API key removed for user ${decoded.email}, type: ${keyType}`);

    return NextResponse.json({
      message: "API key removed successfully",
      keyType,
      removed: true,
    });
  } catch (error) {
    if (
      error.message === "No token provided" ||
      error.message === "Invalid or expired token"
    ) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    logger.error("Remove API key error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export utility function to get decrypted API key (for server-side use)
export async function getUserApiKey(userId, keyType) {
  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ _id: userId });

    if (!user || !user.apiKeys || !user.apiKeys[keyType]) {
      return null;
    }

    return decrypt(user.apiKeys[keyType].key);
  } catch (error) {
    logger.error("Get user API key error:", error);
    return null;
  }
}
