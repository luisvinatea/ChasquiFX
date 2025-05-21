#!/bin/bash

# Master script to run the complete migration from CRA to Vite
# This script will run all three migration scripts in sequence

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}ChasquiFX Complete Frontend Migration to Vite${NC}"
echo -e "${BLUE}=================================================${NC}"

# Check if all required scripts exist
if [ ! -f "migrate-to-vite.sh" ]; then
    echo -e "${RED}Error: migrate-to-vite.sh not found${NC}"
    exit 1
fi

if [ ! -f "update-env-vars.sh" ]; then
    echo -e "${RED}Error: update-env-vars.sh not found${NC}"
    exit 1
fi

if [ ! -f "update-app-jsx.sh" ]; then
    echo -e "${RED}Error: update-app-jsx.sh not found${NC}"
    exit 1
fi

# Make sure all scripts are executable
chmod +x migrate-to-vite.sh
chmod +x update-env-vars.sh
chmod +x update-app-jsx.sh

echo -e "${YELLOW}Step 1: Running migrate-to-vite.sh...${NC}"
./migrate-to-vite.sh

# Check if migration was successful
# shellcheck disable=SC2181
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: migrate-to-vite.sh failed${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 2: Running update-env-vars.sh...${NC}"
./update-env-vars.sh

# Check if environment variables update was successful
# shellcheck disable=SC2181
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: update-env-vars.sh failed${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 3: Running update-app-jsx.sh...${NC}"
./update-app-jsx.sh

# Check if App.jsx update was successful
# shellcheck disable=SC2181
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: update-app-jsx.sh failed${NC}"
    exit 1
fi

# Additional post-migration steps
echo -e "${YELLOW}Step 4: Running additional post-migration tasks...${NC}"

# Navigate to frontend directory
cd frontend || exit

# Update .gitignore for Vite specifics
echo -e "${YELLOW}Updating .gitignore for Vite...${NC}"
cat >>.gitignore <<'EOL'

# Vite specific
/dist
.env*
!.env.example

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
EOL

echo -e "${GREEN}✓ Updated .gitignore${NC}"

# Create a Vite-specific README
echo -e "${YELLOW}Creating Vite-specific README...${NC}"
mv README.md README-old.md
cat >README.md <<'EOL'
# ChasquiFX Frontend

## Overview

ChasquiFX is a smart forex travel companion that helps users find destinations with favorable exchange rates for their travel budget. This frontend application is built with React and Vite.

## Features

- User authentication with JWT
- API key management
- Flight recommendations based on forex rates
- Interactive data visualization
- Material UI components for a modern interface

## Development

### Prerequisites

- Node.js 16+
- npm 8+

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`

### Running locally

Start the development server:

```bash
npm run dev
```

The application will be available at http://localhost:3000

### Building for production

```bash
npm run build
```

This will create a `dist` folder with the production build.

### Preview production build

```bash
npm run preview
```

## Deployment

The frontend is configured for deployment on Vercel. Pushing to the main branch will trigger automatic deployment via GitHub Actions.

## Environment Variables

All environment variables must be prefixed with `VITE_` to be accessible in the client-side code:

- `VITE_API_URL`: The URL of the backend API
- `VITE_ENABLE_RECOMMENDATIONS`: Enable/disable the recommendations feature
- `VITE_ENABLE_FLIGHTS`: Enable/disable the flights feature
- `VITE_ENABLE_ANALYTICS`: Enable/disable analytics

## Project Structure

- `/src`: Source code
  - `/components`: React components
  - `/services`: API and service functions
  - `/utils`: Utility functions
  - `/assets`: Static assets
  - `App.jsx`: Main application component
  - `main.jsx`: Entry point
EOL

echo -e "${GREEN}✓ Created Vite-specific README${NC}"

# Test the build process
echo -e "${YELLOW}Testing the build process...${NC}"
npm run build

# Check if build was successful
# shellcheck disable=SC2181
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Build process failed. Please check the errors and fix them manually.${NC}"
    cd ..
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"

# Back to root directory
cd ..

echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}✓ Migration to Vite completed successfully!${NC}"
echo -e "${GREEN}=================================================${NC}"

echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Test the application locally with 'cd frontend && npm run dev'"
echo -e "2. Verify that all features are working correctly"
echo -e "3. Check for any missing assets or styling issues"
echo -e "4. Deploy to Vercel using 'npm run build' and the Vercel CLI or GitHub Actions"

echo -e "${BLUE}For more information, see the documentation in docs/frontend-vercel-deployment-guide.md${NC}"
