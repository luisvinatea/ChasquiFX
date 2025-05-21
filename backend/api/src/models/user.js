/**
 * User Model
 * Defines the schema for user accounts in MongoDB
 */

import mongoose from "mongoose";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    username: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Don't return password by default in queries
    },
    salt: {
      type: String,
      select: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      token: {
        type: String,
        select: false,
      },
      expires: {
        type: Date,
        select: false,
      },
    },
    resetPasswordToken: {
      token: {
        type: String,
        select: false,
      },
      expires: {
        type: Date,
        select: false,
      },
    },
    apiKeys: [
      {
        keyType: {
          type: String,
          required: true,
        },
        encryptedKey: {
          type: String,
          required: true,
          select: false,
        },
        iv: {
          type: String,
          required: true,
          select: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        lastUsed: {
          type: Date,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// Method to set password
userSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString("hex");
  this.password = crypto
    .pbkdf2Sync(password, this.salt, 10000, 64, "sha512")
    .toString("hex");
};

// Method to check password
userSchema.methods.validPassword = function (password) {
  const hash = crypto
    .pbkdf2Sync(password, this.salt, 10000, 64, "sha512")
    .toString("hex");
  return this.password === hash;
};

// Generate verification token
userSchema.methods.generateVerificationToken = function () {
  const token = crypto.randomBytes(32).toString("hex");

  this.verificationToken = {
    token: token,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  };

  return token;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString("hex");

  this.resetPasswordToken = {
    token: token,
    expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  };

  return token;
};

export default mongoose.models.User || mongoose.model("User", userSchema);
