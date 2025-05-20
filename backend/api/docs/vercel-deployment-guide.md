# Deploying ChasquiFX API to Vercel

This guide covers the steps required to deploy the ChasquiFX API backend to Vercel using serverless functions with MongoDB integration.

## Prerequisites

- A Vercel account (https://vercel.com)
- A MongoDB Atlas account with an existing cluster (already set up at chasquifx.ymxb5bs.mongodb.net)
- Git repository for the project

## Deployment Steps

### 1. Prepare Environment Variables

Before deploying to Vercel, you need to set up the following environment variables in the Vercel dashboard:

- `MONGODB_USER`: The MongoDB username for authentication
- `MONGODB_PASSWORD`: The MongoDB password for authentication
- `MONGODB_HOST`: MongoDB Atlas host (default: chasquifx.ymxb5bs.mongodb.net)
- `MONGODB_DBNAME`: Database name (default: chasquifx)
- `LOG_LEVEL`: The logging level (error, warn, info, debug)

### 2. Deploy with Vercel CLI (recommended)

```bash
# Install Vercel CLI if you haven't already
npm install -g vercel

# Navigate to the backend/api directory
cd backend/api

# Login to Vercel
vercel login

# Deploy to Vercel production
vercel --prod
```

### 3. Deploy from the Vercel Dashboard

Alternatively, you can deploy directly from the Vercel dashboard:

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure the project:
   - Root directory: `backend/api`
   - Build command: None (leave empty)
   - Output directory: None (leave empty)
4. Add the environment variables
5. Click "Deploy"

## API Endpoints

Once deployed, the following endpoints will be available:

- `https://chasquifx-api.vercel.app/health` - Health check endpoint
- `https://chasquifx-api.vercel.app/api/db-status` - Database connection status
- `https://chasquifx-api.vercel.app/api/v2/forex/rates` - Get forex rates
- `https://chasquifx-api.vercel.app/api/v2/forex/status` - Get forex service status

## Updating the Frontend

Update the frontend to point to the new API endpoints:

```javascript
// Change the API base URL
const API_BASE_URL = "https://chasquifx-api.vercel.app";
```

## Monitoring

To monitor your deployment:

1. Go to your project in the Vercel dashboard
2. Check the "Deployments" tab for deployment status
3. Check the "Functions" tab to see your serverless functions
4. Check the "Logs" tab for execution logs

## Troubleshooting

Common issues and solutions:

- **MongoDB Connection Errors**: Ensure your MongoDB Atlas IP access list includes Vercel's IP ranges or is set to allow access from anywhere.
- **Function Timeouts**: If functions time out, consider optimizing database queries or increasing the function timeout in your `vercel.json` file.
- **CORS Issues**: Check that the CORS headers are properly set in your API responses.

## Next Steps

- Set up a custom domain for your API
- Configure automatic deployments from your Git repository
- Set up monitoring and alerts for your API
