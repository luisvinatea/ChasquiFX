#!/bin/bash
#
# Run the duplicate document finder and remover script
#
# This script helps identify and remove duplicate MongoDB documents
# It supports dry-run mode to first check without making changes
#

# Exit on error
set -e

# Change to the script directory
cd "$(dirname "$0")"

# Check if --dry-run flag should be passed
if [ "$1" == "--dry-run" ]; then
    echo "Running in dry-run mode (will not remove any documents)"
    node remove-duplicate-documents.js --dry-run
elif [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "MongoDB Duplicate Document Finder and Remover"
    echo ""
    echo "Usage:"
    echo "  ./check-duplicates.sh                 - Find and remove duplicates in all collections"
    echo "  ./check-duplicates.sh --dry-run       - Find duplicates without removing them"
    echo "  ./check-duplicates.sh --collection=X  - Process only a specific collection"
    echo ""
    echo "Options:"
    echo "  --dry-run                 - Just report duplicates without removing them"
    echo "  --collection=CollectionName  - Process only the specified collection"
    echo "  --help, -h                - Show this help message"
else
    echo "Running duplicate document check and removal..."
    node remove-duplicate-documents.js "$@"
fi
