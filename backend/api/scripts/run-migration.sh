#!/bin/bash

# MongoDB Data Migration Script
# This script handles the migration of data from files to MongoDB

# Set the directory to the script location
cd "$(dirname "$0")"

# Default configuration
DRY_RUN=false
MIGRATE_FOREX=true
MIGRATE_FLIGHTS=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
    --dry-run)
        DRY_RUN=true
        shift
        ;;
    --forex-only)
        MIGRATE_FLIGHTS=false
        shift
        ;;
    --flights-only)
        MIGRATE_FOREX=false
        shift
        ;;
    --help)
        echo "MongoDB Data Migration Script"
        echo "Usage: $0 [options]"
        echo "Options:"
        echo "  --dry-run       Don't actually migrate, just show what would be migrated"
        echo "  --forex-only    Migrate only forex data"
        echo "  --flights-only  Migrate only flight data"
        echo "  --help          Show this help message"
        exit 0
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
    esac
done

# Check if MongoDB connection can be established
echo "Testing MongoDB connection..."
node -e "
const { connectToDatabase } = require('../src/db/mongodb');
connectToDatabase()
  .then(() => {
    console.log('MongoDB connection successful');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  })
" || {
    echo "Failed to connect to MongoDB. Please check your connection settings."
    exit 1
}

# Build migration command
CMD="node ./migrate-data.js"
if $DRY_RUN; then
    CMD="$CMD --dry-run"
fi

if ! $MIGRATE_FOREX; then
    CMD="$CMD --flight"
fi

if ! $MIGRATE_FLIGHTS; then
    CMD="$CMD --forex"
fi

# Execute migration
echo "Starting data migration..."
echo "Command: $CMD"
eval $CMD

# Check result
if [ $? -eq 0 ]; then
    echo "Migration completed successfully"
else
    echo "Migration failed with error code $?"
    exit 1
fi

# Initialize database if not in dry run mode
if ! $DRY_RUN; then
    echo "Initializing database indexes..."
    node ./init-db.js

    if [ $? -eq 0 ]; then
        echo "Database initialization completed successfully"
    else
        echo "Database initialization failed"
        exit 1
    fi
fi

echo "All operations completed successfully"
exit 0
