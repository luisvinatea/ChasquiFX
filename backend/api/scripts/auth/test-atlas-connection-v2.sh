#!/bin/bash
# Run MongoDB Atlas connection test v2 (modular version)
# This script runs the test-atlas-connection-v2.js file to verify MongoDB Atlas connectivity

# Set colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Define path for .env file (located at backend/api/.env)
# The script is at backend/api/scripts/auth, so we go up two directories
ENV_FILE="$(dirname "$(dirname "$(pwd)")")/.env"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}     MongoDB Atlas Connection Test (v2)      ${NC}"
echo -e "${BLUE}============================================${NC}"

# Check if .env file exists in specified path
if [ ! -f "${ENV_FILE}" ]; then
    echo -e "${YELLOW}Warning: .env file not found at ${ENV_FILE}. Creating from example...${NC}"

    # Get the directory of the .env file
    ENV_DIR="$(dirname "${ENV_FILE}")"

    # Check if .env.example exists in the same directory
    if [ -f "${ENV_DIR}/.env.example" ]; then
        cp "${ENV_DIR}/.env.example" "${ENV_FILE}"
        echo -e "${YELLOW}Created .env file from .env.example. Please update with your credentials.${NC}"
    else
        echo -e "${RED}Error: Cannot create .env file. .env.example not found in ${ENV_DIR}.${NC}"
        exit 1
    fi
fi

# Run the test with explicit reference to the .env file
echo -e "${BLUE}Running connection test...${NC}"
# Use full path to the JS file to ensure we're running the right one
SCRIPT_DIR="$(dirname "$0")"

# Run the command and check exit code directly
if ENV_PATH="${ENV_FILE}" node "${SCRIPT_DIR}/test-atlas-connection-v2.js"; then
    echo -e "${GREEN}Connection test completed successfully.${NC}"
else
    echo -e "${RED}Connection test failed. Please check your MongoDB Atlas credentials.${NC}"
    echo -e "${YELLOW}Hint: Make sure you've updated the MONGODB_USER and MONGODB_PASSWORD in your .env file.${NC}"
fi
