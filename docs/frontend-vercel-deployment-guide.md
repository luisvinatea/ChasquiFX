# Vercel Deployment Guide for ChasquiFX Frontend

## Overview

The ChasquiFX frontend is deployed to Vercel and is accessible at https://chasquifx-web.vercel.app. This document provides information about the deployment configuration and process.

## Deployment Configuration

### Project Structure

The Vercel deployment is configured to use the `frontend` subdirectory as the project root. This means that only changes to files within the `frontend` directory will trigger a new deployment.

### Environment Variables

The following environment variables are configured in the Vercel dashboard:

- `REACT_APP_API_URL`: The URL of the backend API (https://chasquifx-api.vercel.app)
- `NODE_ENV`: Set to `production` for production deployments

### Build Settings

The build process uses the following settings:

- **Framework Preset**: Create React App
- **Build Command**: `npm run build`
- **Output Directory**: `build`

## Deployment Process

1. Deployments are automatically triggered when changes are pushed to the `main` branch.
2. Only changes to files within the `frontend` directory will trigger a new deployment.
3. The build process installs dependencies, builds the app, and deploys it to the Vercel CDN.

## Testing Deployments

To test deployments locally before pushing to the main branch:

1. Install the Vercel CLI: `npm install -g vercel`
2. Navigate to the frontend directory: `cd frontend`
3. Run `vercel` to deploy a preview

## Troubleshooting

If you encounter issues with the deployment:

1. Check the build logs in the Vercel dashboard
2. Ensure all required environment variables are set
3. Verify that the API URL is correct and the backend is accessible
4. Check for any browser console errors related to API connectivity or CORS issues

## Related Documentation

- [Vercel Documentation](https://vercel.com/docs)
- [Create React App Deployment](https://create-react-app.dev/docs/deployment/)
