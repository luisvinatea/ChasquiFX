#!/bin/bash
# Run MongoDB Atlas connection test
# This script runs the test-atlas-connection.js file to verify MongoDB Atlas connectivity

# Set colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}     MongoDB Atlas Connection Test      ${NC}"
echo -e "${BLUE}============================================${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found. Creating from example...${NC}"

    # Check if .env.example exists
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}Created .env file from .env.example. Please update with your credentials.${NC}"
    else
        echo -e "${RED}Error: Cannot create .env file. .env.example not found.${NC}"
        exit 1
    fi
fi

# Run the test
echo -e "${BLUE}Running connection test...${NC}"
node tests/test-atlas-connection.js

# Check the exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Connection test completed successfully.${NC}"
else
    echo -e "${RED}Connection test failed. Please check your MongoDB Atlas credentials.${NC}"
    echo -e "${YELLOW}Hint: Make sure you've updated the MONGODB_USER and MONGODB_PASSWORD in your .env file.${NC}"
fi
