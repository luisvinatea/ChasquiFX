# ChasquiFX Python to Node.js Migration Notes

## Hybrid Architecture Overview

ChasquiFX has been migrated to a hybrid architecture where:

- **Node.js Backend**: Handles API endpoints, authentication, and asynchronous operations
- **Python Backend**: Focuses on core data processing tasks and complex calculations

## Migrated Functionality

The following components have been migrated from Python to Node.js:

### API Routes

- `/api/forex/rates` - Exchange rate lookups
- `/api/forex/status` - Forex service status
- `/api/forex/refresh` - Refresh forex data
- `/api/forex/available_currencies` - List available currencies
- `/api/forex/reset_quota_status` - Reset API quota status
- `/api/recommendations` - Get travel recommendations

### Authentication

- API key validation
- User authentication
- Supabase integration

## Python Components Still in Use

The following Python components are still being used through the Node.js bridge:

- **Data Processing**: Complex data analysis and transformations
- **Machine Learning**: Recommendation algorithms and predictions
- **Parquet File Processing**: Efficient data storage and retrieval
- **SerpAPI Integration**: Advanced web scraping and data collection

## Deprecation Timeline

The legacy Python endpoints are marked as deprecated but are still functional for backward compatibility. These endpoints will be removed in a future version of ChasquiFX.

## Usage for Developers

When extending ChasquiFX's functionality:

1. Add new API endpoints to the Node.js backend
2. Use the Python bridge for data processing tasks
3. Follow the hybrid architecture pattern for new features

## Directory Structure

- `/backend/node/` - Node.js backend
- `/backend/api/` - Python backend (some components deprecated)
- `/backend/api/adapters/` - Bridge between Node.js and Python

## Notes for Contributors

When contributing to ChasquiFX, please be aware of the ongoing migration from Python to Node.js. New features should be implemented in Node.js where appropriate, with Python used only for specialized data processing tasks.
