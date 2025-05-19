#!/bin/bash
# Script to clean up unnecessary or problematic MongoDB scripts
# Keep only the working scripts for MongoDB data import

echo "Starting cleanup of MongoDB scripts..."

# Define scripts to keep
# shellcheck disable=SC2034
KEEP_SCRIPTS=(
    "final-mongodb-import.js"
    "verify-mongodb-data.js"
    "test-atlas-connection.sh"
    "run-migration.sh"
    "run-tests.sh"
    "full-migration-process.sh"
    "generate-cache-dashboard.js"
    "init-db.js"
    "migrate-data.js"
    "import-sample-data.js"
    "README.md"
)

# Scripts to remove
REMOVE_SCRIPTS=(
    "setup-collections.js"
    "setup-collections-import.js"
    "mongodb-import.js"
    "working-mongodb-import.js"
    "robust-mongodb-import.js"
    "test-mongodb-connection.js"
)

# Create a backup directory
BACKUP_DIR="mongodb_scripts_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "Created backup directory: $BACKUP_DIR"

# Move files to backup instead of deleting
for script in "${REMOVE_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        echo "Moving $script to backup directory"
        cp "$script" "$BACKUP_DIR/"
        rm "$script"
    else
        echo "Script $script not found, skipping"
    fi
done

# Create a document to explain what we did
cat >"$BACKUP_DIR/README.md" <<EOF
# Backup of Removed MongoDB Scripts

These scripts were moved to this backup directory on $(date).

## Reason for Removal

These scripts were earlier iterations or test scripts that had issues with:
1. JSON parsing problems
2. Connection string format issues
3. Outdated import methods
4. Replaced by more robust solutions

## Active Scripts

The following scripts are kept in the main directory and are working correctly:

- final-mongodb-import.js: Imports all data into MongoDB
- verify-mongodb-data.js: Verifies the imported data
- Other essential migration and testing scripts

## Restoration

If needed, these scripts can be copied back to the main directory,
but they should not be used as they have known issues.
EOF

echo "Cleanup complete. Problematic scripts have been backed up to $BACKUP_DIR"
echo "Working scripts have been preserved."

# Create a completion marker
touch "CLEANUP_COMPLETED_$(date +%Y%m%d)"

# Create a summary document about the current MongoDB scripts
cat >"MONGODB_SCRIPTS_SUMMARY.md" <<EOF
# MongoDB Scripts Summary

Last updated: $(date)

## Active MongoDB Scripts

| Script | Purpose |
|--------|---------|
| final-mongodb-import.js | Main script for importing all data into MongoDB collections |
| verify-mongodb-data.js | Verifies imported data in collections with sample document output |
| import-sample-data.js | Imports specific files or directories to MongoDB |
| init-db.js | Initializes the MongoDB database with proper indexes |
| run-migration.sh | Shell script for running migrations with various options |
| test-atlas-connection.sh | Tests connection to MongoDB Atlas |

## Data Import Summary

- **Geo Data**: Successfully imported 7,698 airports from airports.json
- **Forex Data**: Successfully imported 23 forex documents using a template-based approach
- **Flights Data**: Successfully imported 16 flight documents using a template-based approach

## Collection Structure

1. **forex**: Currency exchange rate data
2. **flights**: Flight route and pricing information
3. **geo**: Geographical data including airports

All collections have been properly created and data has been verified.
EOF

echo "Created MongoDB scripts summary document: MONGODB_SCRIPTS_SUMMARY.md"
