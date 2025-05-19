#!/bin/bash

# Full MongoDB Migration Process
# This script demonstrates the complete migration process from files to MongoDB
# Usage: ./full-migration-process.sh

# Set colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Log function with timestamps
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Step function to run a command and check status
step() {
    local step_name=$1
    local command=$2

    log "Step: $step_name"
    log "Running: $command"
    echo "----------------------------------------"

    eval "$command"
    local status=$?

    echo "----------------------------------------"
    if [ $status -eq 0 ]; then
        success "Step completed successfully: $step_name"
        return 0
    else
        error "Step failed: $step_name (status code: $status)"
        return $status
    fi
}

# Check if MongoDB is available
check_mongodb() {
    log "Checking MongoDB connection..."

    # Create a simple MongoDB check script and execute it
    cat >/tmp/mongodb-check.js <<EOF
const { connectToDatabase } = require('../src/db/mongodb');
connectToDatabase()
  .then(() => {
    console.log('MongoDB connection successful');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
EOF

    node /tmp/mongodb-check.js
    local status=$?

    if [ $status -eq 0 ]; then
        success "MongoDB connection successful"
        return 0
    else
        error "MongoDB connection failed"
        return 1
    fi
}

# Main migration process
main() {
    log "Starting full MongoDB migration process"

    # Check MongoDB connection
    check_mongodb || {
        error "Cannot proceed without MongoDB connection"
        exit 1
    }

    # Step 1: Run tests to make sure everything is working
    step "Running tests" "./run-tests.sh" || {
        warning "Some tests failed. Do you want to continue anyway? (y/n)"
        read -r continue_choice
        if [[ ! "$continue_choice" =~ ^[Yy]$ ]]; then
            error "Migration aborted"
            exit 1
        fi
    }

    # Step 2: Initialize MongoDB database
    step "Initializing MongoDB database" "node init-db.js" || {
        error "Database initialization failed"
        exit 1
    }

    # Step 3: Run a dry run migration first
    step "Running dry run migration" "./run-migration.sh --dry-run" || {
        warning "Dry run migration had issues. Do you want to continue with the actual migration? (y/n)"
        read -r continue_choice
        if [[ ! "$continue_choice" =~ ^[Yy]$ ]]; then
            error "Migration aborted"
            exit 1
        fi
    }

    # Step 4: Confirm actual migration
    warning "About to perform the actual data migration to MongoDB."
    warning "This will move all your data from files to MongoDB. Are you sure? (y/n)"
    read -r confirm_migration
    if [[ ! "$confirm_migration" =~ ^[Yy]$ ]]; then
        warning "Migration aborted by user"
        exit 0
    fi

    # Step 5: Perform the actual migration
    step "Performing data migration" "./run-migration.sh" || {
        error "Data migration failed"
        exit 1
    }

    # Step 6: Generate a dashboard to verify the migration
    step "Generating cache dashboard" "node generate-cache-dashboard.js --html --output ../cache-dashboard.html" || {
        warning "Dashboard generation failed, but migration might be successful"
    }

    success "MongoDB migration process completed successfully!"
    success "You can view the cache dashboard at: ../cache-dashboard.html"

    warning "Note: The original JSON files have been preserved. Once you've verified"
    warning "that the MongoDB migration is working correctly, you may want to archive"
    warning "or remove the original files to save disk space."

    exit 0
}

# Run the migration process
main
