#!/bin/bash

# Set colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}ChasquiFX Recommendations API Fix Tool${NC}"
echo -e "${BLUE}=======================================${NC}\n"

# Change to the backend/api directory
cd /home/luisvinatea/DEVinatea/Repos/chasquifx/backend/api || {
    echo -e "${RED}❌ Failed to change directory to backend/api${NC}"
    exit 1
}

# Check recommendations API files
echo -e "${YELLOW}Checking Recommendations API files...${NC}"

# Check routes files
if [ -f "src/routes/recommendations-routes.js" ]; then
    echo -e "${GREEN}✅ Found recommendations routes file${NC}"
    echo -e "${BLUE}Contents of src/routes/recommendations-routes.js:${NC}"
    cat src/routes/recommendations-routes.js
else
    echo -e "${RED}❌ Recommendations routes file not found${NC}"
    echo -e "${YELLOW}Searching for recommendations files...${NC}"
    find src -type f -exec grep -l "recommendation" {} \;
fi

echo -e "\n${YELLOW}Checking controllers...${NC}"
if [ -f "src/controllers/recommendations.js" ]; then
    echo -e "${GREEN}✅ Found recommendations controller${NC}"
    echo -e "${BLUE}Contents of src/controllers/recommendations.js:${NC}"
    head -n 50 src/controllers/recommendations.js
    echo -e "${YELLOW}... (showing first 50 lines)${NC}"
else
    echo -e "${RED}❌ Recommendations controller not found${NC}"
    echo -e "${YELLOW}Searching for possible controllers...${NC}"
    find src/controllers -type f -print0 | xargs -0 head -n 1
fi

# Check API logs if they exist
echo -e "\n${YELLOW}Checking API logs for errors...${NC}"
if [ -f "../../../logs/node_error.log" ]; then
    echo -e "${GREEN}✅ Found error logs${NC}"
    echo -e "${BLUE}Recent errors:${NC}"
    tail -n 20 ../../../logs/node_error.log
else
    echo -e "${YELLOW}No error logs found in standard location${NC}"
fi

# Test local MongoDB connection if possible
echo -e "\n${YELLOW}Testing MongoDB connection...${NC}"
if [ -f "src/db/mongodb-client.js" ]; then
    echo -e "${GREEN}✅ Found MongoDB client file${NC}"
    echo -e "${YELLOW}Checking MongoDB connection configuration...${NC}"
    grep -i "mongodb\|connect\|url" src/db/mongodb-client.js
else
    echo -e "${RED}❌ MongoDB client file not found${NC}"
fi

echo -e "\n${BLUE}Fix recommendations:${NC}"
echo -e "1. Check that recommendations routes are correctly configured"
echo -e "2. Verify MongoDB connection is working (see test results above)"
echo -e "3. Check that the recommendations controller is handling errors properly"
echo -e "4. Ensure all required environment variables are set in Vercel"
echo -e "5. Look at the Vercel logs for detailed error information"

# Ask about deploying
echo -e "\n${YELLOW}After making fixes, you can deploy the changes.${NC}"
read -p "Deploy changes to Vercel now? (y/n): " deploy_answer

if [[ $deploy_answer == "y" || $deploy_answer == "Y" ]]; then
    echo -e "\n${BLUE}Deploying changes to Vercel...${NC}"
    # Login to Vercel (will be skipped if already logged in)
    vercel whoami || vercel login

    # Deploy to production
    vercel --prod

    echo -e "\n${GREEN}Deployment process completed!${NC}"
    echo -e "${YELLOW}It may take a few minutes for the changes to propagate.${NC}"
    echo -e "${YELLOW}After deployment, run ./test-api-endpoints.sh to verify API is working correctly.${NC}"
else
    echo -e "\n${YELLOW}No deployment initiated. Run ./deploy-api-cors-fix.sh manually when ready.${NC}"
fi
