# ChasquiFX Python Data Processing Backend

This directory contains the data processing backend for ChasquiFX. In the current hybrid architecture, this Python component serves as a specialized data processing engine and is no longer responsible for API endpoints, which have been migrated to Node.js.

## Directory Structure

```text
backend/api/
├── adapters/           # Node.js integration adapters
│   ├── __init__.py
│   └── node_adapter.py
├── config/             # Configuration settings
│   ├── __init__.py
│   └── settings.py
├── data_processing/    # Core data processing functionality
│   ├── __init__.py
│   └── ...
├── db/                 # Database operations and models
│   ├── __init__.py
│   └── ...
├── deprecated/         # Archived code (for reference)
│   ├── README.md
│   ├── auth.py.deprecated
│   ├── forex.py.deprecated
│   └── recommendations.py.deprecated
├── models/             # Data models (Pydantic schemas)
│   ├── __init__.py
│   └── schemas.py
├── node_bridge.py      # Entry point for Node.js to call Python
├── routes/             # Empty router (API migrated to Node.js)
│   └── __init__.py
├── services/           # Business logic services
│   ├── forex_service.py
│   ├── geo_service.py
│   └── recommendation_service.py
├── utils/              # Utility functions
│   ├── __init__.py
│   └── logging_utils.py
├── __init__.py
└── main.py             # Main entry point
```

## Module Overview

### Adapters Module

Provides integration points for Node.js to access Python functionality.

### Config Module

Contains all configuration settings for the application.

### Data Processing Module

Contains specialized data processing functions and utilities.

### Models Module

Contains Pydantic models for data validation.

### Routes Module

Previously contained API endpoints, now empty. All API endpoints have been migrated to Node.js.

### Services Module

Contains business logic services:

- **forex_service**: Currency exchange rate functionality
- **geo_service**: Geographic and route mapping functionality
- **flight_service**: Flight fare functionality
- **recommendation_service**: Core recommendation engine

### Utils Module

Contains utility functions used across the application.

## Node.js Integration

The Python backend now exposes its functionality through the `node_bridge.py` module, which allows the Node.js backend to:

1. Call Python data processing functions
2. Access specialized algorithms
3. Interface with data in formats like Parquet

All user-facing API endpoints are now handled by Node.js.

## Running the Python Backend

To run the Python data processing backend:

```bash
python -m uvicorn backend.api.main:app --reload
```

Or use the provided script:

```bash
./run_chasquifx.sh
```
