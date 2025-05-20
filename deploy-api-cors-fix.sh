#!/bin/bash

# Set colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Deploying updated ChasquiFX API to Vercel${NC}"

# Change to the backend/api directory
cd /home/luisvinatea/DEVinatea/Repos/chasquifx/backend/api || {
    echo -e "${RED}❌ Failed to change directory to backend/api${NC}"
    exit 1
}

# Check if Vercel CLI is installed
if ! command -v vercel &>/dev/null; then
    echo -e "${RED}❌ Vercel CLI is not installed. Installing it now...${NC}"
    npm install -g vercel
fi

# Login to Vercel (will be skipped if already logged in)
echo -e "${BLUE}Ensuring you're logged into Vercel...${NC}"
vercel whoami || vercel login

# Deploy to production
echo -e "${BLUE}Deploying to production...${NC}"
vercel --prod

echo -e "\n${GREEN}Deployment process completed!${NC}"
echo -e "${GREEN}It may take a few minutes for the changes to propagate.${NC}"
echo -e "${GREEN}After deployment, run ./test-cors-config.sh to verify CORS is working correctly.${NC}"
