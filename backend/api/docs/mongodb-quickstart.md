# ChasquiFX MongoDB Integration

This document provides a quick-start guide for the MongoDB integration in ChasquiFX.

## Quick Start

### Prerequisites

Make sure you have:

1. MongoDB 4.4+ installed and running
2. Node.js 14+ installed
3. MongoDB connection URI set in .env file as `MONGODB_URI`

### Migration Steps

1. **Run the full migration process**:

   ```bash
   cd backend/api/scripts
   ./full-migration-process.sh
   ```

2. **Test individual components**:

   ```bash
   ./run-tests.sh
   ```

3. **Monitor cache usage**:
   ```bash
   node generate-cache-dashboard.js --html --output ~/cache-dashboard.html
   ```

## Automated Tasks

The integration provides several automated tasks:

### Cache Management

- **TTL-Based Expiration**: MongoDB automatically removes expired cache entries
- **Standardized Naming**: All cache entries follow the naming conventions from the Python file_renamer.py script

### Data Synchronization

- **File to MongoDB Migration**: Data is migrated from files to MongoDB
- **Dual Storage**: New data is stored in both MongoDB and files for backward compatibility

## Dashboard

The cache dashboard provides:

- Overview of database statistics
- Forex cache statistics
- Flight cache statistics
- API call statistics
- Daily API call volume chart

## Troubleshooting

### Common Issues

1. **Connection Problems**: Check your MongoDB URI in the .env file
2. **Migration Failures**: Use `--dry-run` flag to test before actual migration
3. **Missing Data**: Check storage paths in file standardization service

### Getting Help

For more detailed information, refer to:

- `backend/api/docs/mongodb-migration.md`
- `backend/api/scripts/README.md`

## Performance Considerations

- MongoDB queries are indexed for optimal performance
- Cache entries have TTL indexes for automatic cleanup
- Statistics collection uses aggregation pipelines for efficiency
