#!/bin/bash

# Set colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}ChasquiFX Frontend Diagnostic Tool${NC}"
echo -e "${BLUE}===============================${NC}\n"

# Change to the frontend directory
cd /home/luisvinatea/DEVinatea/Repos/chasquifx/frontend || {
    echo -e "${RED}❌ Failed to change directory to frontend${NC}"
    exit 1
}

# Check API integration files
echo -e "${YELLOW}Checking API Integration Files...${NC}"

if [ -f "src/services/chasquiApi.js" ]; then
    echo -e "${GREEN}✅ Found main API service file${NC}"

    # Check API URL configuration
    echo -e "\n${YELLOW}Checking API URL configuration:${NC}"
    grep -n "API_BASE_URL\|baseURL" src/services/chasquiApi.js

    # Check error handling
    echo -e "\n${YELLOW}Checking API error handling:${NC}"
    grep -n "error\|catch\|try" src/services/chasquiApi.js | head -n 10
    echo -e "${YELLOW}... (showing first 10 error handling lines)${NC}"

    # Check recommendations API calls
    echo -e "\n${YELLOW}Checking recommendations API integration:${NC}"
    grep -n -A 20 "recommendations\|getRecommendations" src/services/chasquiApi.js
else
    echo -e "${RED}❌ API service file not found${NC}"
fi

# Check environment variables
echo -e "\n${YELLOW}Checking environment variables:${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ Found .env file${NC}"
    grep -v "^#" .env | grep -v "^$" | sort
else
    echo -e "${YELLOW}No .env file found, checking for environment variables in package.json:${NC}"
    grep -n "env\|ENV\|REACT_APP" package.json
fi

# Check for API keys storage
echo -e "\n${YELLOW}Checking API key handling:${NC}"
grep -r "apiKey\|API_KEY\|api-key\|api_key\|serpapi" src --include="*.js" | head -n 10
echo -e "${YELLOW}... (showing first 10 matches)${NC}"

# Show the list of dependencies
echo -e "\n${YELLOW}Checking project dependencies:${NC}"
jq '.dependencies' package.json

# Check for network request components
echo -e "\n${YELLOW}Finding components that make API requests:${NC}"
grep -r "fetch\|axios\|chasquiApi" src/components --include="*.js" | cut -d: -f1 | sort | uniq

echo -e "\n${BLUE}Frontend Test and Deployment Options:${NC}"
echo -e "1. Run ${GREEN}npm start${NC} to test locally"
echo -e "2. Run ${GREEN}npm test${NC} to run automated tests"
echo -e "3. Run ${GREEN}npm run build${NC} to create a production build"
echo -e "4. Deploy to Vercel with ${GREEN}vercel --prod${NC}"

# Ask about debugging recommendations
echo -e "\n${YELLOW}For recommendations API issues:${NC}"
echo -e "1. Check the browser console when making requests"
echo -e "2. Run the test-api-endpoints.sh script to check API status"
echo -e "3. Check that API keys are correctly configured"
echo -e "4. Verify database is properly connected"
echo -e "5. Look for error handling in src/services/chasquiApi.js"

echo -e "\n${GREEN}Diagnostic complete! See above results to help diagnose and fix frontend issues.${NC}"
