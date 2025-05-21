# ChasquiFX MongoDB Connection Fix Guide

## Current Status

You're experiencing 500 errors from all API endpoints:
- `/api/v2/forex/status`
- `/api/v1/forex/status`
- `/health`

The error logs indicate that these are MongoDB connection failures, which are preventing the API from functioning properly.

## Problem Diagnosis

Based on the error analysis, there are several potential issues:

1. **MongoDB Authentication Failure**:
   - Incorrect username/password in the Vercel environment variables
   - User might not have access to the specified database

2. **MongoDB Network Access**:
   - MongoDB Atlas might be blocking connections from Vercel's servers
   - IP-based access control in MongoDB Atlas needs updating

3. **MongoDB Cluster Status**:
   - The MongoDB Atlas cluster might be paused or in maintenance
   - The cluster might have been deleted or renamed

4. **Environment Variables**:
   - Missing or incorrect MongoDB environment variables in Vercel deployment

## Immediate Solutions

I've provided several tools to help diagnose and fix these issues:

### 1. Use the MongoDB Debug Endpoint

I've created a special diagnostic endpoint that provides detailed information about the MongoDB connection issues.

```bash
# Deploy just the debug endpoint first
./scripts/deploy-mongodb-debug.sh

# Then access the diagnostic endpoint at:
# https://chasquifx-api.vercel.app/api/debug/mongodb
```

This will show you:
- Exactly what error is occurring
- Which MongoDB settings are being used
- Specific recommendations for fixing the issue

### 2. Update MongoDB Connection Settings

After identifying the specific issue, follow these steps:

#### If Authentication Failed:

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Go to Database Access under Security
3. Check if your user exists and has the right permissions
4. Reset the password for the user
5. Update the Vercel environment variables:

```bash
vercel env add MONGODB_USER
vercel env add MONGODB_PASSWORD
```

#### If Network Access Failed:

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Go to Network Access under Security
3. Add `0.0.0.0/0` to allow connections from anywhere (for testing)
4. Or add Vercel's IP ranges (check Vercel documentation)

#### If Cluster Configuration is Wrong:

1. Verify the correct MongoDB host:
   - Current setting: `chasquifx.ymxb5bs.mongodb.net`
   - Should match what you see in MongoDB Atlas dashboard
2. Update if needed:

```bash
vercel env add MONGODB_HOST
```

### 3. Deploy with Fixed Settings

After updating the MongoDB connection settings:

```bash
# Navigate to the API directory
cd backend/api

# Deploy to Vercel
./deploy.sh
```

## Additional Improved Tools

I've also made several improvements to help fix and prevent similar issues:

1. **Enhanced MongoDB Connection Module**:
   - Added better error handling with specific error messages
   - Increased connection timeouts for more reliability
   - Added detailed logging for troubleshooting

2. **Vercel MongoDB Diagnostic Tool**:
   ```bash
   ./scripts/diagnose-vercel-mongodb.sh
   ```
   This creates and deploys a specialized diagnostic function that tests the MongoDB connection directly in the Vercel environment.

## Prevention Tips

To prevent these issues in the future:

1. **Monitor MongoDB Atlas Status**:
   - Set up alerts for MongoDB Atlas cluster status
   - Regularly check connection health

2. **Manage Environment Variables**:
   - Keep a secure record of MongoDB credentials
   - Test changes locally before deploying to Vercel

3. **Implement Health Checks**:
   - Add automated health checks to monitor API endpoints
   - Set up alerts for API failures

## Support Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Vercel Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)
- [MongoDB Connection Troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/)

---

After implementing these fixes, your API should start working correctly, resolving the 500 errors and CORS issues.
