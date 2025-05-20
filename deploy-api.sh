#!/bin/bash

# ChasquiFX Backend API Deployment Script
# This script deploys the backend API to Vercel with the updated CORS configuration

echo "🚀 Starting ChasquiFX API deployment..."

# Navigate to the backend API directory
cd "$(dirname "$0")" || exit
cd ../backend/api || exit

# Ensure Vercel CLI is installed
if ! command -v vercel &>/dev/null; then
    echo "⚠️ Vercel CLI is not installed. Installing it now..."
    npm install -g vercel
fi

echo "✅ Vercel CLI is ready"

# Login to Vercel if not already logged in
vercel whoami &>/dev/null || vercel login

# Deploy to production
echo "🔄 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment completed!"
echo "🌐 Your API should now be accessible from: https://chasquifx-api.vercel.app"
echo "📝 Check the logs to ensure the deployment was successful"
echo "📋 If you encounter CORS issues, refer to the documentation in backend/api/docs/cors-configuration-guide.md"

exit 0
