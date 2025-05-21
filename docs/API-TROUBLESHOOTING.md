# ChasquiFX API Troubleshooting Guide

## Current Status

✅ **CORS Configuration**: Successfully fixed and deployed

❌ **Recommendations API**: Returning 500 internal server errors

## Troubleshooting Steps for 500 Errors

### 1. Diagnose the Issue

Run the diagnostic script to check all endpoints:

```bash
./test-api-endpoints.sh
```

This will:

- Check basic health endpoint
- Test database connectivity
- Test forex status endpoints
- Test the recommendations endpoints with parameters
- Show detailed response headers and bodies

### 2. Check Server Logs

The 500 error details will be in the Vercel logs:

1. Go to the [Vercel Dashboard](https://vercel.com)
2. Select the `chasquifx-api` project
3. Go to "Deployments" and click on the latest deployment
4. Click "Functions" and look for `/api/v2/recommendations` or `/api/v1/recommendations`
5. Check the error logs for specific error messages

### 3. Common Issues and Fixes

#### Database Connection Problems

If the error is related to database connectivity:

1. Check if MongoDB connection string is correctly set in Vercel environment variables
2. Ensure the IP address of the Vercel deployment is whitelisted in MongoDB Atlas
3. Verify that the database and collections exist

```bash
# You can test the MongoDB connection with:
node -e "const { MongoClient } = require('mongodb'); async function testConnection() { const client = new MongoClient(process.env.MONGODB_URI); try { await client.connect(); console.log('Connected successfully'); const db = client.db(); const collections = await db.listCollections().toArray(); console.log(collections); } catch(err) { console.error('Connection failed:', err); } finally { await client.close(); } } testConnection();"
```

#### Missing Data or Invalid Parameters

If the error is related to missing or invalid data:

1. Check if the recommendations controller has proper error handling
2. Validate the parameters being sent from the frontend
3. Check for any required data that might be missing from the database

#### Environment Variables

Critical environment variables might be missing:

1. MONGODB_URI
2. SERPAPI_KEY (for external API calls)
3. JWT_SECRET (for authentication)

Add any missing variables in the Vercel dashboard under Settings > Environment Variables.

### 4. Fix and Deploy

After identifying the issue:

1. Run the recommendations API fix tool:

```bash
./fix-recommendations-api.sh
```

2. This will help diagnose specific issues and offer deployment options

### 5. Test Frontend Integration

Once the API is fixed:

1. Run the frontend diagnostic tool:

```bash
./test-frontend.sh
```

2. Test the frontend application with actual searches
3. Monitor the browser console for any remaining errors

## Next Steps

If the recommendations API continues to have issues:

1. Consider implementing mock data temporarily to allow frontend development to continue
2. Add more comprehensive logging to the API endpoints
3. Set up a test suite to validate the recommendations API functionality
4. Consider adding a fallback mechanism in the frontend to handle API failures gracefully
