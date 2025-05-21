#!/bin/bash

# Deploy MongoDB Debug Endpoint
# This script deploys the MongoDB diagnostic endpoint to Vercel

# Define color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying MongoDB Diagnostic Endpoint${NC}"
echo "----------------------------------------"

# Check if we're in the repo root
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}Error: This script must be run from the repo root.${NC}"
    echo -e "${YELLOW}Please navigate to the repo root directory and try again.${NC}"
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

# Make sure we're logged in to Vercel
$VERCEL_CMD whoami &>/dev/null || $VERCEL_CMD login

# Navigate to API directory
cd backend/api

# Deploy only the debug endpoint
echo -e "${YELLOW}Deploying MongoDB debug endpoint to Vercel...${NC}"
$VERCEL_CMD deploy --prod -j '{
  "version": 2,
  "functions": {
    "api/debug/**/*.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "routes": [
    { "src": "/api/debug/(.*)", "dest": "/api/debug/$1" }
  ]
}'

# Get the deployment URL
DEPLOY_URL=$($VERCEL_CMD ls --prod | grep chasquifx-api | head -n 1 | awk '{print $2}')

if [ -z "$DEPLOY_URL" ]; then
    echo -e "${YELLOW}Could not automatically get deployment URL. Please check your Vercel dashboard.${NC}"
    echo -e "${YELLOW}The debug endpoint should be accessible at: https://chasquifx-api.vercel.app/api/debug/mongodb${NC}"
else
    echo -e "${GREEN}✅ Debug endpoint deployed to: ${DEPLOY_URL}/api/debug/mongodb${NC}"
fi

# Go back to the repo root
cd ../..

echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "1. Access the MongoDB diagnostic endpoint at: ${GREEN}https://chasquifx-api.vercel.app/api/debug/mongodb${NC}"
echo -e "2. Check the detailed diagnostic information"
echo -e "3. Fix the MongoDB connection issues based on the diagnostics"
echo -e "4. Deploy the full API again after fixing the issues"

echo -e "\n${GREEN}Deployment completed!${NC}"
