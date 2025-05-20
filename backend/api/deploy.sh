#!/bin/bash

# Direct deployment script for ChasquiFX API
# Run this script from within the api directory

# Define color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting ChasquiFX API direct deployment...${NC}"

# Check if we're in the api directory
if [ "$(basename "$(pwd)")" != "api" ]; then
    echo -e "${RED}Error: This script must be run from the api directory${NC}"
    echo -e "${YELLOW}Please navigate to the api directory and try again:${NC}"
    echo -e "${YELLOW}  cd backend/api${NC}"
    exit 1
fi

# Check for vercel command
if command -v vercel &>/dev/null; then
    VERCEL_CMD="vercel"
elif [ -f "./node_modules/.bin/vercel" ]; then
    VERCEL_CMD="./node_modules/.bin/vercel"
else
    echo -e "${YELLOW}Vercel CLI not found. Installing locally...${NC}"
    npm install vercel --save-dev
    VERCEL_CMD="./node_modules/.bin/vercel"
fi

# Login to Vercel if not already logged in
$VERCEL_CMD whoami &>/dev/null || $VERCEL_CMD login

# Deploy to production with debug output
echo -e "${BLUE}🔄 Deploying to Vercel...${NC}"
$VERCEL_CMD --prod --debug || {
    echo -e "${RED}❌ Deployment failed with error code $?${NC}"
    echo -e "${YELLOW}Trying again with build command to see detailed errors...${NC}"
    $VERCEL_CMD build --prod --debug
}

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${GREEN}🌐 Your API should now be accessible from: https://chasquifx-api.vercel.app${NC}"
echo -e "${BLUE}📝 Check the logs to ensure the deployment was successful${NC}"
echo -e "${BLUE}📋 If you encounter CORS issues, refer to the documentation in docs/cors-configuration-guide.md${NC}"

exit 0
