/**
 * API Key Routes
 * Handles API key management
 */

import express from "express";
import {
  handleStoreApiKey,
  handleVerifyApiKey,
  handleGetApiKey,
  handleDeleteApiKey,
  handleListApiKeys,
} from "../controllers/apiKeyController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// API Key routes
router.post("/", handleStoreApiKey);
router.get("/", handleListApiKeys);
router.get("/:keyType/verify", handleVerifyApiKey);
router.get("/:keyType", handleGetApiKey);
router.delete("/:keyType", handleDeleteApiKey);

export default router;
