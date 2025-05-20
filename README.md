# ChasquiFX

## About

ChasquiFX is a tool that integrates flight route data with foreign exchange data to provide destination recommendations based on favorable exchange rates and available flight routes.

## Recent Updates

### May 20, 2025: CORS Configuration Fix

Fixed CORS configuration to allow proper communication between the frontend and backend:

- Updated `vercel.json` to use wildcard (\*) for Access-Control-Allow-Origin
- Added proper CORS headers to all serverless function files
- Created testing scripts to verify CORS configuration
- Updated CORS configuration documentation

To deploy the CORS fix:

1. Run `./deploy-api-cors-fix.sh` from the project root
2. After deployment completes, verify with `./test-cors-config.sh`

For details, see [CORS Configuration Guide](backend/api/docs/cors-configuration-guide.md) and [CORS Update Documentation](backend/api/docs/cors-update-may-2025.md).

## Deployment

- Frontend: https://chasquifx-web.vercel.app
- Backend API: https://chasquifx-api.vercel.app

## Architecture

ChasquiFX uses a hybrid architecture with clear separation of concerns:

- **Node.js Backend**: Handles all API endpoints, authentication, and user-facing operations
- **MongoDB**: Provides caching for forex, flights, and geo data

This architecture represents a complete migration from the original Python API implementation to Node.js, with Python now serving as a specialized processing component rather than an API layer.

## Features

- Find destinations with favorable exchange rates
- View flight routes and fare information (via SerpAPI or SearchAPI integration)
- Compare destinations with interactive visualizations
- Secure storage of API keys in user accounts
- Database logging of recommendations and API usage
- Cached forex and flight data to reduce API calls
- Save favorite destinations
- Modern React frontend for improved reliability and user experience
- Robust API error handling with retry mechanisms
- Standardized data file naming and organization
- MongoDB-based caching for improved performance and reliability

## User Interface

**React Frontend**: A modern, responsive UI built with React and Material-UI

- Enhanced performance and reliability
- Better handling of API requests
- User authentication with MongoDB
- Responsive design for mobile and desktop
- Cached API results for better performance

## Data Processing

ChasquiFX includes a data processing module that handles:

- **Standardized file naming**: Automatic renaming of data files based on their content

  - Flight data: `(departure_id)_(arrival_id)_(outbound_date)_(return_date).json`
  - Forex data: `(q)_(created_at).json`

Architecture

ChasquiFX uses a hybrid architecture with the following components:

1. **React Frontend**: Deployed on GitHub Pages

   - User authentication with Supabase
   - Material UI interface
   - Modern responsive design

2. **Node.js API Backend**: Deployed on Vercel

   - Handles all API requests from the frontend
   - Manages authentication and user sessions
   - Provides RESTful endpoints with Express.js
   - Optimizes asynchronous operations

3. **Mongo DB Cluster**:
   - NoSQL database for storing user data and API logs
   - Authentication service
   - Cache layer for API responses
   - Storage for JSON documents

## Setup and Deployment

### Prerequisites

- Node.js 18+ and npm for frontend development
- MongoDB account (free tier available)
- SerpAPI account (free trial available)
- SearchAPI account (free trial available)

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/chasquifx.git
   cd chasquifx
   ```

2. **Node.js backend setup**

   ```bash
   cd backend/node
   npm install
   cp .env.template .env
   ```

3. **Frontend setup**

   ```bash
   cd frontend
   npm install

   # Create environment variables file
   cp .env.template .env.local
   ```

4. **MongoDB setup**

   - Create a new project in [MongoDB](https://www.mongodb.com/)
   - Use the js script in `backend/api/src/db/operations.js` to create the collections and indexes
   - Copy the MongoDB connection string and keys to your environment files

### Deployment

1. **Backend deployment to Vercel**

   Connect your GitHub repository to Vercel and enable automatic deployments from the backend subdirectory as the vercel project root.

   For detailed instructions, see [Vercel Deployment Guide](backend/api/docs/vercel-deployment-guide.md).

2. **Frontend deployment to GitHub Pages**

   Use the included GitHub Actions workflow by configuring the necessary secrets in your repository.

   ```bash
   # Workflow is triggered automatically on push to the main branch
   # You can also trigger it manually from the Actions tab
   ```

   For detailed instructions, see [Frontend Deployment Guide](docs/frontend-deployment-guide.md).

## API Key Setup

ChasquiFX uses SerpAPI for retrieving real-time data:

### SerpAPI and SearchAPI for Google Finance and Google Flights data

1. Sign up for a [SerpAPI account](https://serpapi.com/users/sign_up) / [SearchAPI account](https://searchapi.io/signup)
2. Get your API keys from your dashboards
3. Set up your API keys:
   - If you want to use the application without creating an account, enter your SerpAPI/SearchAPI key in the API Keys section
   - If you create a ChasquiFX account, you can securely store your API keys in your user profile

## Data Management

ChasquiFX now uses a sophisticated data management system:

1. **Real-time Data**: When a user requests recommendations, ChasquiFX fetches real-time forex and flight data using SerpAPI and/or SearchAPI. This ensures that users always receive the most up-to-date information.

   - Forex data is fetched based on the user's selected currency
   - Flight data is fetched based on the user's selected departure and arrival locations

2. **Database Cache**: Results are cached in the MongoDB database to:

   - Reduce API calls (and costs)
   - Improve response times
   - Provide fallback data when API services are unavailable

3. **User History**: All recommendations are logged in the user's profile for future reference

4. **Analytics**: API usage is logged to enable future improvements and optimizations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Node.js](https://nodejs.org/) for the backend runtime
- [React](https://reactjs.org/) for the frontend framework
- [Material-UI](https://mui.com/) for the UI components
- [MongoDB](https://www.mongodb.com/) for database and authentication
- [SerpAPI](https://serpapi.com/) for Google Finance and Google Flights data
- [SearchAPI](https://searchapi.io/) for Google Finance and Google Flights data
