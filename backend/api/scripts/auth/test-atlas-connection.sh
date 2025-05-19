#!/bin/bash
# Run MongoDB Atlas connection test
# This script runs the test-atlas-connection.js file to verify MongoDB Atlas connectivity

# Set colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Define parent directory for .env file
PARENT_DIR="$(dirname "$(pwd)")"
ENV_FILE="${PARENT_DIR}/.env"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}     MongoDB Atlas Connection Test      ${NC}"
echo -e "${BLUE}============================================${NC}"

# Check if .env file exists in parent directory
if [ ! -f "${ENV_FILE}" ]; then
    echo -e "${YELLOW}Warning: .env file not found in parent directory. Creating from example...${NC}"

    # Check if .env.example exists in parent directory
    if [ -f "${PARENT_DIR}/.env.example" ]; then
        cp "${PARENT_DIR}/.env.example" "${ENV_FILE}"
        echo -e "${YELLOW}Created .env file from .env.example. Please update with your credentials.${NC}"
    else
        echo -e "${RED}Error: Cannot create .env file. .env.example not found in parent directory.${NC}"
        exit 1
    fi
fi

# Run the test with explicit reference to parent directory .env file
echo -e "${BLUE}Running connection test...${NC}"
ENV_PATH="${ENV_FILE}" node test-atlas-connection.js

# Check the exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Connection test completed successfully.${NC}"
else
    echo -e "${RED}Connection test failed. Please check your MongoDB Atlas credentials.${NC}"
    echo -e "${YELLOW}Hint: Make sure you've updated the MONGODB_USER and MONGODB_PASSWORD in your .env file.${NC}"
fi
