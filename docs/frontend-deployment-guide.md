# Frontend Deployment Guide

This guide explains how to set up automated deployment of the ChasquiFX frontend to GitHub Pages using GitHub Actions.

## GitHub Pages Setup

1. Go to your GitHub repository settings
2. Navigate to "Pages" in the left sidebar
3. Under "Source", select "Deploy from a branch"
4. Select the `gh-pages` branch and "/" (root) folder
5. Click "Save"

## Environment Variables

The workflow requires the following environment variables to be set as GitHub repository secrets:

1. `REACT_APP_API_URL`: The URL of your Vercel-deployed backend API (e.g., `https://chasquifx-api.vercel.app`)

### Setting up secrets

1. Go to your GitHub repository settings
2. Navigate to "Secrets and variables" > "Actions" in the left sidebar
3. Click "New repository secret"
4. Add each required secret with its value

## How the Deployment Works

The workflow does the following:

1. Triggers when changes are pushed to the `frontend` directory on the main branch
2. Sets up Node.js environment
3. Installs dependencies
4. Builds the React app with production settings
5. Deploys the built files to the `gh-pages` branch

## Manual Deployment

You can also trigger a deployment manually:

1. Go to the "Actions" tab in your GitHub repository
2. Select "Deploy Frontend to GitHub Pages" workflow
3. Click "Run workflow" and select the branch to deploy from

## Accessing the Deployed Site

Once deployed, your site will be available at:
`https://[your-github-username].github.io/chasquifx/`

## Troubleshooting

If you encounter deployment issues:

1. Check the Actions tab for error messages
2. Ensure you've set up the required secrets
3. Verify that your `package.json` contains the correct `homepage` field
4. Make sure the repository has GitHub Pages enabled
