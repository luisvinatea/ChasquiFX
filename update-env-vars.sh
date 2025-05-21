#!/bin/bash

# Script to update environment variables from REACT_APP_ to VITE_
# This script will scan the src directory and update all references

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}ChasquiFX Environment Variables Update${NC}"
echo -e "${BLUE}=====================================${NC}"

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo -e "${RED}Error: frontend directory not found${NC}"
    exit 1
fi

# Navigate to the frontend directory
cd frontend

# Create a backup of the .env files if they exist
if [ -f ".env" ]; then
    echo -e "${YELLOW}Backing up .env file...${NC}"
    cp .env .env.backup
    echo -e "${GREEN}✓ .env backup created${NC}"
fi

if [ -f ".env.development" ]; then
    echo -e "${YELLOW}Backing up .env.development file...${NC}"
    cp .env.development .env.development.backup
    echo -e "${GREEN}✓ .env.development backup created${NC}"
fi

if [ -f ".env.production" ]; then
    echo -e "${YELLOW}Backing up .env.production file...${NC}"
    cp .env.production .env.production.backup
    echo -e "${GREEN}✓ .env.production backup created${NC}"
fi

# Update .env files
echo -e "${YELLOW}Updating environment files...${NC}"
for env_file in .env .env.development .env.production; do
    if [ -f "$env_file" ]; then
        echo -e "${YELLOW}Processing $env_file...${NC}"
        # Create a temporary file with updated variables
        sed 's/REACT_APP_/VITE_/g' "$env_file" >"$env_file.tmp"
        mv "$env_file.tmp" "$env_file"
        echo -e "${GREEN}✓ $env_file updated${NC}"
    fi
done

# Find all JavaScript and JSX files and update environment variable references
echo -e "${YELLOW}Updating environment variable references in source code...${NC}"
find src -type f -name "*.js" -o -name "*.jsx" | while read -r file; do
    echo -e "${YELLOW}Processing $file...${NC}"
    # Create a backup of the file
    cp "$file" "$file.bak"
    # Replace process.env.REACT_APP_ with import.meta.env.VITE_
    sed -i 's/process\.env\.REACT_APP_/import.meta.env.VITE_/g' "$file"
    # Check if any replacements were made
    if cmp -s "$file" "$file.bak"; then
        echo -e "${YELLOW}No changes in $file${NC}"
        rm "$file.bak"
    else
        echo -e "${GREEN}✓ Updated $file${NC}"
        rm "$file.bak"
    fi
done

# Create a .env template file for reference
echo -e "${YELLOW}Creating .env.example template...${NC}"
cat >.env.example <<'EOL'
# Vite Environment Variables
# Note: All variables must be prefixed with VITE_ to be accessible in client-side code

# API URL
VITE_API_URL=https://chasquifx-api.vercel.app

# Feature flags
VITE_ENABLE_RECOMMENDATIONS=true
VITE_ENABLE_FLIGHTS=true

# Analytics
VITE_ENABLE_ANALYTICS=false
EOL

echo -e "${GREEN}✓ Created .env.example template${NC}"

# Create a GitHub Action workflow for Vite deployment
echo -e "${YELLOW}Creating GitHub Action workflow for Vite deployment...${NC}"
mkdir -p ../.github/workflows

cat >../.github/workflows/frontend-deploy.yml <<'EOL'
name: Deploy Frontend to Vercel

on:
  push:
    branches: [ main ]
    paths:
      - 'frontend/**'
      - '.github/workflows/frontend-deploy.yml'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        working-directory: frontend
        run: npm ci
      
      - name: Build project
        working-directory: frontend
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: frontend
EOL

echo -e "${GREEN}✓ GitHub Action workflow created${NC}"
echo -e "${YELLOW}Note: You'll need to add VERCEL_TOKEN, VERCEL_ORG_ID, and VERCEL_PROJECT_ID secrets to your GitHub repository${NC}"

# Back to the root directory
cd ..

echo -e "${GREEN}✓ Environment variables update complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Review the updated environment variables in your code"
echo -e "2. Add the necessary environment variables to your Vercel project"
echo -e "3. Update references to process.env in any scripts that weren't caught by the update"
echo -e "4. Test the application locally with the new environment variables"
