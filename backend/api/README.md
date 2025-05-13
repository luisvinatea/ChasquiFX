# ChasquiFX API

This directory contains the API component of the ChasquiFX application, restructured into a modular architecture for better maintainability.

## Directory Structure

```text
backend/api/
├── config/             # Configuration settings
│   ├── __init__.py
│   └── settings.py
├── models/             # Data models (Pydantic schemas)
│   ├── __init__.py
│   └── schemas.py
├── routes/             # API routes
│   ├── __init__.py
│   ├── forex.py
│   └── recommendations.py
├── services/           # Business logic services
│   ├── __init__.py
│   ├── flight_service.py
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

### Config Module

Contains all configuration settings for the application.

### Models Module

Contains Pydantic models for request/response validation.

### Routes Module

Contains API endpoints organized by domain.

### Services Module

Contains business logic services:

- **forex_service**: Currency exchange rate functionality
- **geo_service**: Geographic and route mapping functionality
- **flight_service**: Flight fare functionality
- **recommendation_service**: Core recommendation engine

### Utils Module

Contains utility functions used across the application.

## Running the API

To run the API server:

```bash
python -m uvicorn backend.api.main:app --reload
```

Or use the provided script:

```bash
./run_chasquifx.sh
```
