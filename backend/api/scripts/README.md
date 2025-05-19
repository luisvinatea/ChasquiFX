# ChasquiFX MongoDB Scripts

This directory contains utility scripts for managing the MongoDB cache implementation for ChasquiFX.

## Available Scripts

### Primary Scripts

- **final-mongodb-import.js** - Main script for importing all data into MongoDB collections
- **verify-mongodb-data.js** - Verifies imported data in collections with sample document output

### Migration Scripts

- **migrate-data.js** - Migrates existing JSON files to MongoDB
- **run-migration.sh** - Shell script for running migrations with various options
- **init-db.js** - Initializes the MongoDB database with proper indexes

### Import Scripts

- **import-sample-data.js** - Imports specific files or directories to MongoDB

### Monitoring Scripts

- **generate-cache-dashboard.js** - Creates dashboards for monitoring cache usage

### Testing Scripts

- **run-tests.sh** - Runs all tests for the MongoDB integration

## Usage

Most scripts support a `--help` flag to show available options:

```bash
node script-name.js --help
```

For shell scripts:

```bash
./script-name.sh --help
```

## Requirements

- Node.js 14+
- MongoDB 4.4+
- Valid MongoDB connection URI in .env file (MONGODB_URI)

## Documentation

For more comprehensive documentation, see `/docs/mongodb-migration.md`.

