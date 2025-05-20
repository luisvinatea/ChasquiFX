#!/bin/bash

# Script to commit and push all changes to the GitHub repository

# Define color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to the project root directory
cd "$(dirname "$0")" || exit
cd "$REPO_ROOT" || exit

echo -e "${BLUE}🔍 Checking git status...${NC}"
git status

echo -e "${BLUE}📝 Adding changes to git...${NC}"
git add .

echo -e "${BLUE}💬 Enter commit message:${NC}"
read -r COMMIT_MESSAGE

if [ -z "$COMMIT_MESSAGE" ]; then
    COMMIT_MESSAGE="Fix file naming conflicts and update Vercel deployment configuration"
fi

echo -e "${BLUE}📦 Committing changes with message: ${YELLOW}$COMMIT_MESSAGE${NC}"
git commit -m "$COMMIT_MESSAGE"

echo -e "${BLUE}🚀 Pushing changes to GitHub...${NC}"
git push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Changes successfully pushed to GitHub!${NC}"
else
    echo -e "${RED}❌ Failed to push changes to GitHub. Please check your git configuration and try again.${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "1. ${YELLOW}Deploy the backend API:${NC} ./deploy-api.sh"
echo -e "2. ${YELLOW}Verify the deployment:${NC} Visit https://chasquifx-api.vercel.app/health"
echo -e "3. ${YELLOW}Test the frontend:${NC} Visit https://chasquifx-web.vercel.app"

exit 0
