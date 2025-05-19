import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { setupRoutes } from "./routes/index.js";
import { initLogger } from "./utils/logger.js";

// Load environment variables
dotenv.config();

// Initialize logger
const logger = initLogger();

// Create Express app
const app = express();

// Setup middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
); // Request logging

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    apiVersion: "1.0.0",
  });
});

// Setup API routes
setupRoutes(app);

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);

  res.status(err.status || 500).json({
    status: "error",
    message: err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;
