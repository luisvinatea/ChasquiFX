# Migration to Enhanced Flight Schema

This document explains how to migrate your existing MongoDB flight documents to the enhanced schema.

## Overview

The enhanced flight schema provides a more structured approach to storing flight data, including:

- Detailed route information
- Price and duration data
- Carbon emissions details
- Layover information
- And more

The migration process reads your existing MongoDB documents and creates or updates documents in the new enhanced schema collection.

## Migration Process

### Prerequisites

- Node.js installed
- MongoDB connection details configured in your `.env` file
- Access to flight JSON files (optional but recommended for complete data migration)

### Step 1: Run a Dry-Run Migration

Start with a dry run to see what would be migrated without making any changes:

```bash
cd /path/to/chasquifx/backend/api
./scripts/migration/run-enhanced-migration.sh --dry-run
```

This will:

- Connect to your MongoDB database
- Scan existing flight documents
- Show you what would be migrated
- Exit without making any changes

### Step 2: Perform the Actual Migration

Once you've verified the dry run looks good, run the actual migration:

```bash
cd /path/to/chasquifx/backend/api
./scripts/migration/run-enhanced-migration.sh
```

The script will:

1. Connect to your MongoDB database
2. Read each existing flight document
3. Attempt to load the corresponding JSON file for complete data (if available)
4. Create a new enhanced document structure
5. Either update an existing enhanced document or create a new one
6. Prompt you to create indexes after migration is complete

### Step 3: Create Indexes (Optional)

After migration, you'll be prompted to create indexes for your enhanced schema. You can also run this separately:

```bash
node scripts/indexing/create-flight-indexes.js
```

This will create indexes for common query patterns to improve performance.

### Verifying the Migration

After migration, you can verify the results:

```javascript
// In MongoDB shell
use chasquifx
db.flights.findOne()  // Original schema
db.Flight.findOne()   // Enhanced schema with detailed structure
```

## Troubleshooting

### Missing Flight JSON Files

If the migration script can't find the original JSON files, it will still create enhanced documents but with limited data. The documents will have the route information and basic details, but may be missing detailed flight information.

### MongoDB Connection Issues

If you encounter MongoDB connection issues, check your `.env` file and ensure it contains the correct connection URI:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chasquifx
```

### Node.js Version Compatibility

This script was designed to work with Node.js version 14 or later. If you encounter issues, make sure your Node.js installation is up to date.
