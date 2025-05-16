# ChasquiFX Changelog

## [1.1.0] - 2025-05-16

### Added

- Health check endpoint at /health to verify API status and environment variable configuration
- Robust retry mechanism with exponential backoff for SerpAPI requests
- Comprehensive unit tests for forex service functionality
- Test script (test_forex.sh) to run all forex service tests
- Debug mode in run_chasquifx.sh (./run_chasquifx.sh --debug)
- Enhanced environment variable validation in run_chasquifx.sh
- Detailed error handling for API requests
- Testing instructions in README.md
- This CHANGELOG.md file

### Changed

- Updated forex_service.py to use execute_serpapi_request helper function for API calls with retry
- Improved error reporting in forex_service.py
- Enhanced README.md with testing and troubleshooting sections
- Updated run_chasquifx.sh to check for API key configuration

### Fixed

- SerpAPI rate limiting issues with retry mechanism
- Environment variable loading and verification
- Main script error handling

## [1.0.0] - 2025-05-12

### **Added**

- Initial implementation of ChasquiFX
- Google Finance integration via SerpAPI for forex data
- React-based frontend
- FastAPI backend
- Recommendation system based on forex rates and flight availability
- Environment variable support with dotenv
- Utility scripts for testing and diagnostics
