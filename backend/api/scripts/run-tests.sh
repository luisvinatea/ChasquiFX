#!/bin/bash

# Test Suite for MongoDB Integration
# This script runs all tests for the MongoDB integration

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Set the directory to the script location
cd "$(dirname "$0")"

# Function to run a test and print result
run_test() {
    local test_name=$1
    local command=$2

    echo -e "${YELLOW}Running test: ${test_name}${NC}"
    echo "Command: $command"
    echo "----------------------------------------"

    eval "$command"
    local status=$?

    echo "----------------------------------------"
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}✓ Test passed: ${test_name}${NC}"
        return 0
    else
        echo -e "${RED}✗ Test failed: ${test_name}${NC}"
        return 1
    fi
}

# Test MongoDB connection
test_mongodb_connection() {
    run_test "MongoDB Connection" "node ../tests/test-mongodb.js"
    return $?
}

# Test File Standardization Service
test_file_standardization() {
    run_test "File Standardization Service" "node ../tests/test-file-standardization.js"
    return $?
}

# Test importing sample data
test_sample_data_import() {
    run_test "Sample Data Import" "node ../scripts/import-sample-data.js --file ../assets/data/forex/AUD-EUR_2025-05-17-02-33-39.json --dry-run"
    return $?
}

# Test generating cache dashboard
test_cache_dashboard() {
    run_test "Cache Dashboard Generation" "node ../scripts/generate-cache-dashboard.js --output /tmp/cache-dashboard-test.json"
    return $?
}

# Main test runner
main() {
    echo "==== ChasquiFX MongoDB Integration Test Suite ===="
    echo "Starting tests at $(date)"
    echo

    local total_tests=4
    local passed_tests=0

    # Run MongoDB connection test
    if test_mongodb_connection; then
        passed_tests=$((passed_tests + 1))
    fi

    echo

    # Run File Standardization Service test
    if test_file_standardization; then
        passed_tests=$((passed_tests + 1))
    fi

    echo

    # Run Sample Data Import test
    if test_sample_data_import; then
        passed_tests=$((passed_tests + 1))
    fi

    echo

    # Run Cache Dashboard Generation test
    if test_cache_dashboard; then
        passed_tests=$((passed_tests + 1))
    fi

    echo
    echo "==== Test Results ===="
    echo -e "Tests passed: ${GREEN}${passed_tests}/${total_tests}${NC}"

    if [ $passed_tests -eq $total_tests ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed.${NC}"
        return 1
    fi
}

# Run all tests
main
exit $?
