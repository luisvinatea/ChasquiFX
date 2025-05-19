#!/bin/bash
#
# Run the duplicate document finder and remover script (v2)
#
# This script helps identify and remove duplicate MongoDB documents
# It supports dry-run mode to first check without making changes
# Uses the modular version of the duplicate document finder
#

# Exit on error
set -e

# Change to the script directory
cd "$(dirname "$0")"

# Define path for .env file (located at backend/api/.env)
# The script is at backend/api/scripts/cleaning, so we go up two directories
ENV_FILE="$(dirname "$(dirname "$(pwd)")")/.env"

# Check if .env file exists in specified path
if [ ! -f "${ENV_FILE}" ]; then
    echo "Error: .env file not found at: ${ENV_FILE}"
    exit 1
fi

# Check if --dry-run flag should be passed
if [ "$1" == "--dry-run" ]; then
    echo "Running in dry-run mode (will not remove any documents)"
    ENV_PATH="${ENV_FILE}" node remove-duplicate-documents-v2.js --dry-run
elif [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "MongoDB Duplicate Document Finder and Remover (v2)"
    echo ""
    echo "Usage:"
    echo "  ./check-duplicates-v2.sh                 - Find and remove duplicates in all collections"
    echo "  ./check-duplicates-v2.sh --dry-run       - Find duplicates without removing them"
    echo "  ./check-duplicates-v2.sh --collection=X  - Process only a specific collection"
    echo ""
    echo "Options:"
    echo "  --dry-run                 - Just report duplicates without removing them"
    echo "  --collection=CollectionName  - Process only the specified collection"
    echo "  --help, -h                - Show this help message"
else
    echo "Running duplicate document check and removal..."
    ENV_PATH="${ENV_FILE}" node remove-duplicate-documents-v2.js "$@"
fi
