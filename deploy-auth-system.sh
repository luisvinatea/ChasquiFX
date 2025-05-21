#!/bin/bash

# Script to deploy user authentication and API key storage system
# This script installs the needed dependencies and configures environment variables

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}ChasquiFX User Auth & API Key Deployment${NC}"
echo -e "${BLUE}=====================================${NC}"

# Navigate to the API directory
cd backend/api || {
    echo -e "${RED}Error: API directory not found${NC}"
    exit 1
}

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install jsonwebtoken nodemailer --save || {
    echo -e "${RED}Error: Failed to install dependencies${NC}"
    exit 1
}
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Check for environment variables
echo -e "${YELLOW}Checking environment variables...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file with default values${NC}"
    touch .env
fi

# Check if required environment variables exist in .env, add them if not
ENV_UPDATED=false

# JWT Secret
if ! grep -q "JWT_SECRET" .env; then
    echo -e "\n# JWT Authentication" >>.env
    echo "JWT_SECRET=chasquifx-$(openssl rand -hex 16)" >>.env
    echo "JWT_EXPIRY=7d" >>.env
    ENV_UPDATED=true
fi

# Email configuration
if ! grep -q "SMTP_HOST" .env; then
    echo -e "\n# Email Configuration" >>.env
    echo "SMTP_HOST=smtp.example.com" >>.env
    echo "SMTP_PORT=587" >>.env
    echo "SMTP_SECURE=false" >>.env
    echo "SMTP_USER=username" >>.env
    echo "SMTP_PASSWORD=password" >>.env
    echo "EMAIL_FROM=\"ChasquiFX <no-reply@chasquifx.app>\"" >>.env
    echo "APP_URL=https://chasquifx-web.vercel.app" >>.env
    ENV_UPDATED=true
fi

# Encryption key for API keys
if ! grep -q "ENCRYPTION_KEY" .env; then
    echo -e "\n# API Key Encryption" >>.env
    echo "ENCRYPTION_KEY=chasquifx-$(openssl rand -hex 32)" >>.env
    ENV_UPDATED=true
fi

if [ "$ENV_UPDATED" = true ]; then
    echo -e "${GREEN}✓ Environment variables updated${NC}"
    echo -e "${YELLOW}Important: Update the SMTP settings in .env with your email provider credentials${NC}"
else
    echo -e "${GREEN}✓ All required environment variables exist${NC}"
fi

# Create directories if they don't exist
mkdir -p src/templates || {
    echo -e "${RED}Error: Failed to create templates directory${NC}"
    exit 1
}

echo -e "${GREEN}✓ Directory structure ready${NC}"

# Test MongoDB connection
echo -e "${YELLOW}Testing MongoDB connection...${NC}"
node -e "
const { connectToDatabase } = require('./src/db/mongodb.js');
(async () => {
  try {
    await connectToDatabase();
    console.log('${GREEN}✓ MongoDB connection successful${NC}');
    process.exit(0);
  } catch (error) {
    console.error('${RED}Error: MongoDB connection failed${NC}', error.message);
    process.exit(1);
  }
})();
" || {
    echo -e "${RED}MongoDB connection test failed${NC}"
    echo -e "${YELLOW}Please check your MongoDB credentials in the .env file${NC}"
}

echo -e "${GREEN}✓ Authentication system deployed successfully${NC}"
echo
echo -e "${BLUE}Next Steps:${NC}"
echo -e "1. Update the SMTP settings in .env with your email provider credentials"
echo -e "2. Deploy the API to Vercel using 'npm run deploy' or 'vercel deploy'"
echo -e "3. Test user registration at https://chasquifx-web.vercel.app/register"
echo
echo -e "${YELLOW}For testing email sending locally, the system will use ethereal.email if SMTP is not configured.${NC}"
echo -e "${YELLOW}Check the logs for ethereal.email test account credentials.${NC}"
