#!/bin/bash
# setup_node_backend.sh
# Script to set up the Node.js backend environment

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up ChasquiFX Node.js backend...${NC}"

# Check if npm is installed
if ! command -v npm &>/dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install Node.js and npm.${NC}"
    exit 1
fi

# Navigate to the Node.js backend directory
cd "$(dirname "$0")/../backend/node" || {
    echo -e "${RED}Error: Node.js backend directory not found${NC}"
    exit 1
}

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.template .env
    echo -e "${GREEN}Created .env file. Please update it with your API keys and credentials.${NC}"
fi

# Install dependencies
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Dependencies installed successfully.${NC}"
else
    echo -e "${RED}Failed to install dependencies. Please check the error messages above.${NC}"
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p ../../logs

echo -e "${GREEN}Node.js backend setup completed!${NC}"
echo -e "${YELLOW}You can start the Node.js backend with: npm run dev${NC}"
