#!/bin/bash

# ChasquiFX Vercel MongoDB Diagnostic Tool
# This script helps diagnose MongoDB connection issues specifically in Vercel deployments

# Define color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 ChasquiFX Vercel MongoDB Diagnostic Tool${NC}"
echo "-------------------------------------------"
echo -e "${YELLOW}This tool will help diagnose MongoDB connection issues in your Vercel deployment.${NC}"
echo ""

# Check for Vercel CLI
if command -v vercel &>/dev/null; then
    VERCEL_CMD="vercel"
elif [ -f "./node_modules/.bin/vercel" ]; then
    VERCEL_CMD="./node_modules/.bin/vercel"
else
    echo -e "${YELLOW}Vercel CLI not found. Installing locally...${NC}"
    npm install vercel --save-dev
    VERCEL_CMD="./node_modules/.bin/vercel"
fi

# Ensure we're logged in to Vercel
$VERCEL_CMD whoami &>/dev/null || $VERCEL_CMD login

# Step 1: Pull environment variables from Vercel
echo -e "${BLUE}Step 1: Checking Vercel environment variables...${NC}"

# Create temp directory for testing
TEMP_DIR=$(mktemp -d)
ENV_FILE="$TEMP_DIR/.env.vercel"

echo -e "${YELLOW}Pulling environment variables from Vercel...${NC}"
$VERCEL_CMD pull --environment=production --token $(cat ~/.config/vercel/auth.json 2>/dev/null | jq -r '.token') --cwd $TEMP_DIR

# Check if we got the environment variables
if [ -f "$TEMP_DIR/.env" ] || [ -f "$TEMP_DIR/.env.local" ] || [ -f "$TEMP_DIR/.vercel/.env.production.local" ]; then
    echo -e "${GREEN}✅ Successfully pulled environment variables from Vercel.${NC}"
    
    # Find the actual env file
    if [ -f "$TEMP_DIR/.env" ]; then
        ENV_FILE="$TEMP_DIR/.env"
    elif [ -f "$TEMP_DIR/.env.local" ]; then
        ENV_FILE="$TEMP_DIR/.env.local"
    elif [ -f "$TEMP_DIR/.vercel/.env.production.local" ]; then
        ENV_FILE="$TEMP_DIR/.vercel/.env.production.local"
    fi
    
    # Check for MongoDB variables (safely without exposing values)
    if grep -q "MONGODB_" "$ENV_FILE"; then
        echo -e "${GREEN}✅ MongoDB environment variables found in Vercel.${NC}"
        
        # Print variable names without values
        grep "MONGODB_" "$ENV_FILE" | cut -d "=" -f1 | while read var; do
            echo -e "${GREEN}  - $var is set${NC}"
        done
    else
        echo -e "${RED}❌ No MongoDB environment variables found in Vercel.${NC}"
        echo -e "${YELLOW}Required variables:${NC}"
        echo -e "${YELLOW}  - MONGODB_USER${NC}"
        echo -e "${YELLOW}  - MONGODB_PASSWORD${NC}"
        echo -e "${YELLOW}  - MONGODB_HOST (optional)${NC}"
        echo -e "${YELLOW}  - MONGODB_DBNAME (optional)${NC}"
    fi
else
    echo -e "${RED}❌ Failed to pull environment variables from Vercel.${NC}"
    echo -e "${YELLOW}You may need to run 'vercel link' first to connect to your project.${NC}"
fi

# Step 2: Create a diagnostic function that will be deployed
echo -e "\n${BLUE}Step 2: Creating and deploying MongoDB diagnostic function...${NC}"

# Create a special diagnostic API endpoint
mkdir -p $TEMP_DIR/api
cat > $TEMP_DIR/api/mongo-diagnostic.js << 'JSEOF'
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // Handle OPTIONS requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Create a diagnostic report
  const report = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    nodeVersion: process.version,
    mongodbConfig: {
      userSet: !!process.env.MONGODB_USER,
      passwordSet: !!process.env.MONGODB_PASSWORD,
      hostSet: !!process.env.MONGODB_HOST,
      dbnameSet: !!process.env.MONGODB_DBNAME,
      host: process.env.MONGODB_HOST || "chasquifx.ymxb5bs.mongodb.net",
      dbname: process.env.MONGODB_DBNAME || "chasquifx"
    }
  };

  // Attempt MongoDB connection
  try {
    // Dynamically import MongoDB
    const { MongoClient, ServerApiVersion } = await import('mongodb');
    
    // Get credentials from env
    const username = process.env.MONGODB_USER;
    const password = process.env.MONGODB_PASSWORD;
    
    if (!username || !password) {
      return res.status(500).json({
        ...report,
        status: "error",
        message: "MongoDB credentials missing from environment variables",
        details: {
          MONGODB_USER: username ? "Set" : "Missing",
          MONGODB_PASSWORD: password ? "Set" : "Missing"
        }
      });
    }
    
    // Encode credentials for URL
    const encodedUsername = encodeURIComponent(username);
    const encodedPassword = encodeURIComponent(password);
    
    // Get host and database name from environment variables with defaults
    const host = process.env.MONGODB_HOST || "chasquifx.ymxb5bs.mongodb.net";
    const dbName = process.env.MONGODB_DBNAME || "chasquifx";
    
    // Build the URI
    const uri = `mongodb+srv://${encodedUsername}:${encodedPassword}@${host}/${dbName}?retryWrites=true&w=majority&appName=ChasquiFXDiagnostic`;
    
    // Add connection URI to report (with masked password)
    report.mongodbConfig.connectionUri = `mongodb+srv://${encodedUsername}:****@${host}/${dbName}?retryWrites=true&w=majority&appName=ChasquiFXDiagnostic`;

    // Create MongoDB client with timeout
    const client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      connectTimeoutMS: 5000,  // 5 second timeout
      socketTimeoutMS: 10000   // 10 second timeout
    });

    // Connect to MongoDB
    console.log("Attempting to connect to MongoDB...");
    await client.connect();
    console.log("Connected to MongoDB successfully");

    // Ping the database
    await client.db("admin").command({ ping: 1 });
    console.log("Ping command successful");

    // Get database information
    const db = client.db(dbName);
    
    // List collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Add database info to report
    report.database = {
      status: "connected",
      message: "Successfully connected to MongoDB",
      collections: collectionNames,
      ping: "successful"
    };
    
    // Close the connection
    await client.close();
    
    return res.status(200).json({
      ...report,
      status: "success",
      message: "MongoDB diagnostic completed successfully"
    });
  } catch (error) {
    console.error(`MongoDB diagnostic error: ${error.message}`);
    
    // Create a detailed error report
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      type: error.name
    };
    
    // Add specific error analysis
    let errorAnalysis = "Unknown error occurred";
    
    if (error.message.includes("authentication failed")) {
      errorAnalysis = "Authentication failed - incorrect username or password";
    } else if (error.message.includes("timed out")) {
      errorAnalysis = "Connection timed out - possible network issue or firewall blocking";
    } else if (error.message.includes("ENOTFOUND") || error.message.includes("no such host")) {
      errorAnalysis = "Host not found - incorrect MongoDB Atlas hostname";
    } else if (error.message.includes("not authorized")) {
      errorAnalysis = "Authorization failed - user doesn't have access to this database";
    }
    
    return res.status(500).json({
      ...report,
      status: "error",
      message: "MongoDB connection failed",
      error: errorDetails,
      analysis: errorAnalysis
    });
  }
}
JSEOF

# Create package.json for the function
cat > $TEMP_DIR/package.json << 'JSONEOF'
{
  "name": "chasquifx-mongodb-diagnostic",
  "version": "1.0.0",
  "description": "MongoDB diagnostic tool for ChasquiFX",
  "dependencies": {
    "mongodb": "^5.7.0"
  }
}
JSONEOF

# Create vercel.json for deployment
cat > $TEMP_DIR/vercel.json << 'JSONEOF'
{
  "version": 2,
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
        }
      ]
    }
  ]
}
JSONEOF

# Deploy the diagnostic function
echo -e "${YELLOW}Deploying MongoDB diagnostic function to Vercel...${NC}"
cd $TEMP_DIR
$VERCEL_CMD deploy --prod

# Get the deployment URL
DEPLOY_URL=$($VERCEL_CMD ls --prod | grep chasquifx-mongodb-diagnostic | awk '{print $2}')

if [ -z "$DEPLOY_URL" ]; then
    DEPLOY_URL="your-deployment-url"
    echo -e "${YELLOW}Could not automatically get deployment URL. Please check your Vercel dashboard.${NC}"
else
    echo -e "${GREEN}✅ Diagnostic function deployed to: $DEPLOY_URL${NC}"
fi

# Step 3: Fetch diagnostic results
echo -e "\n${BLUE}Step 3: Fetching diagnostic results...${NC}"
echo -e "${YELLOW}Please visit the following URL in your browser to see detailed MongoDB diagnostic information:${NC}"
echo -e "${GREEN}$DEPLOY_URL/api/mongo-diagnostic${NC}"
echo ""
echo -e "${YELLOW}Or run the following command:${NC}"
echo -e "${GREEN}curl $DEPLOY_URL/api/mongo-diagnostic${NC}"

# Step 4: Provide recommendations based on common issues
echo -e "\n${BLUE}Step 4: Recommendations for fixing MongoDB connection issues:${NC}"
echo ""
echo -e "1. ${YELLOW}Check MongoDB Atlas Credentials:${NC}"
echo "   - Verify username and password in Vercel environment variables"
echo "   - Ensure the user has the right permissions in MongoDB Atlas"
echo ""
echo -e "2. ${YELLOW}Check Network Access in MongoDB Atlas:${NC}"
echo "   - In MongoDB Atlas dashboard, go to Network Access"
echo "   - Add 0.0.0.0/0 to allow connections from anywhere (for testing)"
echo "   - Or add Vercel's IP range (check Vercel documentation)"
echo ""
echo -e "3. ${YELLOW}Verify MongoDB Atlas Cluster Status:${NC}"
echo "   - Ensure your cluster is running and not paused"
echo "   - Check if there are any maintenance or outage notifications"
echo ""
echo -e "4. ${YELLOW}Update Environment Variables in Vercel:${NC}"
echo "   - Make sure all required variables are set:"
echo "     MONGODB_USER, MONGODB_PASSWORD, MONGODB_HOST, MONGODB_DBNAME"
echo "   - Redeploy your application after updating variables"
echo ""
echo -e "5. ${YELLOW}Test Locally First:${NC}"
echo "   - Set up the same environment variables locally"
echo "   - Test connection with node scripts/verify-mongodb.js"

# Cleanup
cd - > /dev/null
rm -rf $TEMP_DIR

echo -e "\n${GREEN}Diagnostic process completed!${NC}"
