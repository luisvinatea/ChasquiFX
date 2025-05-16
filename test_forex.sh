#!/bin/bash

# Test script for forex service
# Run from project root directory

# Set the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT" || exit

# Create or clear the test log file
TEST_LOG_FILE="logs/forex_tests.log"
mkdir -p logs
echo "Running forex service tests at $(date)" > "$TEST_LOG_FILE"

# Set up environment for testing
export PYTHONPATH="$PROJECT_ROOT:$PYTHONPATH"
export SERPAPI_API_KEY="test_key_for_mocking"

# Run the tests
echo "Running forex service tests..."
python -m unittest backend/api/tests/test_forex_service.py 2>&1 | tee -a "$TEST_LOG_FILE"

exit_code=${PIPESTATUS[0]}
if [ $exit_code -eq 0 ]; then
  echo -e "\e[32mTests passed successfully!\e[0m"
else
  echo -e "\e[31mTests failed with exit code $exit_code\e[0m"
fi

exit $exit_code
