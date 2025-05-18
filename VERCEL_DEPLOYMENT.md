# ChasquiFX Vercel Deployment

This document describes how to deploy the ChasquiFX application to Vercel.

## Frontend Deployment

The frontend is built using React and can be deployed to Vercel by following these steps:

1. Make sure you have the Vercel CLI installed: `npm install -g vercel`
2. Navigate to the frontend directory: `cd frontend`
3. Run `vercel` and follow the prompts
4. For production deployment: `vercel --prod`

## Backend Deployment

The backend API is built using FastAPI and can be deployed to Vercel by following these steps:

1. Make sure you have the Vercel CLI installed: `npm install -g vercel`
2. Navigate to the root directory (containing the backend folder)
3. Run `vercel` and follow the prompts
4. For production deployment: `vercel --prod`

## Environment Variables

Make sure to set the following environment variables in your Vercel project:

### Backend Environment Variables

- `SERPAPI_API_KEY`: Your SerpAPI key for fetching forex data
- `SUPABASE_URL`: Your Supabase URL
- `SUPABASE_KEY`: Your Supabase anon key
- `VERCEL_DEPLOYMENT`: Set to `true` to enable Vercel deployment mode

### Frontend Environment Variables

- `REACT_APP_API_URL`: URL of your deployed backend API
- `REACT_APP_SUPABASE_URL`: Your Supabase URL
- `REACT_APP_SUPABASE_ANON_KEY`: Your Supabase anon key

## SerpAPI Quota Management

ChasquiFX uses SerpAPI to fetch real-time forex and flight data. SerpAPI has usage limits based on your subscription tier:

### Handling Quota Limits

The application has been enhanced to handle SerpAPI quota limits gracefully:

1. When a quota limit is detected, the application will:

   - Save the quota status information to persist between requests
   - Return a specific error message to clients
   - Fall back to using cached or simulated data when possible

2. Frontend components will display appropriate notifications when:
   - API quota is exceeded
   - Data being displayed is simulated or from cache

### Monitoring Quota Usage

To monitor your SerpAPI quota usage:

1. Log in to your SerpAPI dashboard at [https://serpapi.com/dashboard](https://serpapi.com/dashboard)
2. Check your remaining credits and usage history
3. Consider upgrading your plan if you consistently hit limits

### Resetting Quota Status

If you've resolved quota issues (e.g., by upgrading your plan), you can reset the quota status:

1. Access your Vercel deployment
2. Go to the "Functions" section in the Vercel dashboard
3. Find and invoke the `/api/forex/reset_quota_status` endpoint with an authorized API key

## Testing the Deployment

Before announcing your deployment to users:

1. Test API connectivity with browser tools or Postman:

   - Check `GET https://your-backend-url.vercel.app/api/forex/status`
   - Verify the frontend can connect to the backend

2. Test both frontend and backend with different API keys:

   - Try with valid API keys
   - Test the fallback behavior with invalid or expired keys

3. Verify fallback data works correctly:
   - The application should still function when API quota is exceeded
   - Users should see appropriate notifications

## Troubleshooting

If you encounter errors in the deployment:

1. Check the logs in the Vercel dashboard
2. Make sure all environment variables are correctly set
3. Check that the API URLs in the frontend are correctly pointing to your deployed backend
4. If the API returns 500 errors, check the logs for internal server errors

## CORS Configuration

The backend API has CORS configured to allow requests from all origins. If you need to restrict this, update the CORSMiddleware configuration in `backend/api/vercel_handler.py`.
