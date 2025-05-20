#!/bin/bash

# Set colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}ChasquiFX Environment Variables Checker${NC}"
echo -e "${BLUE}=====================================${NC}\n"

# Check Vercel deployment environment variables
echo -e "${YELLOW}This tool helps check if your environment variables are correctly set for Vercel${NC}"
echo -e "${YELLOW}It saves the variables to a .env.vercel file that you can reference when setting up Vercel${NC}\n"

# Change to the backend/api directory
cd /home/luisvinatea/DEVinatea/Repos/chasquifx/backend/api || {
    echo -e "${RED}❌ Failed to change directory to backend/api${NC}"
    exit 1
}

# Check for existing .env file
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ Found .env file${NC}"
    ENV_FILE=".env"
else
    echo -e "${YELLOW}No .env file found in backend/api${NC}"
    echo -e "${YELLOW}Creating an empty .env file${NC}"
    touch .env
    ENV_FILE=".env"
fi

# Create a new file for Vercel environment variables
VERCEL_ENV_FILE=".env.vercel"
echo "# Vercel Environment Variables - Generated on $(date)" >"$VERCEL_ENV_FILE"
echo "# Copy these to your Vercel project settings" >>"$VERCEL_ENV_FILE"
echo "" >>"$VERCEL_ENV_FILE"

# Check for MongoDB environment variables
echo -e "\n${YELLOW}Checking MongoDB environment variables...${NC}"
MONGODB_USER=$(grep "MONGODB_USER" "$ENV_FILE" | cut -d '=' -f2)
MONGODB_PASSWORD=$(grep "MONGODB_PASSWORD" "$ENV_FILE" | cut -d '=' -f2)
MONGODB_HOST=$(grep "MONGODB_HOST" "$ENV_FILE" | cut -d '=' -f2)
MONGODB_DBNAME=$(grep "MONGODB_DBNAME" "$ENV_FILE" | cut -d '=' -f2)
MONGODB_URI=$(grep "MONGODB_URI" "$ENV_FILE" | cut -d '=' -f2)

# Add MongoDB variables to Vercel env file
echo "# MongoDB Configuration" >>"$VERCEL_ENV_FILE"
if [ -n "$MONGODB_USER" ]; then
    echo -e "${GREEN}✅ MONGODB_USER is set${NC}"
    echo "MONGODB_USER=$MONGODB_USER" >>"$VERCEL_ENV_FILE"
else
    echo -e "${RED}❌ MONGODB_USER is not set${NC}"
    read -p "Enter MongoDB username: " input_user
    MONGODB_USER=$input_user
    echo "MONGODB_USER=$MONGODB_USER" >>"$VERCEL_ENV_FILE"
fi

if [ -n "$MONGODB_PASSWORD" ]; then
    echo -e "${GREEN}✅ MONGODB_PASSWORD is set${NC}"
    echo "MONGODB_PASSWORD=$MONGODB_PASSWORD" >>"$VERCEL_ENV_FILE"
else
    echo -e "${RED}❌ MONGODB_PASSWORD is not set${NC}"
    read -p "Enter MongoDB password: " input_password
    MONGODB_PASSWORD=$input_password
    echo "MONGODB_PASSWORD=$MONGODB_PASSWORD" >>"$VERCEL_ENV_FILE"
fi

if [ -n "$MONGODB_HOST" ]; then
    echo -e "${GREEN}✅ MONGODB_HOST is set${NC}"
    echo "MONGODB_HOST=$MONGODB_HOST" >>"$VERCEL_ENV_FILE"
else
    echo -e "${RED}❌ MONGODB_HOST is not set${NC}"
    read -p "Enter MongoDB host (default: chasquifx.ymxb5bs.mongodb.net): " input_host
    MONGODB_HOST=${input_host:-chasquifx.ymxb5bs.mongodb.net}
    echo "MONGODB_HOST=$MONGODB_HOST" >>"$VERCEL_ENV_FILE"
fi

if [ -n "$MONGODB_DBNAME" ]; then
    echo -e "${GREEN}✅ MONGODB_DBNAME is set${NC}"
    echo "MONGODB_DBNAME=$MONGODB_DBNAME" >>"$VERCEL_ENV_FILE"
else
    echo -e "${RED}❌ MONGODB_DBNAME is not set${NC}"
    read -p "Enter MongoDB database name (default: chasquifx): " input_dbname
    MONGODB_DBNAME=${input_dbname:-chasquifx}
    echo "MONGODB_DBNAME=$MONGODB_DBNAME" >>"$VERCEL_ENV_FILE"
fi

# Construct MongoDB URI if not present
if [ -z "$MONGODB_URI" ]; then
    MONGODB_URI="mongodb+srv://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}/${MONGODB_DBNAME}?retryWrites=true&w=majority&appName=ChasquiFX"
fi

echo "MONGODB_URI=$MONGODB_URI" >>"$VERCEL_ENV_FILE"
echo "" >>"$VERCEL_ENV_FILE"

# Check for API keys
echo -e "\n${YELLOW}Checking API keys...${NC}"
SERPAPI_KEY=$(grep "SERPAPI_KEY" "$ENV_FILE" | cut -d '=' -f2)
SEARCH_API_KEY=$(grep "SEARCH_API_KEY" "$ENV_FILE" | cut -d '=' -f2)

# Add API keys to Vercel env file
echo "# API Keys" >>"$VERCEL_ENV_FILE"

if [ -n "$SERPAPI_KEY" ]; then
    echo -e "${GREEN}✅ SERPAPI_KEY is set${NC}"
    echo "SERPAPI_KEY=$SERPAPI_KEY" >>"$VERCEL_ENV_FILE"
else
    echo -e "${YELLOW}⚠️ SERPAPI_KEY is not set${NC}"
    read -p "Enter SerpAPI key (leave blank if not using): " input_serpapi
    if [ -n "$input_serpapi" ]; then
        echo "SERPAPI_KEY=$input_serpapi" >>"$VERCEL_ENV_FILE"
    else
        echo "# SERPAPI_KEY=your_key_here" >>"$VERCEL_ENV_FILE"
    fi
fi

if [ -n "$SEARCH_API_KEY" ]; then
    echo -e "${GREEN}✅ SEARCH_API_KEY is set${NC}"
    echo "SEARCH_API_KEY=$SEARCH_API_KEY" >>"$VERCEL_ENV_FILE"
else
    echo -e "${YELLOW}⚠️ SEARCH_API_KEY is not set${NC}"
    read -p "Enter Search API key (leave blank if not using): " input_searchapi
    if [ -n "$input_searchapi" ]; then
        echo "SEARCH_API_KEY=$input_searchapi" >>"$VERCEL_ENV_FILE"
    else
        echo "# SEARCH_API_KEY=your_key_here" >>"$VERCEL_ENV_FILE"
    fi
fi

echo "" >>"$VERCEL_ENV_FILE"
echo "# Other Environment Variables" >>"$VERCEL_ENV_FILE"
echo "NODE_ENV=production" >>"$VERCEL_ENV_FILE"
echo "LOG_LEVEL=info" >>"$VERCEL_ENV_FILE"

echo -e "\n${GREEN}✅ Environment variables have been saved to ${VERCEL_ENV_FILE}${NC}"
echo -e "${YELLOW}Use this file to set up your Vercel environment variables${NC}"
echo -e "${BLUE}Remember to add these variables in the Vercel dashboard:${NC}"
echo -e "1. Go to your project in the Vercel dashboard"
echo -e "2. Navigate to Settings > Environment Variables"
echo -e "3. Add each variable from ${VERCEL_ENV_FILE}"
echo -e "4. Deploy your project again once variables are set${NC}"

echo -e "\n${BLUE}After configuring environment variables, execute the following command to deploy:${NC}"
echo -e "${GREEN}./deploy-when-ready.sh${NC}"
