# CORS Configuration Update

## Summary of Changes

- Modified `vercel.json` to use a wildcard (\*) for the `Access-Control-Allow-Origin` header
- Updated `Access-Control-Allow-Headers` in all serverless function files to include:
  - Authorization
  - X-Serpapi-Key
  - X-Search-Api-Key
  - X-Exchange-Api-Key

## Files Modified

1. `/backend/api/vercel.json` - Updated CORS headers to use wildcard
2. `/backend/api/api/forex.js` - Added missing headers
3. `/backend/api/api/health.js` - Added missing headers
4. `/backend/api/api/db-status.js` - Added missing headers

## Testing

A testing script (`test-cors-config.sh`) has been created to verify the CORS configuration is working correctly after deployment.

## Deployment Instructions

1. Run the deployment script to push changes to Vercel:

   ```bash
   ./deploy-api-cors-fix.sh
   ```

2. After deployment completes, test the CORS configuration:
   ```bash
   ./test-cors-config.sh
   ```

## Verification

The frontend at https://chasquifx-web.vercel.app should now be able to make API requests to https://chasquifx-api.vercel.app without CORS errors.
