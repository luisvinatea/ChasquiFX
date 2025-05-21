#!/bin/bash

# Script to verify the Vite setup for ChasquiFX frontend
# This checks various aspects of the Vite migration to ensure everything is working

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}ChasquiFX Vite Setup Verification${NC}"
echo -e "${BLUE}=================================================${NC}"

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo -e "${RED}Error: frontend directory not found${NC}"
    exit 1
fi

cd frontend

# Check for essential Vite files
echo -e "${YELLOW}Checking for essential Vite files...${NC}"

FILES_TO_CHECK=(
    "vite.config.js"
    "index.html"
    "src/main.jsx"
)

MISSING_FILES=0
for file in "${FILES_TO_CHECK[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Missing file: $file${NC}"
        MISSING_FILES=$((MISSING_FILES + 1))
    else
        echo -e "${GREEN}✓ Found: $file${NC}"
    fi
done

if [ $MISSING_FILES -gt 0 ]; then
    echo -e "${RED}Error: Essential Vite files are missing${NC}"
    exit 1
fi

# Check package.json for Vite dependencies
echo -e "\n${YELLOW}Checking for Vite dependencies in package.json...${NC}"
if grep -q '"vite"' package.json && grep -q '"@vitejs/plugin-react"' package.json; then
    echo -e "${GREEN}✓ Vite dependencies found in package.json${NC}"
else
    echo -e "${RED}❌ Vite dependencies missing in package.json${NC}"
    exit 1
fi

# Check package.json scripts
echo -e "\n${YELLOW}Checking for Vite scripts in package.json...${NC}"
if grep -q '"dev": *"vite"' package.json && grep -q '"build": *"vite build"' package.json; then
    echo -e "${GREEN}✓ Vite scripts found in package.json${NC}"
else
    echo -e "${RED}❌ Vite scripts missing in package.json${NC}"
    exit 1
fi

# Check if any files still use REACT_APP_ environment variables
echo -e "\n${YELLOW}Checking for REACT_APP_ environment variables...${NC}"
if grep -r "process.env.REACT_APP_" --include="*.js" --include="*.jsx" src/; then
    echo -e "${RED}❌ Found references to process.env.REACT_APP_ that need to be updated${NC}"
    exit 1
else
    echo -e "${GREEN}✓ No references to process.env.REACT_APP_ found${NC}"
fi

# Check if at least some files use VITE_ environment variables
echo -e "\n${YELLOW}Checking for VITE_ environment variables...${NC}"
if grep -r "import.meta.env.VITE_" --include="*.js" --include="*.jsx" src/; then
    echo -e "${GREEN}✓ Found references to import.meta.env.VITE_${NC}"
else
    echo -e "${YELLOW}⚠️ No references to import.meta.env.VITE_ found. This might be OK if your app doesn't use environment variables.${NC}"
fi

# Verify JSX files
echo -e "\n${YELLOW}Checking for React components with .jsx extension...${NC}"
JSX_COUNT=$(find src -name "*.jsx" | wc -l)
if [ $JSX_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓ Found $JSX_COUNT component(s) with .jsx extension${NC}"
else
    echo -e "${RED}❌ No .jsx files found in src directory${NC}"
    exit 1
fi

# Check vercel.json
echo -e "\n${YELLOW}Checking vercel.json configuration...${NC}"
if [ -f "vercel.json" ]; then
    if grep -q '"framework": *"vite"' vercel.json && grep -q '"outputDirectory": *"dist"' vercel.json; then
        echo -e "${GREEN}✓ Vercel configuration is set up for Vite${NC}"
    else
        echo -e "${YELLOW}⚠️ Vercel configuration may need updates for Vite${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ No vercel.json found${NC}"
fi

# Try a test build
echo -e "\n${YELLOW}Attempting a test build...${NC}"
if npm run build; then
    echo -e "${GREEN}✓ Build completed successfully${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Check if dist directory was created
if [ -d "dist" ]; then
    echo -e "${GREEN}✓ dist directory was created${NC}"
    if [ -f "dist/index.html" ]; then
        echo -e "${GREEN}✓ dist/index.html exists${NC}"
    else
        echo -e "${RED}❌ dist/index.html is missing${NC}"
    fi
else
    echo -e "${RED}❌ dist directory was not created${NC}"
    exit 1
fi

echo -e "\n${GREEN}=================================================${NC}"
echo -e "${GREEN}✓ Vite setup verification completed successfully!${NC}"
echo -e "${GREEN}=================================================${NC}"

echo -e "\n${BLUE}Next steps:${NC}"
echo -e "1. Run 'npm run dev' to start the development server"
echo -e "2. Deploy to Vercel with 'vercel --prod'"
echo -e "3. Update any documentation to reflect the Vite migration"
echo -e "\n${BLUE}For more information, see the documentation in docs/vite-migration-summary.md${NC}"

cd ..
