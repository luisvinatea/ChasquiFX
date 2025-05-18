import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDirectory = path.join(__dirname, "../../../logs");

// Create logger instance
let logger;

/**
 * Initialize the logger
 * @returns {Object} - Winston logger instance
 */
export function initLogger() {
  if (logger) return logger;

  // Define log format
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  );

  // Console format
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ level, message, label, timestamp }) => {
      return `${timestamp} ${level} ${label ? `[${label}]` : ""}: ${message}`;
    })
  );

  // Create logger
  logger = winston.createLogger({
    level: process.env.NODE_ENV === "development" ? "debug" : "info",
    format: logFormat,
    defaultMeta: { service: "chasquifx-api" },
    transports: [
      // Console transport for all logs
      new winston.transports.Console({
        format: consoleFormat,
      }),

      // File transport for error logs
      new winston.transports.File({
        filename: path.join(logDirectory, "node_error.log"),
        level: "error",
      }),

      // File transport for all logs
      new winston.transports.File({
        filename: path.join(logDirectory, "node_combined.log"),
      }),
    ],
  });

  return logger;
}

/**
 * Get a child logger with a specific label
 * @param {String} label - Logger label
 * @returns {Object} - Winston logger instance
 */
export function getLogger(label) {
  const mainLogger = initLogger();
  return mainLogger.child({ label });
}
