# ChasquiFX Flight Service Tests

This directory contains test modules for the flight service components of the ChasquiFX application.

## Available Tests

### 1. Flight Service Module Tests

- **File**: `flight-service-test.js`
- **Purpose**: Tests core functionality of the flight service module
- **Components Tested**:
  - Flight fare retrieval
  - Price estimation
  - Multiple fare fetching
  - Simulated fare generation
  - Service status checks

### 2. Flight Route Service Tests

- **File**: `flight-route-service-test.js`
- **Purpose**: Tests route management and analysis features
- **Components Tested**:
  - Route retrieval
  - Popular routes ranking
  - Cheapest route finding
  - Eco-friendly route identification
  - Distance calculations
  - Carbon emissions estimation

### 3. Flight Database Tests

- **File**: `flight-db-test.js`
- **Purpose**: Tests database operations for flight data
- **Components Tested**:
  - Flight fare caching
  - Route storage and retrieval
  - Emissions data storage
  - API call logging
  - Cache management

### 4. Flight Controller API Tests

- **File**: `flight-controller-test.js`
- **Purpose**: End-to-end tests for the flight API endpoints
- **Components Tested**:
  - API request handling
  - Response formatting
  - Error handling
  - Parameter validation

## Running the Tests

You can run all the tests using the test script:

```bash
cd backend/api/scripts/test
./run-tests.sh
```

To run an individual test file:

```bash
cd backend/api
node tests/flight-service-test.js
```

## Test Environment Setup

The tests require:

1. MongoDB connection credentials in environment variables:

   - `MONGODB_USER`
   - `MONGODB_PASSWORD`
   - `MONGODB_HOST` (optional)
   - `MONGODB_DBNAME` (optional)

2. External API credentials (if testing with real APIs):
   - Configure in `.env` file (refer to `.env.sample`)

## Test Data

The tests use sample data for airport codes:

- `JFK` (New York)
- `LAX` (Los Angeles)
- `SFO` (San Francisco)
- `MIA` (Miami)

Most tests will work with simulated data if external APIs are not available.
