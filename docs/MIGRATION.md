# ChasquiFX - Migrated Single Deployment

This project has been migrated from two separate Vercel deployments (frontend and backend API) into a single Next.js application deployment.

## Migration Summary

The migration involved the following steps:

1. **Integrated Backend API with Next.js API Routes**:

   - Moved backend API endpoints into `/src/app/api` directory structure
   - Implemented Next.js API routes using the App Router pattern
   - Preserved all existing API functionality

2. **MongoDB Integration**:

   - Carried over database connection utilities to Next.js
   - Optimized for serverless environment
   - Preserved connection pooling for better performance

3. **Frontend API Client Update**:

   - Modified `chasquiApi.js` to use relative API paths
   - Made client-side code safe for server-side rendering
   - Implemented feature parity with previous API client

4. **Deployment Configuration**:
   - Created a unified `vercel.json` configuration
   - Set up environment variables in a single place
   - Configured proper CORS headers

## Environment Variables

Make sure to set the following environment variables in your Vercel deployment:

```
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=chasquifx
JWT_SECRET=your_jwt_secret
SERPAPI_API_KEY=your_serpapi_key
SEARCHAPI_API_KEY=your_searchapi_key
```

## API Endpoints

The following API endpoints are available in the migrated application:

- `/api/health` - API health check endpoint
- `/api/db-status` - Database connection status
- `/api/forex` - Forex rates and status
  - Query params: `rates=true&from_currency=USD&to_currency=EUR`

## Local Development

To run the project locally:

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

The application will be available at http://localhost:3000.

## Deployment

This project is configured for deployment on Vercel. Simply push to your main branch or run:

```bash
vercel --prod
```

## Migration Benefits

- **Simplified Infrastructure**: Single deployment to manage
- **Reduced Costs**: One deployment instead of two
- **Better Performance**: API routes run on the same infrastructure
- **Simplified Authentication**: Shared auth context between frontend and API
- **Easier Maintenance**: Single codebase to update and maintain
