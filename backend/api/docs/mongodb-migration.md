# MongoDB Cache Migration Solution

This document explains the solution for migrating the ChasquiFX project from Python to a JavaScript application with MongoDB caching while preserving the naming conventions from the Python `file_renamer.py` script.

## Overview

We've created a JavaScript implementation that:

1. Follows the same naming conventions as the original Python script
2. Integrates with MongoDB for efficient caching
3. Provides a seamless migration path from filesystem-based caching to MongoDB
4. Maintains backward compatibility with existing JSON files
5. Includes tools for testing, data import, and monitoring

## Key Components

### File Standardization Service

The `fileStandardizationService.js` module replicates the functionality of `file_renamer.py` in JavaScript, providing methods for:

- Extracting metadata from JSON files or objects
- Standardizing filenames based on metadata
- Generating cache keys for MongoDB in the same format as the filenames

### MongoDB Schema and Operations

The database layer has been updated to:

- Use standardized cache keys that follow the Python naming conventions
- Store the original metadata from files
- Include TTL (Time-To-Live) indexes for automatic expiration of cached data

### Cache Service

The cache service now:

- Uses the standardized naming for both filesystem and MongoDB caching
- Automatically handles the translation between different formats
- Provides a consistent interface for retrieving data from either source

## Data Migration

A migration utility has been created to:

1. Read existing JSON files from the filesystem
2. Generate standardized cache keys following the Python naming conventions
3. Store the data in MongoDB with proper metadata and TTL settings

## Usage

### Migrating Data from Files to MongoDB

```bash
# Run a dry run migration to see what would happen
./run-migration.sh --dry-run

# Migrate only forex data
./run-migration.sh --forex-only

# Migrate only flight data
./run-migration.sh --flights-only

# Migrate all data
./run-migration.sh
```

### Importing Specific Data Files

```bash
# Import a single file
node scripts/import-sample-data.js --file path/to/file.json

# Import all JSON files in a directory
node scripts/import-sample-data.js --directory path/to/directory

# Dry run import (shows what would be imported without actually doing it)
node scripts/import-sample-data.js --file path/to/file.json --dry-run
```

### Testing the Integration

```bash
# Run all tests
./scripts/run-tests.sh

# Run specific test modules
node tests/test-mongodb.js
node tests/test-file-standardization.js
```

### Monitoring Cache Usage

```bash
# Generate a JSON dashboard of cache statistics
node scripts/generate-cache-dashboard.js --output cache-stats.json

# Generate an HTML dashboard with visualizations
node scripts/generate-cache-dashboard.js --html --output cache-dashboard.html
```

### Accessing Data

The existing cache service interface remains unchanged, but now it will:

1. Check MongoDB for cached data first
2. Fall back to filesystem if needed
3. Fetch from API if no cache exists
4. Store new data in both MongoDB and filesystem with standardized names

### Database Initialization

```bash
# Initialize MongoDB with proper indexes
node scripts/init-db.js
```

## Maintenance Tasks

- **Cache Cleanup**: MongoDB automatically removes expired documents based on TTL indexes
- **File Cleanup**: A separate maintenance script could be created to remove files that have been successfully migrated to MongoDB

## Components

### Tools and Utilities

1. **File Standardization Service**: JavaScript implementation of Python's file_renamer.py
2. **Data Migration Script**: Migrates data from files to MongoDB
3. **Import Tool**: Imports specific files or directories to MongoDB
4. **Dashboard Generator**: Creates JSON or HTML dashboards of cache statistics
5. **Test Suite**: Tests all aspects of the MongoDB integration

### Enhancements

1. **MongoDB Schema Improvements**: Added indexes and TTL for automatic cache expiry
2. **Standardized Naming**: Consistent naming between files and MongoDB documents
3. **Background Tasks**: Scripts for data migration and maintenance
4. **Visualization**: Dashboard for monitoring cache performance

## Future Enhancements

1. **Similarity Matching**: Enhance cache entries to match similar queries to reduce API calls
2. **Cross-Reference Feature**: Maintain file-to-MongoDB mapping for seamless transition
3. **Cache Prediction**: Analyze usage patterns to pre-fetch likely needed data
4. **Throttling and Rate Limiting**: Intelligent API usage that respects rate limits
5. **Regional Replication**: Replicate cache to multiple MongoDB instances for lower latency

## Technical Details

### File naming conventions

For flight data:

- Format: `{departure_id}_{arrival_id}_{outbound_date}_{return_date}.json`
- Example: `JFK_LHR_2025-08-14_2025-08-21.json`

For forex data:

- Format: `{q}_{created_at}.json`
- Example: `AUD-EUR_2025-05-17-02-33-39.json`

These conventions are maintained in both the filesystem and MongoDB cache keys.
