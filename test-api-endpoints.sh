#!/bin/bash

# Set colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}ChasquiFX API Endpoint Diagnostic Tool${NC}"
echo -e "${BLUE}=======================================${NC}\n"

# Define the base API URL
API_URL="https://chasquifx-api.vercel.app"

# Test parameters for recommendations
DEPARTURE_AIRPORT="JFK"
OUTBOUND_DATE="2025-08-18"
RETURN_DATE="2025-08-25"

# Test Header
TEST_HEADER="Accept: application/json"

# Function to test an endpoint and show detailed output
test_endpoint() {
    local endpoint=$1
    local description=$2

    echo -e "\n${YELLOW}Testing: ${description}${NC}"
    echo -e "${BLUE}URL: ${API_URL}${endpoint}${NC}"

    # Make the request with verbose output
    RESPONSE=$(curl -s -v "${API_URL}${endpoint}" -H "$TEST_HEADER" 2>&1)

    # Extract status code
    STATUS_CODE=$(echo "$RESPONSE" | grep -o "< HTTP/[0-9.]* [0-9]*" | grep -o "[0-9][0-9][0-9]")

    if [[ $STATUS_CODE -ge 200 && $STATUS_CODE -lt 300 ]]; then
        echo -e "${GREEN}✅ Status: $STATUS_CODE OK${NC}"
    else
        echo -e "${RED}❌ Status: $STATUS_CODE Failed${NC}"
    fi

    # Show headers and response body separately
    echo -e "\n${BLUE}Response Headers:${NC}"
    echo "$RESPONSE" | grep -E "^< " | sed 's/< //g'

    echo -e "\n${BLUE}Response Body:${NC}"
    # Extract body (appears after all headers in verbose output)
    echo "$RESPONSE" | sed -n '/^* Connection/,${p}' | sed '1,3d'
}

# Function to check database connection status
check_db_status() {
    echo -e "\n${YELLOW}Checking Database Connection Status${NC}"
    echo -e "${BLUE}URL: ${API_URL}/api/db-status${NC}"

    DB_RESPONSE=$(curl -s "${API_URL}/api/db-status")

    if [[ $DB_RESPONSE == *"databaseConnected\":true"* ]]; then
        echo -e "${GREEN}✅ Database connected${NC}"
    else
        echo -e "${RED}❌ Database connection issue${NC}"
    fi

    # Format and display the JSON response
    echo -e "\n${BLUE}Database Status:${NC}"
    echo "$DB_RESPONSE" | python3 -m json.tool || echo "$DB_RESPONSE"
}

# Test health endpoint
test_endpoint "/health" "Basic Health Check"

# Test database status
check_db_status

# Test v2 forex status
test_endpoint "/api/v2/forex/status" "V2 Forex Status"

# Test v1 forex status
test_endpoint "/api/v1/forex/status" "V1 Forex Status"

# Test the recommendations endpoint with parameters
RECOMMENDATIONS_ENDPOINT="/api/v2/recommendations?departure_airport=${DEPARTURE_AIRPORT}&outbound_date=${OUTBOUND_DATE}&return_date=${RETURN_DATE}"
test_endpoint "$RECOMMENDATIONS_ENDPOINT" "V2 Recommendations API"

# Test v1 recommendations endpoint
RECOMMENDATIONS_V1_ENDPOINT="/api/v1/recommendations?departure_airport=${DEPARTURE_AIRPORT}&outbound_date=${OUTBOUND_DATE}&return_date=${RETURN_DATE}"
test_endpoint "$RECOMMENDATIONS_V1_ENDPOINT" "V1 Recommendations API"

echo -e "\n${BLUE}Diagnostic Tests Complete${NC}"
echo -e "${YELLOW}If endpoints are failing with 500 errors, check the server logs in Vercel dashboard for more details.${NC}"
echo -e "${YELLOW}You can also test with different parameters or add authorization headers if needed.${NC}"
