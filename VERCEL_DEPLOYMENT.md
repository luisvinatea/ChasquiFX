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

## Troubleshooting

If you encounter errors in the deployment:

1. Check the logs in the Vercel dashboard
2. Make sure all environment variables are correctly set
3. Check that the API URLs in the frontend are correctly pointing to your deployed backend
4. If the API returns 500 errors, check the logs for internal server errors

## CORS Configuration

The backend API has CORS configured to allow requests from all origins. If you need to restrict this, update the CORSMiddleware configuration in `backend/api/vercel_handler.py`.
