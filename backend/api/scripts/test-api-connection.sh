#!/bin/bash
# Test script for checking the integration between frontend and backend

# Check if the backend API is running
echo "Testing backend API connection..."
curl -s http://localhost:3001/health | grep status

# Test CORS headers (important for frontend-backend communication)
echo -e "\nChecking CORS headers..."
curl -s -I -X OPTIONS http://localhost:3001/health | grep -i "Access-Control"

# Test a specific API endpoint
echo -e "\nTesting API endpoint..."
curl -s http://localhost:3001/api/v2/forex/status | grep status

echo -e "\nIf all tests show results, the API appears to be working correctly."
echo "If you see no output for some tests, check that:"
echo "1. The backend server is running"
echo "2. The API endpoints are correctly set up"
echo "3. CORS is configured properly"
