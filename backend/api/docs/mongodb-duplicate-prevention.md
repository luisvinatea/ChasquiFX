# MongoDB Duplicate Documents Management

This document provides guidance on preventing and managing duplicate documents in our MongoDB database for ChasquiFX.

## Prevention Strategies

### 1. Unique Indexes

We've implemented several unique indexes to prevent duplicate documents:

- `ForexCache` collection: Unique index on `cacheKey` field
- `FlightCache` collection: Unique index on `cacheKey` field
- `ApiCallLog` collection: Unique index on `fingerprint` field with a fallback compound index on `endpoint`, `timestamp`, and `userId`

The `create-indexes.js` script ensures these indexes exist in the database.

### 2. Upserts Instead of Inserts

When adding data to MongoDB, prefer using upserts over direct inserts:

```javascript
// Example upsert operation
const filter = { cacheKey: generateCacheKey(searchParams) };
const update = {
  $set: { data: apiResponse, expiresAt: new Date(Date.now() + TTL) },
};
const options = { upsert: true };

await collection.updateOne(filter, update, options);
```

### 3. Atomic Operations

For operations that need to first check if a document exists, use MongoDB's atomic operations:

```javascript
// Instead of:
const exists = await collection.findOne({ key: value });
if (!exists) await collection.insertOne(document);

// Use:
await collection.updateOne(
  { key: value },
  { $setOnInsert: document },
  { upsert: true }
);
```

## Detection and Cleanup

### Running the Duplicate Checker

We have a script to check for and remove duplicate documents:

```bash
# Check for duplicates without removing them (dry run)
./check-duplicates.sh --dry-run

# Remove duplicates in all collections
./check-duplicates.sh

# Process only a specific collection
./check-duplicates.sh --collection=ForexCache
```

### How Duplicates Are Identified

- `ForexCache` and `FlightCache`: Documents with the same `cacheKey`
- `ApiCallLog`: Documents with the same `fingerprint` or the same combination of `endpoint`, `timestamp`, and `userId` for legacy entries

### Duplicate Removal Logic

When duplicates are found, the script:

1. Groups documents by the unique key
2. For each group, sorts by creation time (newest first)
3. Keeps the newest document and removes the rest

## Monitoring and Verification

We've added tools to verify and monitor your MongoDB collections:

### 1. MongoDB Verification Tool

```bash
# Verify MongoDB indexes and check for duplicates
./verify-mongodb.sh

# Generate a detailed report about database state
./verify-mongodb.sh --report
```

This tool will:
- Check for any duplicate documents in all collections
- Verify all unique indexes are in place
- Generate a report (if requested) in `logs/reports/`
- Provide recommendations for fixing any issues

### 2. Regular Monitoring

Regular checks for duplicates should be part of your database maintenance routine:

1. Schedule weekly runs of the verification script
2. Include duplicate checks in your CI/CD pipeline
3. Set up alerts if a large number of duplicates are detected

### 3. MongoDB Manager

For more advanced MongoDB management:

```bash
# Run the MongoDB management tool
./mongodb-manager.sh [action] [options]

# Available actions:
#   check-duplicates  - Find and optionally remove duplicates
#   create-indexes    - Create necessary indexes to prevent duplicates
#   test-connection   - Test MongoDB connection
```

## Troubleshooting

### Common Causes of Duplicates

1. **Race Conditions**: Multiple concurrent writes without proper locking
2. **Missing Indexes**: Operations that bypass unique constraints
3. **Bulk Imports**: Data migration scripts that don't check for existing documents

### Solutions

- Use `findOneAndUpdate` with `upsert: true` instead of separate find and insert operations
- Ensure all collections have appropriate unique indexes
- Implement optimistic concurrency control using MongoDB's `findOneAndUpdate` with the `_id` field

## Special Case: API Call Logs

For the ApiCallLog collection, we've implemented a special approach to prevent duplicates:

1. Added a unique `fingerprint` field that combines:
   - API endpoint name
   - Timestamp (down to millisecond precision)
   - A partial hash of the request data

2. We use this fingerprint to prevent exact duplicate logs even in high-concurrency scenarios:

```javascript
// Generate a unique fingerprint for the log
const requestHash = JSON.stringify(requestData).slice(0, 50);
const fingerprint = `${endpoint}_${timestamp.getTime()}_${requestHash.replace(/\W/g, '')}`;

// Use updateOne with upsert to avoid duplicates
await ApiCallLog.updateOne(
  { fingerprint },
  { endpoint, requestData, responseStatus, userId, timestamp, fingerprint },
  { upsert: true }
);
```

## Additional Resources

- [MongoDB Unique Indexes Documentation](https://docs.mongodb.com/manual/core/index-unique/)
- [MongoDB Atomic Operations](https://docs.mongodb.com/manual/core/write-operations-atomicity/)
- [MongoDB Upsert Documentation](https://docs.mongodb.com/manual/reference/method/db.collection.update/#upsert-option)
- [MongoDB Data Modeling Best Practices](https://docs.mongodb.com/manual/core/data-model-design/)
