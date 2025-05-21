#!/bin/bash

# Script to migrate ChasquiFX frontend from CRA to Vite
# This script will create a new Vite-based project and migrate the existing code

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}ChasquiFX Frontend Migration to Vite${NC}"
echo -e "${BLUE}=====================================${NC}"

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo -e "${RED}Error: frontend directory not found${NC}"
    exit 1
fi

# Create a backup of the current frontend
echo -e "${YELLOW}Creating backup of current frontend...${NC}"
cp -r frontend frontend-backup-$(date +"%Y%m%d%H%M%S")
echo -e "${GREEN}✓ Backup created${NC}"

# Create a temporary directory for the new Vite project
TEMP_DIR="vite-tmp"
mkdir -p $TEMP_DIR

# Navigate to the temporary directory
cd $TEMP_DIR

# Create a new Vite project with React template
echo -e "${YELLOW}Creating new Vite project with React template...${NC}"
npm create vite@latest chasquifx-vite -- --template react

# Check if project was created successfully
if [ ! -d "chasquifx-vite" ]; then
    echo -e "${RED}Error: Failed to create Vite project${NC}"
    cd ..
    rm -rf $TEMP_DIR
    exit 1
fi

# Navigate to the new project
cd chasquifx-vite

# Install dependencies that were in the original project
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install @emotion/react @emotion/styled @mui/icons-material @mui/material @mui/x-date-pickers \
    axios dayjs react-router-dom uuid web-vitals @testing-library/jest-dom @testing-library/react @testing-library/user-event

# Add ESLint and setup React configuration
echo -e "${YELLOW}Setting up ESLint...${NC}"
npm install -D eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh

# Create a new .eslintrc.cjs file with React configuration
cat >.eslintrc.cjs <<'EOL'
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '19.1' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
EOL

# Update the package.json with the correct name and additional scripts
echo -e "${YELLOW}Updating package.json...${NC}"
sed -i 's/"name": "chasquifx-vite"/"name": "chasquifx-frontend"/' package.json
sed -i 's/"private": true,/"private": true,\n  "homepage": ".\/",/' package.json

# Move back to root directory
cd ../..

# Create directories for migrating components
mkdir -p $TEMP_DIR/chasquifx-vite/src/components
mkdir -p $TEMP_DIR/chasquifx-vite/src/services

# Copy over existing components and services
echo -e "${YELLOW}Copying existing components and services...${NC}"
cp -r frontend/src/components/* $TEMP_DIR/chasquifx-vite/src/components/
cp -r frontend/src/services/* $TEMP_DIR/chasquifx-vite/src/services/

# Copy CSS files
cp frontend/src/App.css $TEMP_DIR/chasquifx-vite/src/
cp frontend/src/index.css $TEMP_DIR/chasquifx-vite/src/

# Create a Vite-compatible index.html
echo -e "${YELLOW}Creating Vite-compatible index.html...${NC}"
cat >$TEMP_DIR/chasquifx-vite/index.html <<'EOL'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ChasquiFX - The Smart Forex Travel Companion</title>
    <meta name="description" content="Find destinations with favorable exchange rates for your travel budget" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOL

# Create a Vite-compatible main.jsx file (equivalent to index.js in CRA)
echo -e "${YELLOW}Creating Vite-compatible main.jsx...${NC}"
cat >$TEMP_DIR/chasquifx-vite/src/main.jsx <<'EOL'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
EOL

# Create a modified App.jsx file compatible with Vite
echo -e "${YELLOW}Creating Vite-compatible App.jsx...${NC}"
cp frontend/src/App.js $TEMP_DIR/chasquifx-vite/src/App.jsx

# Create a Vite-compatible Vercel configuration
echo -e "${YELLOW}Creating Vite-compatible Vercel configuration...${NC}"
cp frontend/vercel.json $TEMP_DIR/chasquifx-vite/

# Now handle the replacement of the frontend directory
echo -e "${YELLOW}Replacing old frontend with new Vite-based frontend...${NC}"
mv frontend frontend-old
mv $TEMP_DIR/chasquifx-vite frontend

# Clean up temporary directory
rm -rf $TEMP_DIR

# Install dependencies in the new frontend directory
cd frontend
echo -e "${YELLOW}Installing dependencies in the new frontend...${NC}"
npm install

# Create a migration-notes.md file
echo -e "${YELLOW}Creating migration notes...${NC}"
cat >migration-notes.md <<'EOL'
# ChasquiFX Frontend Migration to Vite

## Migration Notes

This frontend has been migrated from Create React App (CRA) to Vite for the following benefits:

- Faster development server startup
- Improved hot module replacement (HMR)
- Better build performance
- Smaller bundle sizes
- Modern ES modules approach
- Less configuration overhead

## Key Changes

1. Project structure updates:
   - `index.js` → `main.jsx`
   - `.js` extensions → `.jsx` for React components
   - `public` folder → `public` folder (but handled differently)

2. Environment variables:
   - CRA: `REACT_APP_*` → Vite: `VITE_*`
   - Update all environment variable references

3. Imports:
   - SVG imports now use `?react` suffix for direct component usage
   - Static assets are imported differently

4. Build output:
   - Output is in `dist` folder instead of `build`
   - Different structure for static assets

## Deployment

- The Vercel configuration has been updated to work with Vite
- The build command is now `npm run build` which runs Vite's build process
- The output directory is now `dist` instead of `build`

## Local Development

1. Start the development server:
   ```
   npm run dev
   ```

2. Build for production:
   ```
   npm run build
   ```

3. Preview the production build:
   ```
   npm run preview
   ```
EOL

echo -e "${GREEN}✓ Migration complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Review the migrated code and address any issues"
echo -e "2. Update environment variables from REACT_APP_* to VITE_*"
echo -e "3. Test the application locally with 'npm run dev'"
echo -e "4. Test the build process with 'npm run build'"
echo -e "5. Deploy to Vercel"
echo -e "${BLUE}See migration-notes.md for more details${NC}"

cd ..
