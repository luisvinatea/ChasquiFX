# ChasquiFX Database Implementation

This directory contains the modular database implementation for ChasquiFX.

## Architecture

The database implementation follows a modular approach with clear separation of concerns:

### Core Modules

1. **mongodb-client.js** - Core connection management

   - Environment variable handling
   - MongoDB client creation with standardized options
   - Connection pooling and reuse
   - Logging utilities

2. **data-utils.js** - Data handling utilities

   - JSON parsing and fixing
   - Data import functions for different data types
   - Standardized error handling

3. **db-operations.js** - Script-focused operations
   - Duplicate document finding and removal
   - Index creation
   - Collection setup
   - High-level database operations for scripts

## Usage

### For Application Code

Use the existing operations.js for application-level database access.

### For Scripts

Use the db-operations.js module which provides script-focused utilities:

```javascript
import { initDatabaseConnection, importAllData } from "../db-operations.js";

async function main() {
  // Initialize database connection
  const { db, client } = await initDatabaseConnection();

  // Perform operations...

  // Close connection when done
  await client.close();
}
```

## Standardized Scripts

The following scripts have been refactored to use the modular approach:

1. **mongodb-atlas-connection-test.js** - Tests MongoDB Atlas connectivity

   - Uses modular database connection
   - Imports sample data if available
   - Creates indexes for optimized queries

2. **remove-duplicate-documents-v2.js** - Manages duplicate documents
   - Finds duplicates based on unique fields
   - Can operate in dry-run mode or actually remove duplicates
   - Provides detailed statistics on duplicates found

## Benefits of Modular Approach

1. **Reduced code duplication** - Common operations are centralized
2. **Standardized error handling** - Consistent approach to errors
3. **Improved maintainability** - Changes to connection logic only need to be made in one place
4. **Better testability** - Components can be tested in isolation

## Environment Variables

These modules use the following environment variables:

- `MONGODB_USER` - MongoDB username
- `MONGODB_PASSWORD` - MongoDB password
- `MONGODB_HOST` - MongoDB host (default: chasquifx.ymxb5bs.mongodb.net)
- `MONGODB_DBNAME` - Database name (default: chasquifx)
- `LOG_LEVEL` - Logging level (error, warn, info, debug)
- `ENV_PATH` - Custom path to .env file

## Recommended Usage

For new scripts that interact with MongoDB, use the db-operations.js module rather than implementing connection logic directly.
