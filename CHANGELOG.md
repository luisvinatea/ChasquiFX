# ChasquiFX Changelog

## [1.3.0] - 2025-05-18

### Added in 1.3.0

- Hybrid architecture with Node.js API backend and Python data processing
- Node.js bridge for communication between Node and Python
- System status component in frontend to monitor both backends
- Improved asynchronous handling with Express.js
- Automatic setup script for simplified installation
- Hybrid backend launcher script
- Enhanced Vercel deployment configuration for dual backends
- Comprehensive hybrid deployment documentation

### Changed in 1.3.0

- Migrated API handling from Python FastAPI to Node.js/Express
- Updated frontend to communicate with Node.js API backend
- Optimized data processing pipeline to focus exclusively on Python
- Improved caching mechanisms between Node.js and Python
- Marked redundant Python API routes as deprecated
- Created detailed migration documentation
- Added clear deprecation notices to Python components
- Removed deprecated Python code and replaced with minimal stub files
- Archived original implementation for reference
- Enhanced error handling across the entire stack
- Updated deployment documentation with hybrid architecture details

### Fixed in 1.3.0

- Improved handling of SerpAPI rate limiting
- Better error reporting between backend services
- Reduced latency in API responses

## [1.2.0] - 2025-05-17

### Added in 1.2.0

- User authentication with Supabase integration
- Database storage for API keys and user preferences
- Caching of forex and flight data in PostgreSQL database
- API usage logging to track and optimize SerpAPI calls
- User recommendation history tracking
- Environment variables template files (.env.template)
- Vercel configuration for backend deployment
- GitHub Actions workflow for CI/CD
- Supabase SQL schema for database setup
- Updated documentation with authentication and database details

### Changed in 1.2.0

- Updated API endpoints to support user authentication
- Modified forex and flight services to check database cache first
- Enhanced frontend with user authentication UI
- Updated user interface to show recommendation history
- Improved error handling with more detailed messages
- Updated README with deployment instructions

## [1.1.0] - 2025-05-16

### Added in 1.1.0

- Health check endpoint at /health to verify API status and environment variable configuration
- Robust retry mechanism with exponential backoff for SerpAPI requests
- Comprehensive unit tests for forex service functionality
- Test script (test_forex.sh) to run all forex service tests
- Debug mode in run_chasquifx.sh (./run_chasquifx.sh --debug)
- Enhanced environment variable validation in run_chasquifx.sh
- Detailed error handling for API requests
- Testing instructions in README.md
- This CHANGELOG.md file

### Changed in 1.1.0

- Updated forex_service.py to use execute_serpapi_request helper function for API calls with retry
- Improved error reporting in forex_service.py
- Enhanced README.md with testing and troubleshooting sections
- Updated run_chasquifx.sh to check for API key configuration

### Fixed in 1.1.0

- SerpAPI rate limiting issues with retry mechanism
- Environment variable loading and verification
- Main script error handling

## [1.0.0] - 2025-05-12

### Added in 1.0.0

- Initial implementation of ChasquiFX
- Google Finance integration via SerpAPI for forex data
- React-based frontend
- FastAPI backend
- Recommendation system based on forex rates and flight availability
- Environment variable support with dotenv
- Utility scripts for testing and diagnostics
