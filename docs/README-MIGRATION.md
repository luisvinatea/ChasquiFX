# ChasquiFX - Next.js Migration Guide

This guide documents the process of migrating two separate Vercel deployments (frontend and backend API) into a single Next.js application.

## Migration Overview

The migration involves:

1. Consolidating two separate deployments into a single Next.js app
2. Moving backend API endpoints to Next.js API routes
3. Updating frontend code to use the unified API
4. Creating a single deployment configuration

## Migration Steps

### 1. API Routes Migration

Backend API endpoints have been migrated to Next.js API routes:

- `/health` → `/src/app/api/health/route.js`
- `/db-status` → `/src/app/api/db-status/route.js`
- `/forex` → `/src/app/api/forex/route.js`

### 2. Database Connection

MongoDB connection logic has been moved to:

- `/src/app/lib/mongodb.js`

### 3. API Client Update

The API client (`chasquiApi.js`) has been updated to:

- Use relative API paths for single deployment architecture
- Make client-side code safe for server-side rendering
- Support Next.js App Router architecture

### 4. Deployment Configuration

A unified `vercel.json` has been created with:

- Environment variables
- CORS headers
- Security headers

## Testing the Migration

To test the migration locally:

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

The application should be available at http://localhost:3000.

## Deployment

To deploy the migrated application:

```bash
# Log in to Vercel
vercel login

# Deploy to production
vercel --prod
```

Ensure all environment variables are set up in the Vercel dashboard:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `JWT_SECRET`
- `SERPAPI_API_KEY`
- `SEARCHAPI_API_KEY`

## Benefits of Migration

- **Simplified Infrastructure**: One deployment instead of two
- **Reduced Costs**: Lower Vercel hosting costs
- **Better Performance**: Local API calls instead of cross-origin requests
- **Easier Authentication**: Shared auth context
- **Simplified Development**: Single codebase

## Future Enhancements

1. Add more API endpoints from the original backend
2. Implement proper authentication flow in the unified app
3. Add more robust error handling in API routes
