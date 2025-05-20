/**
 * Frontend API Test Script
 * Run this script in the browser console to test frontend-backend communication
 */

// Function to test API connectivity
async function testApiConnection() {
  const API_URL =
    process.env.REACT_APP_API_URL || "https://chasquifx-api.vercel.app";

  console.log("Testing API connectivity to:", API_URL);

  // Test 1: Basic health check
  try {
    const healthResponse = await fetch(`${API_URL}/health`);
    const healthData = await healthResponse.json();
    console.log("✅ Health check successful:", healthData);
  } catch (error) {
    console.error("❌ Health check failed:", error);
  }

  // Test 2: API v2 status
  try {
    const statusResponse = await fetch(`${API_URL}/api/v2/forex/status`);
    const statusData = await statusResponse.json();
    console.log("✅ API v2 status check successful:", statusData);
  } catch (error) {
    console.error("❌ API v2 status check failed:", error);
  }

  // Test 3: Check with auth headers (simulated)
  try {
    const headers = {
      "X-Serpapi-Key": "test-key",
      Authorization: "Bearer test-token",
    };
    const optionsResponse = await fetch(`${API_URL}/health`, {
      method: "OPTIONS",
      headers,
    });
    console.log("✅ OPTIONS request status:", optionsResponse.status);
    console.log(
      "✅ Access-Control-Allow-Headers:",
      optionsResponse.headers.get("Access-Control-Allow-Headers")
    );
  } catch (error) {
    console.error("❌ OPTIONS request failed:", error);
  }

  console.log("API tests complete.");
}

// Execute the test
testApiConnection().catch((err) => console.error("API test failed:", err));
