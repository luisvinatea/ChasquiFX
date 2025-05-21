#!/bin/bash

# Set colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}ChasquiFX Recommendations Controller Diagnosis${NC}"
echo -e "${BLUE}===========================================${NC}\n"

# Change to the backend/api directory
cd /home/luisvinatea/DEVinatea/Repos/chasquifx/backend/api || {
    echo -e "${RED}❌ Failed to change directory to backend/api${NC}"
    exit 1
}

# Check for the recommendations controller
if [ -f "src/controllers/recommendations-controller.js" ]; then
    echo -e "${GREEN}✅ Found recommendations controller file${NC}"

    # Display the file content
    echo -e "\n${YELLOW}Recommendations Controller Content:${NC}"
    cat src/controllers/recommendations-controller.js

    # Look for specific error patterns
    echo -e "\n${YELLOW}Checking for potential issues:${NC}"

    # Check for missing imports
    if ! grep -q "import.*from.*db" src/controllers/recommendations-controller.js; then
        echo -e "${RED}❌ Possible missing database import${NC}"
    fi

    # Check for error handling
    if ! grep -q "try.*catch" src/controllers/recommendations-controller.js; then
        echo -e "${RED}❌ Missing try/catch error handling${NC}"
    else
        echo -e "${GREEN}✅ Found try/catch error handling${NC}"
    fi

    # Check for database connections
    if ! grep -q "connect\|MongoDB\|initMongoDB" src/controllers/recommendations-controller.js; then
        echo -e "${RED}❌ No explicit database connection found${NC}"
    fi
else
    echo -e "${RED}❌ Recommendations controller file NOT FOUND${NC}"

    # Search for files that might contain recommendations controller code
    echo -e "\n${YELLOW}Searching for files that might contain recommendations controller code:${NC}"
    find src/controllers -type f -exec grep -l "recommendation\|getRecommendations" {} \;
fi

# Check the route setup
echo -e "\n${YELLOW}Route Setup:${NC}"
if [ -f "src/routes/route-setup.js" ]; then
    echo -e "${GREEN}✅ Found route setup file${NC}"
    grep -n -A 5 "recommendations" src/routes/route-setup.js
else
    echo -e "${RED}❌ Route setup file not found${NC}"
fi

# Check MongoDB environment variables
echo -e "\n${YELLOW}Checking MongoDB Environment Variables:${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ Found .env file${NC}"
    grep -i "mongodb\|mongo" .env | sort
else
    echo -e "${YELLOW}No .env file found in backend/api${NC}"
    echo -e "${YELLOW}Environment variables should be set in Vercel dashboard${NC}"
fi

# Check for MongoDB client
echo -e "\n${YELLOW}MongoDB Client Usage:${NC}"
if [ -f "src/db/mongodb-client.js" ]; then
    echo -e "${GREEN}✅ Found MongoDB client file${NC}"
    # Look at function exports that should be used by controllers
    grep -n "export" src/db/mongodb-client.js | head -n 5

    # Check if controllers are using the database client correctly
    echo -e "\n${YELLOW}Checking if recommendations controller uses MongoDB client:${NC}"
    if [ -f "src/controllers/recommendations-controller.js" ]; then
        if grep -q "mongodb-client" src/controllers/recommendations-controller.js; then
            echo -e "${GREEN}✅ Controller imports MongoDB client${NC}"
        else
            echo -e "${RED}❌ Controller might not be importing MongoDB client${NC}"
        fi
    fi
fi

# Check for MongoDB Vercel adapter
echo -e "\n${YELLOW}MongoDB Vercel Adapter:${NC}"
if [ -f "src/db/mongodb-vercel.js" ]; then
    echo -e "${GREEN}✅ Found MongoDB Vercel adapter${NC}"
    grep -n "export\|connect" src/db/mongodb-vercel.js | head -n 5
fi

echo -e "\n${BLUE}Recommendations Controller Fix Options:${NC}"
echo -e "1. Ensure appropriate MongoDB connection handling in the controller"
echo -e "2. Add proper error handling and logging"
echo -e "3. Verify environment variables in Vercel dashboard"
echo -e "4. Check for syntax errors in the controller code"
echo -e "5. Add debug logging to trace execution path"

echo -e "\n${YELLOW}Would you like to examine the controller code and attempt a fix?${NC}"
read -p "Proceed with controller examination? (y/n): " fix_answer

if [[ $fix_answer == "y" || $fix_answer == "Y" ]]; then
    # Create a backup of the controller if it exists
    if [ -f "src/controllers/recommendations-controller.js" ]; then
        cp src/controllers/recommendations-controller.js src/controllers/recommendations-controller.js.bak
        echo -e "\n${GREEN}✅ Created backup of recommendations controller${NC}"

        # Open it in the default editor for examination
        echo -e "\n${BLUE}Opening recommendations controller for examination...${NC}"
        if command -v code &>/dev/null; then
            code src/controllers/recommendations-controller.js
        else
            echo -e "${YELLOW}Visual Studio Code not found. Opening with default editor:${NC}"
            xdg-open src/controllers/recommendations-controller.js 2>/dev/null || open src/controllers/recommendations-controller.js 2>/dev/null || echo -e "${RED}Failed to open editor${NC}"
        fi
    fi
else
    echo -e "\n${YELLOW}No modifications made to controller code${NC}"
fi

echo -e "\n${BLUE}Diagnosis Complete!${NC}"
echo -e "${BLUE}Use the information above to fix the recommendations controller${NC}"
