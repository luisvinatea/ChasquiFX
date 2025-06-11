import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";

import "./global.css"; // Use the consolidated CSS file

// Global error handler for uncaught date-related errors
window.addEventListener("error", (event) => {
  if (
    event.error instanceof RangeError &&
    event.error.message.includes("Invalid time value")
  ) {
    console.error("Caught invalid date error:", event.error);
    console.error("Error stack:", event.error.stack);
    // Prevent the error from breaking the application
    event.preventDefault();
    return false;
  }
});

// Handle unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  if (
    event.reason instanceof RangeError &&
    event.reason.message.includes("Invalid time value")
  ) {
    console.error("Caught invalid date error in promise:", event.reason);
    console.error("Error stack:", event.reason.stack);
    // Prevent the error from breaking the application
    event.preventDefault();
  }
});

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function updateDarkClass(e?: MediaQueryListEvent) {
  const isDark = e ? e.matches : darkQuery.matches;
  document.documentElement.classList.toggle("dark", isDark);
}

updateDarkClass();
darkQuery.addEventListener("change", updateDarkClass);

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
