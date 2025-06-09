import { format } from "date-fns";

/**
 * Utility functions for safe date handling across the application
 */

/**
 * Safely parse a date string and return a Date object
 * @param dateInput - Date string, Date object, or timestamp
 * @returns Valid Date object or null if invalid
 */
export function parseDate(
  dateInput: string | Date | number | null | undefined
): Date | null {
  if (!dateInput) return null;

  // Handle edge cases that can cause "Invalid time value" errors
  if (typeof dateInput === "string") {
    // Check for empty strings or invalid formats
    if (
      dateInput.trim() === "" ||
      dateInput === "null" ||
      dateInput === "undefined"
    ) {
      console.warn("Invalid date string provided:", dateInput);
      return null;
    }

    // Check for obviously invalid date strings
    if (
      dateInput.includes("NaN") ||
      dateInput.toLowerCase() === "invalid date"
    ) {
      console.warn("Invalid date string provided:", dateInput);
      return null;
    }
  }

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      console.warn("Invalid date provided:", dateInput);
      return null;
    }
    return date;
  } catch (error) {
    console.warn("Error parsing date:", dateInput, error);
    return null;
  }
}

/**
 * Safely format a date with fallback to default text
 * @param dateInput - Date string, Date object, or timestamp
 * @param options - Intl.DateTimeFormatOptions or 'locale' for toLocaleString()
 * @param fallback - Fallback text if date is invalid
 * @returns Formatted date string or fallback
 */
export function formatDate(
  dateInput: string | Date | number | null | undefined,
  options: Intl.DateTimeFormatOptions | "locale" = {},
  fallback: string = "Invalid date"
): string {
  const date = parseDate(dateInput);
  if (!date) return fallback;

  try {
    if (options === "locale") {
      return date.toLocaleString();
    }
    return date.toLocaleDateString(undefined, options);
  } catch (error) {
    console.warn("Error formatting date:", dateInput, error);
    return fallback;
  }
}

/**
 * Safely format a date with time using toLocaleString
 * @param dateInput - Date string, Date object, or timestamp
 * @param fallback - Fallback text if date is invalid
 * @returns Formatted date-time string or fallback
 */
export function formatDateTime(
  dateInput: string | Date | number | null | undefined,
  fallback: string = "Date not available"
): string {
  // Early return for obviously invalid inputs
  if (dateInput === null || dateInput === undefined || dateInput === "") {
    return fallback;
  }

  const date = parseDate(dateInput);
  if (!date) return fallback;

  try {
    return date.toLocaleString();
  } catch (error) {
    console.warn("Error formatting date-time:", dateInput, error);
    return fallback;
  }
}

/**
 * Check if a date string/object is valid
 * @param dateInput - Date string, Date object, or timestamp
 * @returns True if date is valid
 */
export function isValidDate(
  dateInput: string | Date | number | null | undefined
): boolean {
  return parseDate(dateInput) !== null;
}

/**
 * Safely format a date using date-fns with fallback handling
 * @param dateInput - Date string, Date object, or timestamp
 * @param formatString - date-fns format string
 * @param fallback - Fallback text if date is invalid
 * @returns Formatted date string or fallback
 */
export function formatDateFns(
  dateInput: string | Date | number | null | undefined,
  formatString: string = "MMM dd, yyyy",
  fallback: string = "Date not available"
): string {
  // Early return for obviously invalid inputs
  if (dateInput === null || dateInput === undefined || dateInput === "") {
    return fallback;
  }

  const date = parseDate(dateInput);
  if (!date) return fallback;

  try {
    return format(date, formatString);
  } catch (error) {
    console.warn("Error formatting date with date-fns:", dateInput, error);
    return fallback;
  }
}

/**
 * Sanitize an object to fix any invalid date values that might cause RangeError
 * @param obj - Object to sanitize
 * @returns Sanitized object with fixed date values
 */
export function sanitizeDateFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeDateFields);
  }

  if (typeof obj === "object") {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        // Check if this might be a date field
        if (
          key.toLowerCase().includes("date") ||
          key.toLowerCase().includes("time")
        ) {
          if (
            typeof value === "string" &&
            value.trim() !== "" &&
            !isValidDate(value)
          ) {
            console.warn(`Invalid date value found for ${key}:`, value);
            sanitized[key] = null; // Replace invalid dates with null
          } else {
            sanitized[key] = value;
          }
        } else if (typeof value === "object") {
          sanitized[key] = sanitizeDateFields(value);
        } else {
          sanitized[key] = value;
        }
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Safe wrapper for any function that might throw date-related errors
 * @param fn - Function to wrap
 * @param fallback - Fallback value if function throws
 * @returns Safe function result or fallback
 */
export function safeDate<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (error) {
    if (
      error instanceof RangeError &&
      error.message.includes("Invalid time value")
    ) {
      console.warn("Date-related RangeError caught and handled:", error);
      return fallback;
    }
    throw error; // Re-throw non-date errors
  }
}

/**
 * Debug utility to log any potential date issues in data
 * @param data - Data to check for date issues
 * @param context - Context string for logging
 */
export function debugDateIssues(data: any, context: string = "unknown"): void {
  if (process.env.NODE_ENV !== "development") return;

  const checkForInvalidDates = (obj: any, path: string = "") => {
    if (obj === null || obj === undefined) return;

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        checkForInvalidDates(item, `${path}[${index}]`);
      });
      return;
    }

    if (typeof obj === "object") {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          const currentPath = path ? `${path}.${key}` : key;

          // Check if this might be a date field
          if (
            key.toLowerCase().includes("date") ||
            key.toLowerCase().includes("time")
          ) {
            if (
              typeof value === "string" &&
              value.trim() !== "" &&
              !isValidDate(value)
            ) {
              console.warn(
                `[${context}] Invalid date found at ${currentPath}:`,
                value
              );
            } else if (value instanceof Date && isNaN(value.getTime())) {
              console.warn(
                `[${context}] Invalid Date object found at ${currentPath}:`,
                value
              );
            }
          }

          if (typeof value === "object") {
            checkForInvalidDates(value, currentPath);
          }
        }
      }
    }
  };

  checkForInvalidDates(data);
}
