#!/bin/bash

# ChasquiFX Migration Deployment Script
# This script helps deploy the migrated Next.js application to Vercel

# Print colorful messages
print_message() {
    echo -e "\e[1;34m>>> $1\e[0m"
}

print_success() {
    echo -e "\e[1;32m>>> $1\e[0m"
}

print_error() {
    echo -e "\e[1;31m>>> $1\e[0m"
}

# Check if Vercel CLI is installed
print_message "Checking Vercel CLI installation..."
if ! command -v vercel &>/dev/null; then
    print_error "Vercel CLI is not installed. Installing..."
    npm install -g vercel
else
    print_success "Vercel CLI is already installed."
fi

# Log in to Vercel if not already logged in
print_message "Checking Vercel authentication..."
if ! vercel whoami &>/dev/null; then
    print_error "Not logged in to Vercel. Please log in:"
    vercel login
else
    print_success "Already logged in to Vercel."
fi

# Prepare environment variables
print_message "Preparing environment variables..."
print_message "You will need the following environment variables:"
echo "- MONGODB_URI: MongoDB connection string"
echo "- MONGODB_DB_NAME: MongoDB database name (default: chasquifx)"
echo "- JWT_SECRET: Secret for JWT tokens"
echo "- SERPAPI_API_KEY: SerpAPI key (if used)"
echo "- SEARCHAPI_API_KEY: Search API key (if used)"
echo "- EXCHANGE_API_KEY: Exchange rate API key"
echo "- SUPABASE_URL: Supabase URL (if used)"
echo "- SUPABASE_ANON_KEY: Supabase anonymous key (if used)"
print_message "You can set these up during deployment or add them manually in the Vercel dashboard after deployment."

# Build the application
print_message "Building the application..."
npm run build

# Deploy to production
print_message "Ready to deploy to Vercel."
read -r -p "Deploy to production? (y/n): " deploy_answer
if [[ $deploy_answer == "y" ]]; then
    print_message "Deploying to production..."
    vercel --prod

    print_success "Deployment completed!"
    print_message "Check your deployment in the Vercel dashboard."
    print_message "Make sure all environment variables are properly set."
    print_message "You might need to run 'vercel env pull' to update your local .env file."
else
    print_message "Skipping production deployment."
    print_message "To deploy later, run 'vercel --prod'."
fi

print_success "Migration deployment script completed!"
