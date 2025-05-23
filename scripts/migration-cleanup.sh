#!/bin/bash

# ChasquiFX Migration Cleanup Script
# This script helps clean up after the migration to a single Next.js deployment

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

print_message "ChasquiFX Migration Cleanup Script"
print_message "This script will help clean up after migrating to a single Next.js deployment"
echo ""

# Check if user wants to proceed
read -p "Are you sure you want to proceed with cleanup? (y/n): " cleanup_answer
if [[ $cleanup_answer != "y" ]]; then
    print_message "Aborting cleanup."
    exit 0
fi

# Function to remove Vercel project
remove_vercel_project() {
    project_name=$1

    print_message "Attempting to remove Vercel project: $project_name"
    echo ""

    read -p "Do you want to remove the Vercel project '$project_name'? (y/n): " remove_answer
    if [[ $remove_answer == "y" ]]; then
        # This command requires vercel CLI to be installed and logged in
        vercel project rm $project_name --yes

        if [ $? -eq 0 ]; then
            print_success "Successfully removed project: $project_name"
        else
            print_error "Failed to remove project: $project_name"
            print_message "You may need to remove it manually from the Vercel dashboard."
        fi
    else
        print_message "Skipping removal of project: $project_name"
    fi

    echo ""
}

# Backup important files from backend folder
print_message "Backing up important files from the backend folder..."
mkdir -p ./migration-backup/backend

# Backup important backend files
cp -r ./backend/api/src/controllers ./migration-backup/backend/
cp -r ./backend/api/src/db ./migration-backup/backend/
cp -r ./backend/api/src/models ./migration-backup/backend/
cp -r ./backend/api/src/routes ./migration-backup/backend/
cp -r ./backend/api/src/utils ./migration-backup/backend/
cp -r ./backend/api/docs ./migration-backup/backend/

print_success "Backend files backed up to ./migration-backup/backend"
echo ""

# Backup frontend files if needed
print_message "Backing up important files from the frontend folder..."
mkdir -p ./migration-backup/frontend

# Backup important frontend files
cp -r ./frontend/src/components ./migration-backup/frontend/
cp -r ./frontend/src/services ./migration-backup/frontend/
cp -r ./frontend/src/hooks ./migration-backup/frontend/
cp -r ./frontend/public ./migration-backup/frontend/

print_success "Frontend files backed up to ./migration-backup/frontend"
echo ""

# Remove old Vercel deployments
print_message "Cleaning up old Vercel deployments..."
echo ""

# Remove backend API project
remove_vercel_project "chasquifx-api"

# Remove frontend project
remove_vercel_project "chasquifx-web"

# Remove temporary files
print_message "Removing temporary migration files..."
rm -f ./src/services/chasquiApiNext.js

print_success "Migration cleanup completed!"
print_message "The following steps were completed:"
echo "1. Backed up important files from the backend and frontend"
echo "2. Attempted to clean up old Vercel deployments"
echo "3. Removed temporary migration files"
echo ""
print_message "You can now safely delete the following directories if you no longer need them:"
echo "- ./backend"
echo "- ./frontend"
echo ""
print_message "Remember to update your documentation to reflect the new project structure."
