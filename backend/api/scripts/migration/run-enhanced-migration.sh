#!/bin/bash

# Run the enhanced schema migration script
# This script will migrate existing flight documents in MongoDB to the enhanced schema

# Display help
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Usage: $0 [--dry-run]"
    echo "  --dry-run    Show what would be migrated without actually migrating"
    exit 0
fi

# Set the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.." || exit

# Check if we have MongoDB connection details in .env
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please create one with your MongoDB connection details."
    exit 1
fi

# Check if node is installed
if ! command -v node &>/dev/null; then
    echo "Error: Node.js is not installed. Please install it and try again."
    exit 1
fi

# Pass any arguments (like --dry-run) to the migration script
echo "Starting migration to enhanced schema..."

# Run the script with Node.js
node scripts/migration/migrate-to-enhanced-schema.js "$@"

# Check the exit status
if [ $? -eq 0 ]; then
    echo "Migration completed successfully."

    # If not in dry-run mode, suggest creating indexes
    if [[ "$1" != "--dry-run" ]]; then
        echo "Would you like to create indexes for the enhanced schema? [y/N]"
        read -r CREATE_INDEXES
        if [[ "$CREATE_INDEXES" =~ ^[Yy]$ ]]; then
            echo "Creating indexes..."
            node scripts/indexing/create-flight-indexes.js
        fi
    fi
else
    echo "Migration failed. Check the logs for details."
    exit 1
fi
