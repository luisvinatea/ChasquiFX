#!/bin/bash

# ChasquiFX Backend API Deployment Script
# This script deploys the backend API to Vercel with the updated CORS configuration

# Define color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting ChasquiFX API deployment...${NC}"

# Navigate to the backend API directory
cd "$(dirname "$0")" || exit
cd backend/api || exit

# Check for file conflicts that might cause deployment issues
echo -e "${BLUE}🔍 Checking for potential file conflicts...${NC}"

# Check for files with same name but different extensions in scripts directory
check_conflicts() {
    local CONFLICTS=0

    echo "Checking directory: $1"

    # Get all file basenames without extensions
    local BASENAMES
    BASENAMES=$(find "$1" -type f | rev | cut -d. -f2- | cut -d/ -f1 | rev | sort | uniq -d)

    if [ -n "$BASENAMES" ]; then
        echo -e "${RED}⚠️ Potential file conflicts detected:${NC}"

        for basename in $BASENAMES; do
            echo -e "${YELLOW}Files with base name '$basename':${NC}"
            find "$1" -type f -name "$basename.*" | while read -r file; do
                echo "  - $file"
            done
            CONFLICTS=1
        done
    fi

    return $CONFLICTS
}

# Check for Mixed Routing Properties in vercel.json
echo -e "${BLUE}🔍 Checking vercel.json configuration...${NC}"
if grep -q '"routes":' vercel.json && (grep -q '"rewrites":' vercel.json || grep -q '"headers":' vercel.json); then
    echo -e "${RED}⚠️ Mixed Routing Properties detected in vercel.json!${NC}"
    echo -e "${YELLOW}Error: You are using both new and legacy routing properties.${NC}"
    echo -e "${YELLOW}Please use only the modern format with 'rewrites', 'headers', etc.${NC}"
    echo -e "${YELLOW}See https://vercel.com/docs/errors/error-list#mixed-routing-properties${NC}"

    read -p "Do you want to continue with deployment anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment aborted.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ vercel.json routing properties look good${NC}"
fi

# Ensure Vercel CLI is installed
if ! command -v vercel &>/dev/null; then
    echo -e "${YELLOW}⚠️ Vercel CLI is not installed. Installing it now...${NC}"
    
    # Try with npm and handle permission errors
    if ! npm install -g vercel; then
        echo -e "${YELLOW}Permission issue detected. Trying with npm with sudo...${NC}"
        echo -e "${YELLOW}You may be prompted for your password.${NC}"
        
        # Ask for confirmation before using sudo
        read -p "Do you want to install Vercel CLI with sudo? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo npm install -g vercel
        else
            echo -e "${YELLOW}Alternative: Installing Vercel CLI locally in the project...${NC}"
            npm install vercel --save-dev
        fi
    fi
fi

# Check if Vercel is available now
if command -v vercel &>/dev/null; then
    VERCEL_CMD="vercel"
elif [ -f "./node_modules/.bin/vercel" ]; then
    VERCEL_CMD="./node_modules/.bin/vercel"
else
    echo -e "${RED}❌ Unable to install or find Vercel CLI${NC}"
    echo -e "${YELLOW}Please install Vercel CLI manually with:${NC}"
    echo -e "${YELLOW}  npm install -g vercel${NC}"
    echo -e "${YELLOW}  or${NC}"
    echo -e "${YELLOW}  npm install vercel --save-dev${NC}"
    exit 1
fi

echo "✅ Vercel CLI is ready"

# Run conflict checks
CONFLICT_FOUND=0

# Check scripts directory for conflicts
check_conflicts "scripts" || CONFLICT_FOUND=1
check_conflicts "src" || CONFLICT_FOUND=1
check_conflicts "api" || CONFLICT_FOUND=1

if [ $CONFLICT_FOUND -eq 1 ]; then
    echo -e "${RED}⛔ File conflicts detected that may cause deployment issues${NC}"
    echo -e "${YELLOW}Please rename conflicting files to have unique names (including the base name without extension)${NC}"

    read -p "Do you want to continue with deployment anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment aborted.${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Continuing with deployment despite conflicts...${NC}"
else
    echo -e "${GREEN}✅ No file conflicts detected${NC}"
fi

# Login to Vercel if not already logged in
$VERCEL_CMD whoami &>/dev/null || $VERCEL_CMD login

# Deploy to production
echo -e "${BLUE}🔄 Deploying to Vercel...${NC}"
$VERCEL_CMD --prod

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${GREEN}🌐 Your API should now be accessible from: https://chasquifx-api.vercel.app${NC}"
echo -e "${BLUE}📝 Check the logs to ensure the deployment was successful${NC}"
echo -e "${BLUE}📋 If you encounter CORS issues, refer to the documentation in backend/api/docs/cors-configuration-guide.md${NC}"

exit 0
