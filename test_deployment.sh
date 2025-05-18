#!/bin/bash
# ChasquiFX Deployment Test Script
# This script tests connectivity between frontend and backend deployments

# Text formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Default URLs (can be overridden with command line arguments)
BACKEND_URL=${1:-"https://chasquifx.vercel.app"}
FRONTEND_URL=${2:-"https://chasquifx.github.io"}

echo -e "${BOLD}ChasquiFX Deployment Test${NC}"
echo "--------------------------------"
echo "Testing backend: $BACKEND_URL"
echo "Testing frontend: $FRONTEND_URL"
echo "--------------------------------"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Ensure we have curl installed
if ! command_exists curl; then
    echo -e "${RED}Error: curl is required but not installed. Please install curl and try again.${NC}"
    exit 1
fi

# Test 1: Backend health check
echo -e "\n${BOLD}Test 1: Backend Health Check${NC}"
HEALTH_CHECK=$(curl -s -w "%{http_code}" "$BACKEND_URL/" -o /dev/null)
if [ "$HEALTH_CHECK" == "200" ]; then
    echo -e "${GREEN}✓ Backend is healthy ($HEALTH_CHECK)${NC}"
else
    echo -e "${RED}✗ Backend health check failed: HTTP $HEALTH_CHECK${NC}"
    echo "  Try checking your backend URL or verifying that the backend is deployed correctly."
fi

# Test 2: API status endpoint
echo -e "\n${BOLD}Test 2: API Status Endpoint${NC}"
STATUS_RESPONSE=$(curl -s "$BACKEND_URL/api/forex/status")
if [[ $STATUS_RESPONSE == *"status"* ]]; then
    echo -e "${GREEN}✓ Status endpoint is accessible${NC}"

    # Check for quota exceeded
    if [[ $STATUS_RESPONSE == *"quota_exceeded"*"true"* ]]; then
        echo -e "${YELLOW}⚠ SerpAPI quota is currently exceeded${NC}"
    fi

    # Check if API keys are configured
    if [[ $STATUS_RESPONSE == *"has_api_key"*"true"* ]]; then
        echo -e "${GREEN}✓ SerpAPI key is configured${NC}"
    else
        echo -e "${YELLOW}⚠ No SerpAPI key configured${NC}"
    fi
else
    echo -e "${RED}✗ Status endpoint check failed${NC}"
    echo "  Response: $STATUS_RESPONSE"
fi

# Test 3: Frontend can access backend
echo -e "\n${BOLD}Test 3: Frontend Access Test${NC}"
echo "Checking if frontend can access backend (CORS test)..."

# Use curl to simulate an AJAX request from the frontend to the backend
CORS_TEST=$(curl -s -I -H "Origin: $FRONTEND_URL" -X OPTIONS "$BACKEND_URL/api/forex/status" | grep -i "access-control-allow-origin")

if [[ -n "$CORS_TEST" ]]; then
    echo -e "${GREEN}✓ CORS is properly configured${NC}"
    echo "  $CORS_TEST"
else
    echo -e "${RED}✗ CORS check failed. Frontend may not be able to access backend.${NC}"
    echo "  Please check CORS configuration in backend/api/vercel_handler.py"
fi

# Test 4: Check if .env files are correctly configured
echo -e "\n${BOLD}Test 4: Environment Configuration Check${NC}"
if [ -f "./frontend/.env.production" ]; then
    FRONTEND_API_URL=$(grep "REACT_APP_API_URL" ./frontend/.env.production | cut -d '=' -f2)
    if [[ "$FRONTEND_API_URL" == "$BACKEND_URL" ]]; then
        echo -e "${GREEN}✓ Frontend API URL is correctly set to $BACKEND_URL${NC}"
    else
        echo -e "${YELLOW}⚠ Frontend API URL ($FRONTEND_API_URL) doesn't match backend URL ($BACKEND_URL)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No .env.production file found in frontend directory${NC}"
fi

# Test 5: Check frontend build
echo -e "\n${BOLD}Test 5: Frontend Build Check${NC}"
if [ -d "./frontend/build" ]; then
    if [ -f "./frontend/build/index.html" ]; then
        # Check if any main JS file exists
        js_file_exists=false
        for file in ./frontend/build/static/js/main.*.js; do
            if [ -f "$file" ]; then
                js_file_exists=true
                break
            fi
        done
        
        if [ "$js_file_exists" = true ]; then
            echo -e "${GREEN}✓ Frontend is built and ready for deployment${NC}"
        else
            echo -e "${YELLOW}⚠ Frontend build may be incomplete${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Frontend build may be incomplete${NC}"
    fi

    # Check for correct homepage setting in package.json
    HOMEPAGE=$(grep "homepage" ./frontend/package.json || echo "")
    if [[ "$HOMEPAGE" == *"github.io"* || "$HOMEPAGE" == *"vercel.app"* ]]; then
        echo -e "${GREEN}✓ Homepage is configured in package.json${NC}"
    else
        echo -e "${YELLOW}⚠ Homepage might not be properly configured in package.json${NC}"
        echo "  This is required for correct asset paths when deploying to GitHub Pages or Vercel"
    fi
else
    echo -e "${YELLOW}⚠ Frontend build directory not found. Run 'npm run build' in the frontend directory.${NC}"
fi

# Summary
echo -e "\n${BOLD}Deployment Test Summary${NC}"
echo "--------------------------------"
echo -e "Backend: $BACKEND_URL"
echo -e "Frontend: $FRONTEND_URL"

if [ "$HEALTH_CHECK" == "200" ] && [[ -n "$CORS_TEST" ]]; then
    echo -e "\n${GREEN}${BOLD}✓ Basic connectivity tests passed.${NC}"
    echo -e "Your deployment appears to be configured correctly."
else
    echo -e "\n${YELLOW}${BOLD}⚠ Some tests failed.${NC}"
    echo -e "Please review the test results and make necessary adjustments."
fi

echo -e "\nFor more information, see VERCEL_DEPLOYMENT.md"
