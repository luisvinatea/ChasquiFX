# CI/CD Workflows

This document describes all the continuous integration and deployment workflows set up for ChasquiFX.

## Frontend Workflows

### 1. Deploy Frontend to GitHub Pages (`deploy-frontend.yml`)

**Purpose**: Automates the building and deployment of the React frontend to GitHub Pages.

**Triggers**:

- Push to the `main` branch (only frontend directory changes)
- Manual trigger from GitHub Actions tab

**Steps**:

1. Checkout code
2. Set up Node.js environment
3. Install dependencies
4. Build React application
5. Deploy to `gh-pages` branch

**Required Secrets**:

- `REACT_APP_API_URL`: The URL of the deployed backend API

### 2. Verify API Connection (`verify-api-connection.yml`)

**Purpose**: Ensures the deployed frontend can connect to the backend API.

**Triggers**:

- After the frontend deployment workflow completes
- Manual trigger from GitHub Actions tab

**Steps**:

1. Test API health endpoint
2. Test Forex status endpoint
3. Test database status endpoint

## Backend Workflows

For backend deployment to Vercel, we use Vercel's GitHub integration rather than a separate GitHub Actions workflow.

**Required Secrets for Vercel**:

- `MONGODB_USER`
- `MONGODB_PASSWORD`
- `MONGODB_HOST`
- `MONGODB_DBNAME`
- `LOG_LEVEL`

## Integration Testing

For integration testing between frontend and backend, use the following:

```bash
# Run the integration test script
./run-integration-test.sh
```

This script tests the complete flow from frontend to backend to database.

## GitHub Repository Secrets Setup

1. Go to your repository's Settings
2. Navigate to Secrets and variables > Actions
3. Add the following secrets:
   - `REACT_APP_API_URL`: Your Vercel API URL (e.g., `https://chasquifx-api.vercel.app`)
   - `VERCEL_TOKEN`: Your Vercel personal access token
   - `VERCEL_PROJECT_ID`: Your Vercel project ID
   - `VERCEL_ORG_ID`: Your Vercel organization ID
