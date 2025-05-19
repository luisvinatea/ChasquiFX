#!/bin/bash
#
# Verify MongoDB database configuration and check for duplicates
#
# This script helps ensure MongoDB is properly optimized to prevent duplicates
# and generates a report of the current state of the database.
#

# Exit on error
set -e

# Change to the script directory
cd "$(dirname "$0")"

# Check if --report flag should be passed
if [ "$1" == "--report" ] || [ "$1" == "-r" ]; then
  echo "Running verification with report generation..."
  node verify-mongodb.js --report
elif [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
  echo "MongoDB Verification Tool"
  echo ""
  echo "Usage:"
  echo "  ./verify-mongodb.sh           - Verify MongoDB indexes and check for duplicates"
  echo "  ./verify-mongodb.sh --report  - Generate a detailed report about database state"
  echo ""
  echo "Options:"
  echo "  --report, -r   - Generate a detailed report in the logs/reports directory"
  echo "  --help, -h     - Show this help message"
else
  echo "Running MongoDB verification..."
  node verify-mongodb.js
fi
