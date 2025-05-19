#!/bin/bash
#
# MongoDB management script for ChasquiFX
#
# This script helps with common MongoDB tasks:
# - Checking and removing duplicate documents
# - Creating indexes
# - Testing connection
#

# Exit on error
set -e

# Change to the script directory
cd "$(dirname "$0")"

# Default MongoDB credentials
DEFAULT_USER="chasquifx_user"
DEFAULT_PASS="secure_password_here"
DEFAULT_HOST="chasquifx.ymxb5bs.mongodb.net"
DEFAULT_DB="chasquifx"

# Parse command line arguments
ACTION=""
DRY_RUN=false
SPECIFIC_COLLECTION=""

print_usage() {
    echo "MongoDB Management Script for ChasquiFX"
    echo ""
    echo "Usage: $0 [options] <action>"
    echo ""
    echo "Actions:"
    echo "  check-duplicates    - Find and optionally remove duplicate documents"
    echo "  create-indexes      - Create necessary indexes to prevent duplicates"
    echo "  test-connection     - Test MongoDB connection"
    echo ""
    echo "Options:"
    echo "  --dry-run           - For check-duplicates, don't remove duplicates"
    echo "  --collection=NAME   - For check-duplicates, process only the specified collection"
    echo "  --user=USERNAME     - MongoDB username (default: from .env or $DEFAULT_USER)"
    echo "  --password=PASSWORD - MongoDB password (default: from .env or $DEFAULT_PASS)"
    echo "  --host=HOST         - MongoDB host (default: from .env or $DEFAULT_HOST)"
    echo "  --db=DBNAME         - MongoDB database name (default: from .env or $DEFAULT_DB)"
    echo "  --help, -h          - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 check-duplicates --dry-run"
    echo "  $0 check-duplicates --collection=ForexCache"
    echo "  $0 create-indexes"
    echo "  $0 test-connection --user=myuser --password=mypass"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
    check-duplicates | create-indexes | test-connection)
        ACTION=$1
        shift
        ;;
    --dry-run)
        DRY_RUN=true
        shift
        ;;
    --collection=*)
        SPECIFIC_COLLECTION="${1#*=}" # Remove everything up to = and assign the rest
        shift
        ;;
    --user=*)
        MONGODB_USER="${1#*=}"
        shift
        ;;
    --password=*)
        MONGODB_PASSWORD="${1#*=}"
        shift
        ;;
    --host=*)
        MONGODB_HOST="${1#*=}"
        shift
        ;;
    --db=*)
        MONGODB_DBNAME="${1#*=}"
        shift
        ;;
    --help | -h)
        print_usage
        exit 0
        ;;
    *)
        echo "Unknown option: $1"
        print_usage
        exit 1
        ;;
    esac
done

# Check if action is specified
if [[ -z $ACTION ]]; then
    echo "Error: No action specified"
    print_usage
    exit 1
fi

# Function to load environment variables
load_env_vars() {
    # Try to load from .env file if it exists
    if [[ -f ../.env ]]; then
        echo "Loading environment variables from ../.env"
        export "$(grep -v '^#' ../.env | xargs)"
    fi

    # Set defaults if not already set
    MONGODB_USER=${MONGODB_USER:-$DEFAULT_USER}
    MONGODB_PASSWORD=${MONGODB_PASSWORD:-$DEFAULT_PASS}
    MONGODB_HOST=${MONGODB_HOST:-$DEFAULT_HOST}
    MONGODB_DBNAME=${MONGODB_DBNAME:-$DEFAULT_DB}

    # Export for child processes
    export MONGODB_USER
    export MONGODB_PASSWORD
    export MONGODB_HOST
    export MONGODB_DBNAME

    echo "Using MongoDB settings:"
    echo "  Host: $MONGODB_HOST"
    echo "  Database: $MONGODB_DBNAME"
    echo "  User: $MONGODB_USER"
    echo "  Password: [HIDDEN]"
}

# Load environment variables
load_env_vars

# Execute the requested action
case $ACTION in
check-duplicates)
    echo "Checking for duplicate documents..."
    CMD="node remove-duplicate-documents.js"

    if [[ $DRY_RUN == true ]]; then
        CMD="$CMD --dry-run"
    fi

    if [[ -n $SPECIFIC_COLLECTION ]]; then
        CMD="$CMD --collection=$SPECIFIC_COLLECTION"
    fi

    echo "Running: $CMD"
    $CMD
    ;;

create-indexes)
    echo "Creating MongoDB indexes..."
    node create-indexes.js
    ;;

test-connection)
    echo "Testing MongoDB connection..."
    node -e "
      const mongoose = require('mongoose');
      const { ServerApiVersion } = require('mongodb');
      
      const username = encodeURIComponent('$MONGODB_USER');
      const password = encodeURIComponent('$MONGODB_PASSWORD');
      const host = '$MONGODB_HOST';
      const dbName = '$MONGODB_DBNAME';
      
      const uri = \`mongodb+srv://\${username}:\${password}@\${host}/\${dbName}?retryWrites=true&w=majority&appName=ChasquiFX\`;
      
      console.log('Connecting to MongoDB...');
      
      mongoose.connect(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        }
      })
      .then(() => mongoose.connection.db.admin().command({ ping: 1 }))
      .then(() => {
        console.log('Connection successful! Database is responding.');
        return mongoose.connection.close();
      })
      .then(() => {
        console.log('Connection closed.');
        process.exit(0);
      })
      .catch(err => {
        console.error('Connection error:', err);
        process.exit(1);
      });
    "
    ;;

*)
    echo "Unknown action: $ACTION"
    print_usage
    exit 1
    ;;
esac
