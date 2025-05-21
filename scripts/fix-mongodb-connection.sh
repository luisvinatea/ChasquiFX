#!/bin/bash

# Fix MongoDB Connection Script for ChasquiFX
# This script helps update MongoDB connection details to fix API errors

# Define color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 ChasquiFX MongoDB Connection Fix Tool${NC}"
echo "-------------------------------------------"
echo "This script will help you fix the MongoDB connection issues."
echo ""

# Check if we're in the repo root
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}Error: Script is not running from the expected location.${NC}"
    echo -e "${YELLOW}Please run this script from the root of the chasquifx repository.${NC}"
    exit 1
fi

# Navigate to the api directory
cd backend/api || exit

# Backup any existing .env file
if [ -f ".env" ]; then
    echo -e "${YELLOW}Found existing .env file. Creating backup...${NC}"
    # shellcheck disable=SC2046
    cp .env .env.backup.$(date +%Y%m%d%H%M%S)
fi

# Prompt for MongoDB credentials
echo -e "${YELLOW}Please enter your MongoDB Atlas credentials:${NC}"
read -p "MongoDB Username: " MONGODB_USER
read -sp "MongoDB Password: " MONGODB_PASSWORD
echo ""
read -p "MongoDB Host (default: chasquifx.ymxb5bs.mongodb.net): " MONGODB_HOST
MONGODB_HOST=${MONGODB_HOST:-chasquifx.ymxb5bs.mongodb.net}
read -p "MongoDB Database Name (default: chasquifx): " MONGODB_DBNAME
MONGODB_DBNAME=${MONGODB_DBNAME:-chasquifx}

# Generate a JWT secret if needed
JWT_SECRET=$(openssl rand -hex 16)

# Create new .env file with updated credentials
cat > .env << ENVEOF
# MongoDB Connection Settings
MONGODB_USER=${MONGODB_USER}
MONGODB_PASSWORD=${MONGODB_PASSWORD}
MONGODB_HOST=${MONGODB_HOST}
MONGODB_DBNAME=${MONGODB_DBNAME}

# JWT Auth Settings
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRY=7d

# Logging
LOG_LEVEL=debug

# Environment
NODE_ENV=production
ENVEOF

echo -e "${GREEN}✅ Created .env file with updated MongoDB connection details.${NC}"

# Create a test script to verify the MongoDB connection
cat > test-connection.js << 'JSEOF'
import { connectToDatabase } from "./src/db/mongodb-vercel.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testConnection() {
  console.log("Testing MongoDB connection...");
  
  try {
    const { db } = await connectToDatabase();
    console.log("✅ Successfully connected to MongoDB!");
    
    // Try a simple query
    try {
      const collections = await db.listCollections().toArray();
      console.log(`Found ${collections.length} collections:`);
      collections.forEach(coll => console.log(`- ${coll.name}`));
    } catch (queryError) {
      console.error(`Error querying collections: ${queryError.message}`);
    }
    
    console.log("Connection test completed successfully");
    return true;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    return false;
  }
}

// Run the test
testConnection()
  .then(success => {
    console.log(success ? "Test succeeded!" : "Test failed!");
    process.exit(success ? 0 : 1);
  });
JSEOF

# Run the test script
echo -e "${YELLOW}Testing MongoDB connection...${NC}"
node test-connection.js
TEST_RESULT=$?

# Clean up
rm test-connection.js

# Check the test result
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ MongoDB connection test successful!${NC}"
    
    # Ask if user wants to deploy to Vercel
    read -p "Do you want to deploy to Vercel now? (y/n): " DEPLOY_CHOICE
    if [[ $DEPLOY_CHOICE == "y" || $DEPLOY_CHOICE == "Y" ]]; then
        echo -e "${BLUE}Deploying to Vercel...${NC}"
        
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
        
        # Update environment variables in Vercel
        echo -e "${BLUE}Updating environment variables in Vercel...${NC}"
        $VERCEL_CMD env add MONGODB_USER
        $VERCEL_CMD env add MONGODB_PASSWORD
        $VERCEL_CMD env add MONGODB_HOST
        $VERCEL_CMD env add MONGODB_DBNAME
        $VERCEL_CMD env add JWT_SECRET
        
        # Deploy to Vercel
        echo -e "${BLUE}Deploying to Vercel...${NC}"
        $VERCEL_CMD --prod
        
        echo -e "${GREEN}✅ Deployment complete!${NC}"
    else
        echo -e "${YELLOW}Skipping deployment. To deploy manually, navigate to backend/api directory and run:${NC}"
        echo -e "${GREEN}vercel env add MONGODB_USER${NC}"
        echo -e "${GREEN}vercel env add MONGODB_PASSWORD${NC}"
        echo -e "${GREEN}vercel env add MONGODB_HOST${NC}"
        echo -e "${GREEN}vercel env add MONGODB_DBNAME${NC}"
        echo -e "${GREEN}vercel env add JWT_SECRET${NC}"
        echo -e "${GREEN}vercel --prod${NC}"
    fi
    
    # Return to the original directory
    cd ../..
    
    echo -e "\n${GREEN}MongoDB connection has been fixed successfully!${NC}"
    echo -e "${BLUE}Your API should now work correctly after deployment.${NC}"
else
    echo -e "${RED}❌ MongoDB connection test failed.${NC}"
    echo -e "${YELLOW}Please check the following:${NC}"
    echo -e "1. MongoDB Atlas credentials are correct"
    echo -e "2. MongoDB Atlas cluster is running (not paused)"
    echo -e "3. Your IP address is allowed in MongoDB Atlas Network Access settings"
    echo -e "4. The MongoDB host name is correct"
    
    # Return to the original directory
    cd ../..
    
    echo -e "\n${RED}Connection issues persist. Please review the error messages above.${NC}"
fi
