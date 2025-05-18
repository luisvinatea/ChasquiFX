# ChasquiFX Dual Backend Cleanup TODO

Based on the analysis of the codebase, here are the specific tasks that need to be addressed:

## Python Side

### 1. Fix Node Adapter Functions

The following node adapter functions need to be reviewed:

- `get_exchange_rates`: Ensure it correctly calls the corresponding function in forex_service
- `get_service_status`: Implement or fix the missing function
- `reset_quota_status`: Implement or fix the missing function
- `get_recommendations`: Check parameter types and return format
- `retrieve_parquet_data`: Verify function name in retrieval module
- `json_to_parquet`: Check function name in json_parquet_converter module

### 2. Complete Node Bridge Implementation

- Ensure all routes in node_bridge.py are properly implemented
- Add proper error handling for all routes
- Add complete documentation

### 3. Update Python Main API

- Mark duplicate routes as deprecated
- Add warnings for direct API access
- Consider redirecting direct API calls to the Node.js backend

## Node.js Side

### 1. Improve Python Bridge Service

- Add better error handling for Python process failures
- Implement connection pooling to avoid spawning too many processes
- Add timeout handling for long-running Python operations

### 2. Update Controllers

- Ensure all controllers properly handle errors from Python bridge
- Add input validation before calling Python functions
- Implement caching for expensive operations

## Documentation

### 1. Update API Documentation

- Clarify that the Node.js API is now the preferred entry point
- Document the dual backend architecture
- Provide examples of calling the API through Node.js

### 2. Update Developer Guidelines

- Add guidelines for adding new features in the dual backend system
- Document the data flow between Node.js and Python
- Add troubleshooting information for the Python bridge

## Testing

### 1. Add Integration Tests

- Test the Node.js to Python bridge
- Ensure all API endpoints return expected results
- Test error handling scenarios

## Next Steps

1. Fix the critical issues in the node adapter functions
2. Complete the node bridge implementation
3. Update the Python API to redirect to Node.js
4. Improve the Python bridge service in Node.js
5. Update documentation and add tests
