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

# Initial diagnostics
echo -e "${BLUE}Running initial diagnostics...${NC}"

# Function to test API endpoints
test_endpoints() {
  echo -e "${YELLOW}Testing /api/forex endpoint...${NC}"
  RESPONSE=$(curl -s https://chasquifx-api.vercel.app/api/forex)
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://chasquifx-api.vercel.app/api/forex)

  if [ "$STATUS_CODE" == "200" ]; then
    echo -e "${GREEN}✓ Forex endpoint is working (HTTP 200)${NC}"
    return 0
  else
    echo -e "${RED}✗ Forex endpoint returned HTTP $STATUS_CODE${NC}"

    # If the endpoint returns 500, extract error message
    if [ "$STATUS_CODE" == "500" ] && [[ "$RESPONSE" == *"error"* ]]; then
      ERROR_MSG=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | head -1 | sed 's/"message":"//g' | sed 's/"//g')
      echo -e "${RED}Error message: $ERROR_MSG${NC}"
    fi

    return 1
  fi
}

# Function to check DB status
check_db_status() {
  echo -e "${YELLOW}Testing /api/db-status endpoint...${NC}"
  RESPONSE=$(curl -s https://chasquifx-api.vercel.app/api/db-status)
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://chasquifx-api.vercel.app/api/db-status)

  if [ "$STATUS_CODE" == "200" ] && [[ "$RESPONSE" == *"\"status\":\"connected\""* ]]; then
    echo -e "${GREEN}✓ Database status endpoint is working (HTTP 200)${NC}"
    echo -e "${YELLOW}Note: This contradicts the forex endpoint error, which suggests partial connection issues.${NC}"
    return 0
  else
    echo -e "${RED}✗ Database status endpoint returned HTTP $STATUS_CODE${NC}"
    return 1
  fi
}

# Run diagnostic tests
test_endpoints
check_db_status

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
cat >.env <<ENVEOF
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
cat >test-connection.js <<'JSEOF'
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
      
      // Try to do one query on a collection if it exists
      if (collections.some(c => c.name === 'forex')) {
        const count = await db.collection('forex').countDocuments();
        console.log(`Forex collection has ${count} documents`);
      }
    } catch (queryError) {
      console.error(`Error querying collections: ${queryError.message}`);
    }
    
    console.log("Connection test completed successfully");
    return true;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    if (error.message.includes("authentication failed")) {
      console.error("❌ Authentication failed - incorrect username or password");
    } else if (error.message.includes("timed out")) {
      console.error("❌ Connection timed out - possible network or firewall issue");
    } else if (error.message.includes("ENOTFOUND") || error.message.includes("no such host")) {
      console.error("❌ Host not found - incorrect MongoDB Atlas hostname");
    }
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

    # Link to project if needed
    $VERCEL_CMD link || {
      echo -e "${YELLOW}Linking to Vercel project...${NC}"
      $VERCEL_CMD link
    }

    # Update environment variables in Vercel
    echo -e "${BLUE}Updating environment variables in Vercel...${NC}"

    # Remove existing variables first to avoid conflicts
    echo -e "${YELLOW}Removing old environment variables...${NC}"
    $VERCEL_CMD env rm MONGODB_USER -y &>/dev/null
    $VERCEL_CMD env rm MONGODB_PASSWORD -y &>/dev/null
    $VERCEL_CMD env rm MONGODB_HOST -y &>/dev/null
    $VERCEL_CMD env rm MONGODB_DBNAME -y &>/dev/null
    $VERCEL_CMD env rm JWT_SECRET -y &>/dev/null

    # Add new variables with explicit placement
    echo -e "${YELLOW}Adding new environment variables...${NC}"
    $VERCEL_CMD env add MONGODB_USER -y <<< "$MONGODB_USER"
    $VERCEL_CMD env add MONGODB_PASSWORD -y <<< "$MONGODB_PASSWORD"
    $VERCEL_CMD env add MONGODB_HOST -y <<< "$MONGODB_HOST"
    $VERCEL_CMD env add MONGODB_DBNAME -y <<< "$MONGODB_DBNAME"
    $VERCEL_CMD env add JWT_SECRET -y <<< "$JWT_SECRET"

    # Deploy to Vercel
    echo -e "${BLUE}Deploying to Vercel...${NC}"
    
    # Ensure we're in the right directory
    echo -e "${YELLOW}Deploying API from current directory...${NC}"
    
    # First create a .env.production file for deployment
    echo -e "${YELLOW}Creating deployment environment file...${NC}"
    cat > .env.production << ENVEOF
MONGODB_USER=${MONGODB_USER}
MONGODB_PASSWORD=${MONGODB_PASSWORD}
MONGODB_HOST=${MONGODB_HOST}
MONGODB_DBNAME=${MONGODB_DBNAME}
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
LOG_LEVEL=debug
ENVEOF
    
    # Deploy with environment variables
    $VERCEL_CMD deploy --prod --yes

    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo -e "${YELLOW}It may take a few minutes for the changes to propagate.${NC}"
    echo -e "${YELLOW}Run ./scripts/test-mongodb-connection.sh in 5 minutes to verify the fix.${NC}"
  else
    echo -e "${YELLOW}Skipping deployment. To deploy manually, navigate to backend/api directory and run:${NC}"
    echo "vercel env add MONGODB_USER"
    echo "vercel env add MONGODB_PASSWORD"
    echo "vercel env add MONGODB_HOST"
    echo "vercel env add MONGODB_DBNAME"
    echo "vercel env add JWT_SECRET"
    echo "vercel --prod"
  fi

  # Return to the original directory
  cd ../..

  echo -e "\n${GREEN}MongoDB connection has been fixed successfully!${NC}"
  echo -e "${BLUE}Your API should now work correctly after deployment.${NC}"
else
  echo -e "${RED}❌ MongoDB connection test failed.${NC}"
  echo -e "${YELLOW}Please check the following:${NC}"
  echo "1. MongoDB Atlas credentials are correct"
  echo "2. MongoDB Atlas cluster is running (not paused)"
  echo "3. Your IP address is allowed in MongoDB Atlas Network Access settings"
  echo "4. The MongoDB host name is correct"

  # Return to the original directory
  cd ../..

  echo -e "\n${RED}Connection issues persist. Please review the error messages above.${NC}"
fi
